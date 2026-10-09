package com.superapp.identity.internal;

import java.util.HashMap;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.kafka.autoconfigure.ConcurrentKafkaListenerContainerFactoryConfigurer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;

/**
 * Keycloak publishes its events to its <b>own</b> Kafka cluster ({@code superapp.identity.events.bootstrap-servers});
 * the app's cluster ({@code spring.kafka.*}) carries only the app's topics. This factory reads from Keycloak's
 * cluster with the app's consumer and listener settings. The BFF never writes there: records that fail
 * {@link KeycloakEventsListener} go to {@code keycloak.events.DLT} on the app's cluster.
 */
@Configuration(proxyBeanMethods = false)
class KeycloakEventsKafkaConfig {

    static final String CONTAINER_FACTORY = "keycloakEventsListenerContainerFactory";

    @Bean(CONTAINER_FACTORY)
    ConcurrentKafkaListenerContainerFactory<Object, Object> keycloakEventsListenerContainerFactory(
            ConcurrentKafkaListenerContainerFactoryConfigurer configurer, KafkaProperties kafka,
            @Value("${superapp.identity.events.bootstrap-servers}") String bootstrapServers) {
        var consumer = new HashMap<>(kafka.buildConsumerProperties());
        consumer.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        var factory = new ConcurrentKafkaListenerContainerFactory<Object, Object>();
        configurer.configure(factory, new DefaultKafkaConsumerFactory<>(consumer));
        return factory;
    }
}
