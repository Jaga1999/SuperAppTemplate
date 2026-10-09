package com.superapp.identity.internal;

import org.apache.kafka.common.TopicPartition;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaOperations;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.ExponentialBackOffWithMaxRetries;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.web.client.OAuth2ClientHttpRequestInterceptor;
import org.springframework.web.client.support.RestClientHttpServiceGroupConfigurer;
import org.springframework.web.service.registry.ImportHttpServices;

import com.superapp.auth.BffProperties;

import tools.jackson.core.JacksonException;

/**
 * Wires the Keycloak Admin API client (HTTP service group {@code keycloak-admin}) and the Kafka error handling
 * used by every listener: 4 retries with exponential back-off, then the record goes to {@code <topic>.DLT}.
 * Unparseable (Jackson) messages skip the retries.
 */
@Configuration(proxyBeanMethods = false)
@ImportHttpServices(group = IdentityConfig.ADMIN_GROUP, types = KeycloakAdminApi.class)
class IdentityConfig {

    static final String ADMIN_GROUP = "keycloak-admin";

    @Bean
    RestClientHttpServiceGroupConfigurer keycloakAdminClientGroup(BffProperties properties,
            @Qualifier("keycloakAdminClientManager") OAuth2AuthorizedClientManager adminClients) {
        var oauth = new OAuth2ClientHttpRequestInterceptor(adminClients);
        oauth.setClientRegistrationIdResolver(_ -> "keycloak-admin");
        // One cached service-account token for the whole app, regardless of which user triggered the call.
        var serviceAccount = UsernamePasswordAuthenticationToken.unauthenticated("superapp-bff-service-account", null);
        oauth.setPrincipalResolver(_ -> serviceAccount);
        return groups -> groups.filterByName(ADMIN_GROUP).forEachClient((_, builder) -> builder
                .baseUrl(properties.internalAdminUrl())
                .requestInterceptor(oauth));
    }

    @Bean
    DefaultErrorHandler kafkaErrorHandler(KafkaOperations<String, String> kafka) {
        var recoverer = new DeadLetterPublishingRecoverer(kafka,
                (record, _) -> new TopicPartition(record.topic() + ".DLT", -1));
        var backOff = new ExponentialBackOffWithMaxRetries(4);
        backOff.setInitialInterval(500);
        backOff.setMultiplier(2.0);
        backOff.setMaxInterval(5_000);
        var handler = new DefaultErrorHandler(recoverer, backOff);
        handler.addNotRetryableExceptions(JacksonException.class); // poison message: retrying cannot help
        return handler;
    }
}
