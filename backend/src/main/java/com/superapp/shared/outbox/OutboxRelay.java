package com.superapp.shared.outbox;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Ships committed outbox rows to Kafka.
 *
 * <p>{@code FOR UPDATE SKIP LOCKED} lets any number of BFF instances relay concurrently without
 * double-sending. Delivery is at-least-once; consumers are idempotent (they de-duplicate on {@code eventId}).
 * Rows are processed in creation order and a failure stops the batch, preserving per-key ordering.
 */
@Component
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);
    private static final int BATCH_SIZE = 100;
    private static final Duration SEND_TIMEOUT = Duration.ofSeconds(10);
    private static final Duration RETENTION = Duration.ofDays(7);

    private final JdbcClient jdbc;
    private final KafkaTemplate<String, String> kafka;
    private final TransactionTemplate tx;

    public OutboxRelay(JdbcClient jdbc, KafkaTemplate<String, String> kafka, TransactionTemplate tx) {
        this.jdbc = jdbc;
        this.kafka = kafka;
        this.tx = tx;
    }

    private record Row(UUID id, String topic, String messageKey, String eventType, String payload) {
    }

    @Scheduled(fixedDelayString = "${superapp.outbox.poll-interval:PT0.5S}")
    public void relay() {
        Integer sent;
        do {
            sent = tx.execute(_ -> relayBatch());
        } while (sent != null && sent == BATCH_SIZE);
    }

    private int relayBatch() {
        var rows = jdbc.sql("""
                select id, topic, message_key, event_type, payload::text as payload
                from outbox_event
                where published_at is null
                order by created_at
                limit :limit
                for update skip locked
                """)
                .param("limit", BATCH_SIZE)
                .query(Row.class)
                .list();

        var sent = 0;
        for (var row : rows) {
            try {
                var record = new ProducerRecord<>(row.topic(), row.messageKey(), row.payload());
                record.headers().add("event-type", row.eventType().getBytes(StandardCharsets.UTF_8));
                kafka.send(record).get(SEND_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
                jdbc.sql("update outbox_event set published_at = :now, attempts = attempts + 1 where id = :id")
                        .param("now", Timestamp.from(Instant.now()))
                        .param("id", row.id())
                        .update();
                sent++;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return sent;
            } catch (ExecutionException | TimeoutException | RuntimeException e) {
                log.warn("Outbox relay failed for {} ({}); will retry", row.id(), row.eventType(), e);
                jdbc.sql("update outbox_event set attempts = attempts + 1, last_error = :error where id = :id")
                        .param("error", String.valueOf(e.getMessage()))
                        .param("id", row.id())
                        .update();
                return sent;
            }
        }
        return sent;
    }

    @Scheduled(cron = "${superapp.outbox.cleanup-cron:0 17 3 * * *}")
    public void purgePublished() {
        var deleted = jdbc.sql("delete from outbox_event where published_at < :cutoff")
                .param("cutoff", Timestamp.from(Instant.now().minus(RETENTION)))
                .update();
        if (deleted > 0) {
            log.info("Purged {} published outbox events", deleted);
        }
    }
}
