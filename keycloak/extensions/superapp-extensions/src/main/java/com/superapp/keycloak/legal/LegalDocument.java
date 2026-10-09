package com.superapp.keycloak.legal;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Metadata of one legal document, read from the front matter of {@code legal/*.md} (the repository's single source of
 * truth for both the text shown in the app and the version users must accept). Only {@code key: value} lines between
 * the leading {@code ---} markers are read; the body is not needed here.
 */
record LegalDocument(String title, String version, String effective, String summary) {

    static LegalDocument read(Path file) throws IOException {
        return parse(file.toString(), Files.readAllLines(file, StandardCharsets.UTF_8));
    }

    static LegalDocument parse(String source, List<String> lines) {
        if (lines.isEmpty() || !lines.getFirst().strip().equals("---")) {
            throw new IllegalStateException(source + ": missing front matter (expected a leading '---' line)");
        }
        Map<String, String> fields = new HashMap<>();
        for (var line : lines.subList(1, lines.size())) {
            if (line.strip().equals("---")) {
                return new LegalDocument(
                        required(fields, "title", source),
                        required(fields, "version", source),
                        fields.getOrDefault("effective", ""),
                        fields.getOrDefault("summary", ""));
            }
            var colon = line.indexOf(':');
            if (colon > 0) {
                fields.put(line.substring(0, colon).strip(), unquote(line.substring(colon + 1).strip()));
            }
        }
        throw new IllegalStateException(source + ": front matter is not closed with '---'");
    }

    private static String required(Map<String, String> fields, String key, String source) {
        var value = fields.get(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(source + ": front matter needs a non-empty '" + key + "'");
        }
        return value;
    }

    private static String unquote(String value) {
        return value.length() >= 2 && (value.startsWith("\"") && value.endsWith("\"") || value.startsWith("'") && value.endsWith("'"))
                ? value.substring(1, value.length() - 1)
                : value;
    }
}
