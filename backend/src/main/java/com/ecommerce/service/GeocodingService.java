package com.ecommerce.service;

import com.ecommerce.dto.AddressDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class GeocodingService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private static final String USER_AGENT = "AgroChain-Ecommerce/1.0 (Contact: support@agrochain.rw)";
    private static final int CONNECT_TIMEOUT_MS = 5000; // 5 second connection timeout
    private static final int READ_TIMEOUT_MS = 5000; // 5 second read timeout
    private static final int MAX_RETRY_ATTEMPTS = 2; // Reduced from 4 strategies to 2

    public GeocodingService() {
        this.restTemplate = createRestTemplateWithTimeout();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Create RestTemplate with timeout configuration
     */
    private RestTemplate createRestTemplateWithTimeout() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT_MS);
        factory.setReadTimeout(READ_TIMEOUT_MS);
        return new RestTemplate(factory);
    }

    /**
     * Get coordinates for address with caching to prevent repeated calls
     */
    @Cacheable(value = "geocoding", key = "T(java.lang.String).format('%s-%s-%s', #address.city, #address.state, #address.country)")
    public Map<String, Double> getCoordinates(AddressDto address) {
        log.info("Attempting to geocode address: {} {}, {}, {}",
                address.getStreetAddress(), address.getCity(), address.getState(), address.getCountry());

        // Strategy 1: Try with full address including street, city, country
        Map<String, Double> coords = tryGeocodeWithStrategy(address, "full");
        if (coords != null) {
            return coords;
        }

        // Strategy 2: Try with just city and country only (fallback)
        log.info("Full address geocoding failed, trying city + country fallback");
        coords = tryGeocodeWithStrategy(address, "city_country");
        if (coords != null) {
            return coords;
        }

        log.error("All geocoding strategies failed for address: {} {}, {}, {}",
                address.getStreetAddress(), address.getCity(), address.getState(), address.getCountry());
        return null;
    }

    private Map<String, Double> tryGeocodeWithStrategy(AddressDto address, String strategy) {
        try {
            String url;

            switch (strategy) {
                case "full":
                    url = buildGeocodingUrl(address.getStreetAddress(), address.getCity(), address.getCountry());
                    break;
                case "city_country":
                    url = buildGeocodingUrl("", address.getCity(), address.getCountry());
                    break;
                default:
                    return null;
            }

            log.info("Geocoding strategy '{}' - Requesting: {}", strategy, maskUrl(url));

            // Create headers with proper User-Agent
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", USER_AGENT);
            headers.set("Accept", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String response = restTemplate.getForObject(url, String.class);

            if (response == null || response.isEmpty()) {
                log.warn("Strategy '{}' - Empty response from geocoding service", strategy);
                return null;
            }

            JsonNode jsonNode = objectMapper.readTree(response);

            if (jsonNode.isArray() && jsonNode.size() > 0) {
                JsonNode firstResult = jsonNode.get(0);
                double lat = firstResult.get("lat").asDouble();
                double lon = firstResult.get("lon").asDouble();

                String displayName = firstResult.has("display_name") ? firstResult.get("display_name").asText()
                        : "Unknown";
                log.info("Strategy '{}' succeeded - Found coordinates for '{}': ({}, {})",
                        strategy, displayName, lat, lon);

                Map<String, Double> coordinates = new HashMap<>();
                coordinates.put("latitude", lat);
                coordinates.put("longitude", lon);
                return coordinates;
            } else {
                log.warn("Strategy '{}' - No coordinates found in response", strategy);
            }
        } catch (org.springframework.web.client.HttpClientErrorException ex) {
            if (ex.getStatusCode().value() == 403) {
                log.error("Strategy '{}' - Rate limited by Nominatim (403 Forbidden). " +
                        "Please wait before retrying or use provided coordinates.", strategy);
            } else {
                log.error("Strategy '{}' - HTTP Error {}: {}", strategy, ex.getStatusCode(), ex.getMessage());
            }
        } catch (org.springframework.web.client.ResourceAccessException ex) {
            log.error("Strategy '{}' - Connection timeout or network error: {}", strategy, ex.getMessage());
        } catch (Exception e) {
            log.error("Strategy '{}' failed with error: {}", strategy, e.getMessage());
        }
        return null;
    }

    private String buildGeocodingUrl(String street, String city, String country) {
        StringBuilder url = new StringBuilder("https://nominatim.openstreetmap.org/search?");
        boolean hasParams = false;

        if (street != null && !street.trim().isEmpty()) {
            url.append("street=").append(encodeUrlParam(street));
            hasParams = true;
        }

        if (city != null && !city.trim().isEmpty()) {
            if (hasParams)
                url.append("&");
            url.append("city=").append(encodeUrlParam(city));
            hasParams = true;
        }

        if (country != null && !country.trim().isEmpty()) {
            if (hasParams)
                url.append("&");
            url.append("country=").append(encodeUrlParam(country));
            hasParams = true;
        }

        url.append("&format=json&limit=1");
        return url.toString();
    }

    /**
     * Properly encode URL parameters
     */
    private String encodeUrlParam(String param) {
        return param.trim().replaceAll("\\s+", "+");
    }

    /**
     * Mask URL for logging (removes sensitive parts)
     */
    private String maskUrl(String url) {
        return url.replaceAll("street=[^&]*", "street=***");
    }
}
