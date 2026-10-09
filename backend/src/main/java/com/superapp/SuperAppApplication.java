package com.superapp;

import java.time.ZoneOffset;
import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.resilience.annotation.EnableResilientMethods;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * SuperApp backend-for-frontend.
 *
 * <p>Single-module monolith, packaged by feature. Each direct sub-package owns one concern and keeps its
 * implementation in an {@code internal} sub-package; other features use only the top-level (public) types:
 * <ul>
 *   <li>{@code shared}   – cross-cutting kernel (crypto, errors, outbox, web config)</li>
 *   <li>{@code auth}     – BFF security: Keycloak login, cookie tokens, refresh, revocation, rate limits, /auth proxy</li>
 *   <li>{@code identity} – Keycloak Admin API + Keycloak event stream (Kafka)</li>
 *   <li>{@code user}     – local projection of Keycloak users</li>
 *   <li>{@code admin}    – admin-only endpoints</li>
 * </ul>
 * The boundaries are enforced by {@code ArchitectureTest}.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableResilientMethods
@EnableScheduling
public class SuperAppApplication {

    static void main(String[] args) {
        // Servers run in UTC: timestamps, JDBC session time zone and logs agree everywhere.
        TimeZone.setDefault(TimeZone.getTimeZone(ZoneOffset.UTC));
        SpringApplication.run(SuperAppApplication.class, args);
    }
}
