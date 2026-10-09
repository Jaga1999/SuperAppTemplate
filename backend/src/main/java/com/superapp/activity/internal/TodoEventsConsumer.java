package com.superapp.activity.internal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.superapp.identity.IdentityEvent.UserDeleted;

import tools.jackson.databind.json.JsonMapper;

/**
 * Projects todo integration events into the activity feed. Reads them as {@link TodoEventMessage}, the consumer's
 * own contract; unknown event types are ignored, malformed messages go straight to the DLT.
 */
@Component
class TodoEventsConsumer {

    private static final Logger log = LoggerFactory.getLogger(TodoEventsConsumer.class);

    private final ActivityRepository activity;
    private final JsonMapper json;

    TodoEventsConsumer(ActivityRepository activity, JsonMapper json) {
        this.activity = activity;
        this.json = json;
    }

    @KafkaListener(id = "activity-feed", topics = "${superapp.kafka.topics.todo-events}", groupId = "superapp-activity")
    @Transactional
    void on(String payload) {
        var event = json.readValue(payload, TodoEventMessage.class);
        if (activity.existsById(event.eventId())) {
            return; // redelivery
        }
        switch (event.type()) {
            case "TodoCreated", "TodoCompleted", "TodoReopened", "TodoDeleted", "CompletedTodosCleared" ->
                    activity.save(new ActivityEntry(event.eventId(), event.ownerId(), event.type(), event.todoId(),
                            event.title(), event.count(), event.occurredAt()));
            default -> log.debug("Ignoring unknown todo event type {}", event.type());
        }
    }

    @EventListener
    @Transactional
    void on(UserDeleted event) {
        activity.deleteAllOwnedBy(event.userId());
    }
}
