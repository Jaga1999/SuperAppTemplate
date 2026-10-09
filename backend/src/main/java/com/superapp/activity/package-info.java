/**
 * Activity feed, built asynchronously from {@code superapp.todo.events} consumed from Kafka.
 * Demonstrates the consumer side of the outbox: idempotent, ordered per user, dead-lettered on poison messages.
 */
@NullMarked
package com.superapp.activity;

import org.jspecify.annotations.NullMarked;
