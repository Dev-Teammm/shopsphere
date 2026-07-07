package com.ecommerce.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import lombok.extern.slf4j.Slf4j;

/**
 * Robust deserializer for LocalDateTime that handles:
 * - ISO-8601 strings with timezone indicators (e.g.,
 * "2026-02-21T16:00:00.000Z")
 * - Corrupted strings with multiple 'T' separators
 * - Standard local date time formats
 */
@Slf4j
public class RobustLocalDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {

    @Override
    public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String dateStr = p.getText();
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }

        try {
            // Handle corrupted strings with multiple 'T' separators
            // Example: "2026-01-30T14:49:00T14:49:00" -> "2026-01-30T14:49:00"
            if (dateStr.contains("T")) {
                String[] parts = dateStr.split("T");
                if (parts.length > 2) {
                    log.warn("Corrupted LocalDateTime detected: '{}'. Attempting to fix.", dateStr);
                    dateStr = parts[0] + "T" + parts[1];
                }
            }

            // Handle ISO-8601 strings with timezone indicators (e.g.,
            // "2026-02-21T16:00:00.000Z")
            // Parse as ZonedDateTime and convert to LocalDateTime
            if (dateStr.endsWith("Z") || dateStr.matches(".*[+-]\\d{2}:\\d{2}$")) {
                try {
                    ZonedDateTime zonedDateTime = ZonedDateTime.parse(dateStr, DateTimeFormatter.ISO_OFFSET_DATE_TIME);
                    return zonedDateTime.toLocalDateTime();
                } catch (DateTimeParseException ze) {
                    log.debug("Failed to parse as ZonedDateTime, trying ISO_INSTANT: {}", dateStr);
                    // Try parsing with ISO_INSTANT format
                    ZonedDateTime zonedDateTime = ZonedDateTime.parse(dateStr,
                            DateTimeFormatter.ISO_INSTANT.withZone(java.time.ZoneId.of("UTC")));
                    return zonedDateTime.toLocalDateTime();
                }
            }

            // Standard ISO-8601 local date time parsing
            return LocalDateTime.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException e) {
            log.error("Failed to parse LocalDateTime: '{}'. Error: {}", dateStr, e.getMessage());
            throw new IOException("Failed to parse LocalDateTime: " + dateStr, e);
        }
    }
}
