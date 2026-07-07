package com.ecommerce.Exception;

import java.util.HashMap;
import java.util.Map;

public class CheckoutValidationException extends RuntimeException {

    private final String errorCode;
    private final String userMessage;
    private final Map<String, Object> additionalData;

    public CheckoutValidationException(String errorCode, String userMessage) {
        super(userMessage);
        this.errorCode = errorCode;
        this.userMessage = userMessage;
        this.additionalData = new HashMap<>();
    }

    public CheckoutValidationException(String errorCode, String userMessage, Throwable cause) {
        super(userMessage, cause);
        this.errorCode = errorCode;
        this.userMessage = userMessage;
        this.additionalData = new HashMap<>();
    }

    /**
     * Constructor for detailed stock errors
     */
    public CheckoutValidationException(String errorCode, String userMessage, String productName,
            Integer requestedQuantity, Integer availableStock) {
        super(userMessage);
        this.errorCode = errorCode;
        this.userMessage = userMessage;
        this.additionalData = new HashMap<>();
        if (productName != null) {
            this.additionalData.put("productName", productName);
        }
        if (requestedQuantity != null) {
            this.additionalData.put("requestedQuantity", requestedQuantity);
        }
        if (availableStock != null) {
            this.additionalData.put("availableStock", availableStock);
        }
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getUserMessage() {
        return userMessage;
    }

    public Map<String, Object> getAdditionalData() {
        return additionalData;
    }

    /**
     * Add additional data to the exception
     */
    public void addData(String key, Object value) {
        this.additionalData.put(key, value);
    }
}
