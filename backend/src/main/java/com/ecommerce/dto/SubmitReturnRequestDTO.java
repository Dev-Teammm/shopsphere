package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

/**
 * DTO for authenticated user return request submission
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubmitReturnRequestDTO {

    @NotNull(message = "Shop Order ID is required")
    @com.fasterxml.jackson.annotation.JsonProperty("orderId")
    private Long shopOrderId;

    // Optional: will be linked if provided, or handled as guest if null
    private UUID customerId;

    @NotBlank(message = "Return reason is required")
    private String reason;

    @NotNull(message = "Return items are required")
    @Valid
    private List<ReturnItemDTO> returnItems;

    private String trackingToken; // Optional: helps verify guest orders if returning as member

    // Note: MediaFiles will be handled as MultipartFile[] in the controller
    // This DTO is used for the service layer after files are processed
}
