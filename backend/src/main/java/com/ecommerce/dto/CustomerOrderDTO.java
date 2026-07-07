package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerOrderDTO {
    private String id;
    private String orderNumber;
    // private String status; // Removed as status is now per shop
    private List<ShopOrderDTO> shopOrders; // Grouped by shop
    private BigDecimal subtotal;
    private BigDecimal tax;
    private BigDecimal total;
    private CustomerOrderAddressDTO shippingAddress;
    private CustomerOrderAddressDTO billingAddress;
    private String paymentMethod;
    private String paymentStatus;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean hasReturnRequest;

    // Helper nested classes remain the same...
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerOrderItemDTO {
        private String id;
        private String productId;
        private SimpleProductDTO product;
        private Integer quantity;
        private BigDecimal price;
        private BigDecimal originalPrice;
        private BigDecimal totalPrice;
        private BigDecimal discountPercentage;
        private String discountName;
        private Boolean hasDiscount;

        // Return fields
        private Boolean returnEligible;
        private Integer maxReturnDays;
        private Integer daysRemainingForReturn;
        private ReturnItemInfo returnInfo;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerOrderAddressDTO {
        private String id;
        private String street;
        private String city;
        private String state;
        private String country;
        private String phone;
        private Double latitude;
        private Double longitude;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReturnItemInfo {
        private Boolean hasReturnRequest;
        private Integer totalReturnedQuantity;
        private Integer remainingQuantity;
        private List<ReturnRequestInfo> returnRequests;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReturnRequestInfo {
        private Long id;
        private String returnCode;
        private String status;
        private String reason;
        private LocalDateTime submittedAt;
        private LocalDateTime decisionAt;
        private String decisionNotes;
        private Boolean canBeAppealed;
        private ReturnAppealInfo appeal;
        private Boolean refundProcessed;
        private BigDecimal refundAmount;
        private LocalDateTime refundProcessedAt;
        private String refundScreenshotUrl;
        private String refundNotes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReturnAppealInfo {
        private Long id;
        private String status;
        private String reason;
        private String description;
        private LocalDateTime submittedAt;
        private LocalDateTime decisionAt;
        private String decisionNotes;
    }
}
