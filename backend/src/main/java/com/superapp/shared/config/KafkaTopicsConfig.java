package com.superapp.shared.config;

import java.time.Duration;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.config.TopicConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaAdmin;

/**
 * Declares every topic the app uses, plus its dead-letter topic. Spring's {@link KafkaAdmin} creates missing topics
 * at startup and leaves existing ones alone, so no separate init container is needed. The broker has
 * {@code auto.create.topics.enable=false}: a typo in a topic name fails loudly instead of creating a stray topic.
 *
 * <p>Production: set {@code superapp.kafka.replicas=3}; if topics are provisioned by infrastructure-as-code, set {@code spring.kafka.admin.auto-create=false}.
 */
@Configuration(proxyBeanMethods = false)
class KafkaTopicsConfig {

    private static final String RETENTION = String.valueOf(Duration.ofDays(7).toMillis());

    @Bean
    KafkaAdmin.NewTopics superappTopics(
            @Value("${superapp.kafka.topics.keycloak-events}") String keycloakEvents,
            @Value("${superapp.kafka.topics.todo-events}") String todoEvents,
            @Value("${superapp.kafka.replicas:1}") int replicas) {
        return new KafkaAdmin.NewTopics(
                topic(keycloakEvents, 3, replicas), dlt(keycloakEvents, replicas),
                topic(todoEvents, 3, replicas), dlt(todoEvents, replicas));
    }

    private static NewTopic topic(String name, int partitions, int replicas) {
        return TopicBuilder.name(name).partitions(partitions).replicas(replicas)
                .config(TopicConfig.RETENTION_MS_CONFIG, RETENTION).build();
    }

    /** Dead letters: one partition (order across failures doesn't matter), same retention for investigation. */
    private static NewTopic dlt(String name, int replicas) {
        return topic(name + ".DLT", 1, replicas);
    }
}
