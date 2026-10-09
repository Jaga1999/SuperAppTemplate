package com.superapp.activity.internal;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Limit;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.superapp.auth.CurrentUser;

@RestController
@RequestMapping(path = "/api/{version}/activity", version = "1")
class ActivityController {

    private final ActivityRepository activity;

    ActivityController(ActivityRepository activity) {
        this.activity = activity;
    }

    record ActivityView(UUID id, String type, @Nullable UUID todoId, @Nullable String title, @Nullable Integer count,
            Instant occurredAt) {
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<ActivityView> recent(CurrentUser user, @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return activity.findByOwnerIdOrderByOccurredAtDesc(user.id(), Limit.of(limit)).stream()
                .map(a -> new ActivityView(a.eventId(), a.type(), a.todoId(), a.title(), a.count(), a.occurredAt()))
                .toList();
    }
}
