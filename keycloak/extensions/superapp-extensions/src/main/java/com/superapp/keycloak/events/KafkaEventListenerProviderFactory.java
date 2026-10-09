package com.superapp.keycloak.events;

import java.util.Properties;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.Producer;
import org.apache.kafka.clients.producer.ProducerConfig;
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
 * </ul>
 *
 * <p>One thread-safe producer is shared by all sessions. Sends are asynchronous and never block a login for longer
 * than {@code max.block.ms}; a Kafka outage degrades to logged errors, never to failed authentication.
 */
public final class KafkaEventListenerProviderFactory implements EventListenerProviderFactory {

    public static final String PROVIDER_ID = "superapp-kafka";

    private static final Logger LOG = Logger.getLogger(KafkaEventListenerProviderFactory.class);

    private String bootstrapServers;
    private String topic;
    private volatile Producer<String, String> producer;

    @Override
    public EventListenerProvider create(KeycloakSession session) {
        return new KafkaEventListenerProvider(session, producer(), topic);
    }

    @Override
    public void init(Config.Scope config) {
        bootstrapServers = setting(config, "bootstrapServers", "KAFKA_BOOTSTRAP_SERVERS", "kafka:9092");
        topic = setting(config, "topic", "KAFKA_EVENTS_TOPIC", "keycloak.events");
        LOG.infof("superapp-kafka event listener → %s (topic %s)", bootstrapServers, topic);
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
        // Producer is created lazily on the first event so Keycloak can boot even if Kafka is still starting.
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
        props.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, 2_000);
        props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 30_000);
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 10_000);

        // Kafka resolves plugins through the context class loader; Keycloak's provider class loader must win.
        var thread = Thread.currentThread();
        var previous = thread.getContextClassLoader();
        thread.setContextClassLoader(KafkaEventListenerProviderFactory.class.getClassLoader());
        try {
            return new KafkaProducer<>(props, new StringSerializer(), new StringSerializer());
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
