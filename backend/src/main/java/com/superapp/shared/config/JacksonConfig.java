package com.superapp.shared.config;

import org.springframework.boot.jackson.autoconfigure.JsonFactoryBuilderCustomizer;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tools.jackson.core.StreamReadConstraints;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;

/**
 * The one JSON policy for the whole app. HTTP bodies, problem details, Kafka payloads, Redis values and encrypted
 * cookies all go through the Boot-managed Jackson 3 {@code JsonMapper}; never build a private mapper.
 *
 * <p>Rules for DTOs (records):
 * <ul>
 *   <li>Optional input fields use wrapper types ({@code Boolean}, {@code Long}, ...) with {@code @Nullable}.
 *       A primitive means "required": a missing or null value is rejected, never silently read as 0/false.</li>
 *   <li>Required reference fields on inbound contracts are marked {@code @JsonProperty(required = true)}
 *       (HTTP request bodies use Bean Validation instead, which yields field-level problem details).</li>
 *   <li>Unknown properties are ignored (tolerant reader), so Keycloak and Kafka producers can add fields freely.</li>
 * </ul>
 */
@Configuration(proxyBeanMethods = false)
class JacksonConfig {

    @Bean
    JsonMapperBuilderCustomizer superappJsonPolicy() {
        return builder -> builder
                // Jackson 3 defaults, pinned so a library upgrade cannot silently change them.
                .enable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
                .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                // Duplicate keys are a parser-differential attack vector ({"role":"user","role":"admin"}).
                .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION);
    }

    /** Hard limits for untrusted input; far above anything this API legitimately receives. */
    @Bean
    JsonFactoryBuilderCustomizer superappJsonLimits() {
        return builder -> builder.streamReadConstraints(StreamReadConstraints.builder()
                .maxNestingDepth(64)
                .maxDocumentLength(4L * 1024 * 1024)
                .maxStringLength(1024 * 1024)
                .maxNumberLength(64)
                .build());
    }
}
