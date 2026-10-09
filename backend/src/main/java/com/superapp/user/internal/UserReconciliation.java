package com.superapp.user.internal;

import java.time.Duration;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Limit;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.superapp.identity.IdentityDirectory;

/**
 * Safety net for the event stream. Keycloak's Kafka producer is fire-and-forget (a login must never wait for Kafka),
 * so an event can be lost during a broker outage. This job walks every local user and re-reads it from Keycloak:
 * profile and enabled state are copied over, and users Keycloak no longer has are erased.
 *
 * <p>Guards: one run cluster-wide (Redis lock); the realm must answer before anything is touched (a wrong realm name
 * or an outage aborts instead of reading as "every user deleted"); at most {@code max-erasures} per run.
 */
@Component
class UserReconciliation {

    private static final Logger log = LoggerFactory.getLogger(UserReconciliation.class);
    private static final String LOCK = "user:reconciliation:lock";
    private static final Duration LOCK_TTL = Duration.ofHours(1);
    /** Postgres orders uuid by unsigned bytes, so the all-zero uuid sorts first. */
    private static final UUID FIRST = new UUID(0, 0);
    private static final int BATCH = 100;

    private final AppUserRepository users;
    private final IdentityDirectory directory;
    private final UserProjection projection;
    private final StringRedisTemplate redis;
    private final int maxErasures;

    UserReconciliation(AppUserRepository users, IdentityDirectory directory, UserProjection projection,
            StringRedisTemplate redis, @Value("${superapp.user.reconciliation.max-erasures:50}") int maxErasures) {
        this.users = users;
        this.directory = directory;
        this.projection = projection;
        this.redis = redis;
        this.maxErasures = maxErasures;
    }

    @Scheduled(cron = "${superapp.user.reconciliation.cron:0 30 3 * * *}", zone = "UTC")
    void reconcile() {
        if (!Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(LOCK, "1", LOCK_TTL))) {
            return; // another instance is running it
        }
        try {
            run();
        } finally {
            redis.delete(LOCK);
        }
    }

    void run() {
        var keycloakUsers = directory.countUsers(); // throws if the realm is unreachable or misnamed: nothing is touched
        int checked = 0;
        int erased = 0;
        var after = FIRST;
        for (var ids = users.idsAfter(after, AppUser.Status.DELETED, Limit.of(BATCH)); !ids.isEmpty();
                ids = users.idsAfter(after, AppUser.Status.DELETED, Limit.of(BATCH))) {
            for (var id : ids) {
                var remote = directory.findUser(id);
                if (remote.isPresent()) {
                    projection.sync(remote.get());
                } else if (erased < maxErasures) {
                    projection.erase(id);
                    erased++;
                } else {
                    log.error("User reconciliation stopped: more than {} users are missing from Keycloak. "
                            + "Check the realm before raising superapp.user.reconciliation.max-erasures.", maxErasures);
                    return;
                }
                checked++;
            }
            after = ids.getLast();
        }
        log.info("User reconciliation: {} local users checked against {} in Keycloak, {} erased", checked,
                keycloakUsers, erased);
    }
}
