package com.superapp.todo.internal;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stored as a small integer rank so the database can sort by importance. */
enum Priority {
    NONE(0), LOW(1), MEDIUM(2), HIGH(3);

    private final short rank;

    Priority(int rank) {
        this.rank = (short) rank;
    }

    @Converter(autoApply = true)
    static final class RankConverter implements AttributeConverter<Priority, Short> {

        @Override
        public Short convertToDatabaseColumn(Priority priority) {
            return priority.rank;
        }

        @Override
        public Priority convertToEntityAttribute(Short rank) {
            for (var p : values()) {
                if (p.rank == rank) {
                    return p;
                }
            }
            throw new IllegalArgumentException("Unknown priority rank " + rank);
        }
    }
}
