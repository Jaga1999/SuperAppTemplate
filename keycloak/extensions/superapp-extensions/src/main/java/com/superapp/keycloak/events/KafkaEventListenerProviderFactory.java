package com.superapp.keycloak.events;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

import org.apache.kafka.clients.admin.Admin;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.Producer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.KafkaException;
import org.apache.kafka.common.config.TopicConfig;
import org.apache.kafka.common.errors.TopicExistsException;
import org.apache.kafka.common.serialization.StringSerializer;
import org.jboss.logging.Logger;
import org.keycloak.Config;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventListenerProviderFactory;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

/**
 * Registers the {@code superapp-kafka} event listener.
 *
 * <p>Configuration (SPI option first, then environment variable):
 * <ul>
 *   <li>{@code bootstrapServers} / {@code KAFKA_BOOTSTRAP_SERVERS}</li>
 *   <li>{@code topic} / {@code KAFKA_EVENTS_TOPIC} (default {@code keycloak.events})</li>
 *   <li>{@code partitions} / {@code KAFKA_EVENTS_PARTITIONS} (default 3) and
 *       {@code replicationFactor} / {@code KAFKA_EVENTS_REPLICATION_FACTOR} (default 1), used when creating the topic</li>
 * </ul>
 *
 * <p>One thread-safe producer is shared by all sessions. Sends are asynchronous and never block a login for longer
 * than {@code max.block.ms}; a Kafka outage degrades to logged errors, never to failed authentication.
 */
public final class KafkaEventListenerProviderFactory implements EventListenerProviderFactory {

    public static final String PROVIDER_ID = "superapp-kafka";

    private static final Logger LOG = Logger.getLogger(KafkaEventListenerProviderFactory.class);
    private static final Duration TOPIC_SETUP_TIMEOUT = Duration.ofSeconds(15);

    private String bootstrapServers;
    private String topic;
    private int partitions;
    private short replicas;
    private volatile Producer<String, String> producer;

    @Override
    public EventListenerProvider create(KeycloakSession session) {
        return new KafkaEventListenerProvider(session, producer(), topic);
    }

    @Override
    public void init(Config.Scope config) {
        bootstrapServers = setting(config, "bootstrapServers", "KAFKA_BOOTSTRAP_SERVERS", "kafka:9092");
        topic = setting(config, "topic", "KAFKA_EVENTS_TOPIC", "keycloak.events");
        partitions = Integer.parseInt(setting(config, "partitions", "KAFKA_EVENTS_PARTITIONS", "3"));
        replicas = Short.parseShort(setting(config, "replicationFactor", "KAFKA_EVENTS_REPLICATION_FACTOR", "1"));
        LOG.infof("superapp-kafka event listener → %s (topic %s)", bootstrapServers, topic);
    }

    /**
     * The producer owns its topic: it is created here, before any consumer subscribes, so consumers never see an
     * unknown topic and the broker can keep auto-creation off. Best effort: if Kafka is down, Keycloak still boots
     * (events fail to send, logins never do) and the next start creates the topic. The producer itself is created
     * lazily on the first event.
     */
    @Override
    public void postInit(KeycloakSessionFactory factory) {
        var props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(AdminClientConfig.CLIENT_ID_CONFIG, "keycloak-event-listener-admin");
        props.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, (int) TOPIC_SETUP_TIMEOUT.toMillis());
        props.put(AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, (int) TOPIC_SETUP_TIMEOUT.toMillis());
        try (var admin = withProviderClassLoader(() -> Admin.create(props))) {
            var newTopic = new NewTopic(topic, partitions, replicas)
                    .configs(Map.of(TopicConfig.RETENTION_MS_CONFIG, String.valueOf(Duration.ofDays(7).toMillis())));
            admin.createTopics(List.of(newTopic)).all().get(TOPIC_SETUP_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
            LOG.infof("Created Kafka topic %s (%d partitions, replication %d)", topic, partitions, replicas);
        } catch (ExecutionException e) {
            if (e.getCause() instanceof TopicExistsException) {
                LOG.debugf("Kafka topic %s already exists", topic);
            } else {
                LOG.warnf(e.getCause(), "Could not create Kafka topic %s; events will fail to send until it exists", topic);
            }
        } catch (TimeoutException e) {
            LOG.warnf("Timed out creating Kafka topic %s; is Kafka reachable at %s?", topic, bootstrapServers);
        } catch (KafkaException e) {
            // Never let Kafka (config or connectivity) stop Keycloak from starting.
            LOG.warnf(e, "Could not set up Kafka topic %s", topic);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @Override
    public void close() {
        var current = producer;
        if (current != null) {
            current.close();
        }
    }

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    private Producer<String, String> producer() {
        var current = producer;
        if (current == null) {
            synchronized (this) {
                current = producer;
                if (current == null) {
                    current = createProducer();
                    producer = current;
                }
            }
        }
        return current;
    }

    private Producer<String, String> createProducer() {
        var props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.CLIENT_ID_CONFIG, "keycloak-event-listener");
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 5);
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");
        props.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, 2_000);
        props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 30_000);
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 10_000);

        return withProviderClassLoader(() -> new KafkaProducer<>(props, new StringSerializer(), new StringSerializer()));
    }

    /** Kafka resolves plugins through the context class loader; Keycloak's provider class loader must win. */
    private static <T> T withProviderClassLoader(Supplier<T> action) {
        var thread = Thread.currentThread();
        var previous = thread.getContextClassLoader();
        thread.setContextClassLoader(KafkaEventListenerProviderFactory.class.getClassLoader());
        try {
            return action.get();
        } finally {
            thread.setContextClassLoader(previous);
        }
    }

    private static String setting(Config.Scope config, String key, String env, String fallback) {
        var fromSpi = config.get(key);
        if (fromSpi != null && !fromSpi.isBlank()) {
            return fromSpi;
        }
        var fromEnv = System.getenv(env);
        return fromEnv != null && !fromEnv.isBlank() ? fromEnv : fallback;
    }
}
