package com.ecommerce.controller;

import com.ecommerce.dto.*;
import com.ecommerce.entity.ReturnRequest;
import com.ecommerce.entity.User;
import com.ecommerce.service.ShopAuthorizationService;
import com.ecommerce.service.ReturnService;
import com.ecommerce.service.CloudinaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.ecommerce.ServiceImpl.CustomUserDetails;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/returns")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Return Management", description = "APIs for managing product return requests")
public class ReturnController {

    private final ReturnService returnService;
    private final ShopAuthorizationService shopAuthorizationService;
    private final CloudinaryService cloudinaryService;

    private UUID getAuthenticatedUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return user.getId();
        }
        if (principal instanceof CustomUserDetails userDetails) {
            return userDetails.getUserId();
        }

        return null;
    }

    /**
     * Get shop order details for return request (Authenticated)
     */
    @GetMapping("/init/{shopOrderId}")
    @PreAuthorize("hasAnyRole('CUSTOMER','DELIVERY_AGENT','ADMIN')")
    @Operation(summary = "Get shop order details for return request", description = "Retrieve a shop order by its ID for initializing a return request")
    public ResponseEntity<?> getShopOrderDetailsForReturn(@PathVariable Long shopOrderId,
            Authentication authentication) {
        try {
            if (authentication == null || authentication.getPrincipal() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            UUID customerId = getAuthenticatedUserId(authentication);
            if (customerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            OrderResponseDTO dto = returnService.getShopOrderDetailsForReturn(shopOrderId, customerId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", dto);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching shop order details for return: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("NOT_FOUND", e.getMessage()));
        }
    }

    /**
     * Get guest shop order details for return request
     */
    @GetMapping("/init/guest")
    @Operation(summary = "Get guest shop order details for return request", description = "Retrieve a shop order by order number and tracking token for guest return")
    public ResponseEntity<?> getGuestShopOrderDetailsForReturn(
            @RequestParam String orderNumber,
            @RequestParam String token) {
        try {
            OrderResponseDTO dto = returnService.getShopOrderDetailsByTrackingToken(orderNumber, token);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", dto);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching guest shop order details for return: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("INVALID_TOKEN", e.getMessage()));
        }
    }

    /**
     * Submit a return request for authenticated users
     */
    @PostMapping(value = "/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('CUSTOMER','DELIVERY_AGENT','ADMIN')")
    @Operation(summary = "Submit return request (Authenticated)", description = "Submit a return request for authenticated customers with optional media files", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Return request submitted successfully", content = @Content(schema = @Schema(implementation = ReturnRequestDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Customer role required"),
            @ApiResponse(responseCode = "404", description = "Order not found"),
            @ApiResponse(responseCode = "422", description = "Order not eligible for return")
    })
    public ResponseEntity<?> submitReturnRequest(
            @Valid @RequestPart("returnRequest") SubmitReturnRequestDTO submitDTO,
            @RequestPart(value = "mediaFiles", required = false) MultipartFile[] mediaFiles,
            Authentication authentication) {

        try {
            // Extract customer ID from authenticated user
            UUID customerId = getAuthenticatedUserId(authentication);
            if (customerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            // Ensure the DTO has the correct customerId
            submitDTO.setCustomerId(customerId);

            log.info("Processing return request submission for authenticated customer {} and shop order {}",
                    submitDTO.getCustomerId(), submitDTO.getShopOrderId());

            ReturnRequestDTO result = returnService.submitReturnRequest(submitDTO, mediaFiles, authentication);

            log.info("Return request {} submitted successfully for customer {} and shop order {}", result.getId(),
                    submitDTO.getCustomerId(), submitDTO.getShopOrderId());

            return ResponseEntity.status(HttpStatus.CREATED).body(result);

        } catch (IllegalArgumentException e) {
            log.warn("Invalid return request data: {}", e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse("INVALID_REQUEST", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Error processing return request for customer {} and shop order {}: {}",
                    submitDTO.getCustomerId(), submitDTO.getShopOrderId(), e.getMessage(), e);

            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("ORDER_NOT_FOUND", e.getMessage()));
            } else if (e.getMessage().contains("already exists")) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(createErrorResponse("RETURN_EXISTS", e.getMessage()));
            } else if (e.getMessage().contains("not eligible") || e.getMessage().contains("expired")) {
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body(createErrorResponse("NOT_ELIGIBLE", e.getMessage()));
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    createErrorResponse("RETURN_ERROR", "Failed to process return request: " + e.getMessage()));
        }
    }

    /**
     * Get return requests for authenticated customer
     */
    @GetMapping("/my-returns")
    @PreAuthorize("hasAnyRole('CUSTOMER','DELIVERY_AGENT','ADMIN')")
    @Operation(summary = "Get customer return requests", description = "Get paginated list of return requests for authenticated customer", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Return requests retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Customer role required")
    })
    public ResponseEntity<?> getCustomerReturnRequests(
            @Parameter(description = "Customer ID") @RequestParam UUID customerId,
            @PageableDefault(size = 10) Pageable pageable, Authentication authentication) {

        try {
            log.info("Retrieving return requests for customer {}", customerId);

            Page<ReturnRequestDTO> returnRequests = returnService.getReturnRequestsByCustomer(customerId, pageable);

            log.info("Retrieved {} return requests for customer {}", returnRequests.getTotalElements(), customerId);

            return ResponseEntity.ok(returnRequests);

        } catch (Exception e) {
            log.error("Error retrieving return requests for customer {}: {}", customerId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("RETRIEVAL_ERROR", "Failed to retrieve return requestsa"));
        }
    }

    /**
     * Get return requests by order ID for authenticated users
     */
    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('CUSTOMER','DELIVERY_AGENT','ADMIN')")
    @Operation(summary = "Get return requests by order ID", description = "Get all return requests for a specific order (authenticated users)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Return requests retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Customer role required"),
            @ApiResponse(responseCode = "404", description = "Order not found")
    })
    public ResponseEntity<?> getReturnRequestsByOrderId(@Parameter(description = "Order ID") @PathVariable Long orderId,
            Authentication authentication) {

        try {
            if (authentication == null || authentication.getPrincipal() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            UUID customerId = getAuthenticatedUserId(authentication);
            if (customerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            log.info("Retrieving return requests for order {} and customer {}", orderId, customerId);

            var returnRequests = returnService.getReturnRequestsByOrderId(orderId, customerId);

            log.info("Retrieved {} return requests for order {}", returnRequests.size(), orderId);

            return ResponseEntity.ok(returnRequests);

        } catch (RuntimeException e) {
            log.error("Error retrieving return requests for order {}: {}", orderId, e.getMessage(), e);

            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("ORDER_NOT_FOUND", e.getMessage()));
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("RETRIEVAL_ERROR", "Failed to retrieve return requestsb"));
        }
    }

    /**
     * Get return requests by shop order ID for authenticated users
     */
    @GetMapping("/shop-order/{shopOrderId}")
    @PreAuthorize("hasAnyRole('CUSTOMER','DELIVERY_AGENT','ADMIN')")
    @Operation(summary = "Get return requests by shop order ID", description = "Get all return requests for a specific shop order (authenticated users)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Return requests retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Customer role required"),
            @ApiResponse(responseCode = "404", description = "Shop order not found")
    })
    public ResponseEntity<?> getReturnRequestsByShopOrderId(
            @Parameter(description = "Shop Order ID") @PathVariable Long shopOrderId,
            Authentication authentication) {

        try {
            if (authentication == null || authentication.getPrincipal() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            UUID customerId = getAuthenticatedUserId(authentication);
            if (customerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            log.info("Retrieving return requests for shop order {} and customer {}", shopOrderId, customerId);

            var returnRequests = returnService.getReturnRequestsByShopOrderId(shopOrderId, customerId);

            log.info("Retrieved {} return requests for shop order {}", returnRequests.size(), shopOrderId);

            return ResponseEntity.ok(returnRequests);

        } catch (RuntimeException e) {
            log.error("Error retrieving return requests for shop order {}: {}", shopOrderId, e.getMessage(), e);

            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("ORDER_NOT_FOUND", e.getMessage()));
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponses("RETRIEVAL_ERROR", "Failed to retrieve return requestsc",
                            e.getMessage()));
        }
    }

    /**
     * Get return requests by order number for authenticated users
     */
    @GetMapping("/order-number/{orderNumber}")
    @PreAuthorize("hasAnyRole('CUSTOMER','DELIVERY_AGENT','ADMIN')")
    @Operation(summary = "Get return requests by order number", description = "Get all return requests for a specific order by its order code (authenticated users)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Return requests retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Customer role required"),
            @ApiResponse(responseCode = "404", description = "Order not found")
    })
    public ResponseEntity<?> getReturnRequestsByOrderNumber(
            @Parameter(description = "Order number") @PathVariable String orderNumber,
            @Parameter(description = "Customer ID") @RequestParam(required = false) UUID customerId,
            Authentication authentication) {

        try {
            if (authentication == null || authentication.getPrincipal() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            UUID authenticatedUserId = getAuthenticatedUserId(authentication);
            if (authenticatedUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            UUID actualCustomerId = customerId != null ? customerId : authenticatedUserId;

            log.info("Retrieving return requests for order number {} and customer {}", orderNumber, actualCustomerId);

            var returnRequests = returnService.getReturnRequestsByOrderNumber(orderNumber, actualCustomerId);

            log.info("Retrieved {} return requests for order number {}", returnRequests.size(), orderNumber);

            return ResponseEntity.ok(returnRequests);

        } catch (RuntimeException e) {
            log.error("Error retrieving return requests for order {}: {}", orderNumber, e.getMessage(), e);

            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("ORDER_NOT_FOUND", e.getMessage()));
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("RETRIEVAL_ERROR", "Failed to retrieve return requestsd"));
        }
    }

    /**
     * Get return requests by order number and tracking token (for guest users)
     */
    @GetMapping("/order/guest")
    @Operation(summary = "Get return requests by order number and token", description = "Get all return requests for a specific order using tracking token (guest users)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Return requests retrieved successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request parameters"),
            @ApiResponse(responseCode = "404", description = "Order not found")
    })
    public ResponseEntity<?> getReturnRequestsByOrderNumberAndToken(
            @Parameter(description = "Order number") @RequestParam String orderNumber,
            @Parameter(description = "Tracking token") @RequestParam String token) {

        try {
            log.info("Retrieving return requests for guest order {}", orderNumber);

            var returnRequests = returnService.getReturnRequestsByOrderNumberAndToken(orderNumber, token);

            log.info("Retrieved {} return requests for guest order {}", returnRequests.size(), orderNumber);

            return ResponseEntity.ok(returnRequests);

        } catch (IllegalArgumentException e) {
            log.warn("Invalid request parameters: {}", e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse("INVALID_REQUEST", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Error retrieving return requests for order {}: {}", orderNumber, e.getMessage(), e);

            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("ORDER_NOT_FOUND", e.getMessage()));
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("RETRIEVAL_ERROR", "Failed to retrieve return requestse"));
        }
    }

    /**
     * Get specific return request details
     */
    @GetMapping("/{returnRequestId}")
    @Operation(summary = "Get return request details", description = "Get detailed information about a specific return request", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Return request details retrieved successfully", content = @Content(schema = @Schema(implementation = ReturnRequestDTO.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Return request not found")
    })
    public ResponseEntity<?> getReturnRequestDetails(
            @Parameter(description = "Return request ID") @PathVariable Long returnRequestId,
            @Parameter(description = "Tracking token for guest access") @RequestParam(required = false) String token,
            Authentication authentication) {

        try {
            log.info("Retrieving return request details for ID {}", returnRequestId);

            // Handle Guest Access via Token
            if (token != null && !token.trim().isEmpty()) {
                log.info("Authorizing guest access for return {} via token", returnRequestId);
                // ReturnService will validate the token and check if it belongs to this return
                ReturnRequestDTO returnRequest = returnService.getReturnRequestByIdAndToken(returnRequestId, token);
                return ResponseEntity.ok(returnRequest);
            }

            // Handle Authenticated Access
            if (authentication == null || authentication.getPrincipal() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated or token missing"));
            }

            // Validate shop access for VENDOR
            validateShopAccess(returnRequestId, authentication);

            ReturnRequestDTO returnRequest = returnService.getReturnRequestById(returnRequestId);

            log.info("Return request {} details retrieved successfully", returnRequestId);

            return ResponseEntity.ok(returnRequest);

        } catch (RuntimeException e) {
            log.error("Error retrieving return request {}: {}", returnRequestId, e.getMessage(), e);

            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("RETURN_NOT_FOUND", e.getMessage()));
            } else if (e.getMessage() != null && e.getMessage().contains("Invalid token")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(createErrorResponse("ACCESS_DENIED", e.getMessage()));
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("RETRIEVAL_ERROR",
                            e.getMessage() != null ? e.getMessage() : "Failed to retrieve return requestf"));
        }
    }

    // ==================== ADMIN/EMPLOYEE ENDPOINTS ====================

    /**
     * Get return requests by status (Admin/Employee only)
     */
    @GetMapping("/admin/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    @Operation(summary = "Get return requests by status (Admin)", description = "Get paginated list of return requests filtered by status", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Return requests retrieved successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid status parameter"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin/Employee role required")
    })
    public ResponseEntity<?> getReturnRequestsByStatus(
            @Parameter(description = "Return request status") @PathVariable String status,
            @Parameter(description = "Optional shop ID") @RequestParam(required = false) UUID shopId,
            @PageableDefault(size = 20) Pageable pageable, Authentication authentication) {

        try {
            log.info("Admin {} retrieving return requests with status {}", authentication.getName(), status);

            // If user is VENDOR, they can only see orders for their shop
            if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_VENDOR"))) {
                UUID authenticatedUserId = getAuthenticatedUserId(authentication);
                if (authenticatedUserId != null) {
                    if (shopId != null) {
                        shopAuthorizationService.assertCanManageShop(authenticatedUserId, shopId);
                    } else {
                        log.error("Vendor {} requested returns by status without shopId", authenticatedUserId);
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(createErrorResponse("ACCESS_DENIED", "Vendors must specify a shop ID."));
                    }
                }
            }

            // Validate status parameter
            ReturnRequest.ReturnStatus returnStatus;
            try {
                returnStatus = ReturnRequest.ReturnStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("INVALID_STATUS", "Invalid return status: " + status));
            }

            Page<ReturnRequestDTO> returnRequests = returnService.getReturnRequestsByStatus(returnStatus, shopId,
                    pageable);

            log.info("Retrieved {} return requests with status {} for admin review", returnRequests.getTotalElements(),
                    status);

            return ResponseEntity.ok(returnRequests);

        } catch (RuntimeException e) {
            log.error("Error retrieving return requests by status {} for admin {}: {}", status,
                    authentication.getName(),
                    e.getMessage(), e);
            String message = e.getMessage() != null ? e.getMessage() : "Failed to retrieve return requestsg";
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("ACCESS_DENIED", message));
        } catch (Exception e) {
            log.error("Error retrieving return requests by status {} for admin {}: {}", status,
                    authentication.getName(),
                    e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("RETRIEVAL_ERROR", "Failed to retrieve return requestsh"));
        }
    }

    private Map<String, Object> createErrorResponses(String errorCode, String message, String errorDetails) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("errorCode", errorCode);
        error.put("message", message);
        error.put("timestampssss", System.currentTimeMillis());
        error.put("Error details", errorDetails);
        return error;
    }

    /**
     * Get guest return requests (Admin/Employee only)
     */
    @GetMapping("/admin/guest")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    @Operation(summary = "Get guest return requests (Admin)", description = "Get paginated list of return requests from guest users", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Guest return requests retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin/Employee role required")
    })
    public ResponseEntity<?> getGuestReturnRequests(
            @Parameter(description = "Optional shop ID") @RequestParam(required = false) UUID shopId,
            @PageableDefault(size = 20) Pageable pageable,
            Authentication authentication) {

        try {
            log.info("Admin {} retrieving guest return requests", authentication.getName());

            // If user is VENDOR, they can only see orders for their shop
            if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_VENDOR"))) {
                UUID authenticatedUserId = getAuthenticatedUserId(authentication);
                if (authenticatedUserId != null) {
                    if (shopId != null) {
                        shopAuthorizationService.assertCanManageShop(authenticatedUserId, shopId);
                    } else {
                        log.error("Vendor {} requested guest returns without shopId", authenticatedUserId);
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(createErrorResponse("ACCESS_DENIED", "Vendors must specify a shop ID."));
                    }
                }
            }

            Page<ReturnRequestDTO> returnRequests = returnService.getGuestReturnRequests(shopId, pageable);

            log.info("Retrieved {} guest return requests for admin review", returnRequests.getTotalElements());

            return ResponseEntity.ok(returnRequests);

        } catch (RuntimeException e) {
            log.error("Error retrieving guest return requests for admin {}: {}", authentication.getName(),
                    e.getMessage(), e);
            String message = e.getMessage() != null ? e.getMessage() : "Failed to retrieve guest return requests";
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("ACCESS_DENIED", message));
        } catch (Exception e) {
            log.error("Error retrieving guest return requests for admin {}: {}", authentication.getName(),
                    e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("RETRIEVAL_ERROR", "Failed to retrieve guest return requests"));
        }
    }

    /**
     * Review and make decision on return request (Admin/Employee only)
     */
    @PostMapping(value = "/admin/review", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    @Operation(summary = "Review return request (Admin)", description = "Approve or deny a return request with optional refund screenshot", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Return request reviewed successfully", content = @Content(schema = @Schema(implementation = ReturnRequestDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid review data"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin/Employee role required"),
            @ApiResponse(responseCode = "404", description = "Return request not found"),
            @ApiResponse(responseCode = "409", description = "Return request already reviewed")
    })
    public ResponseEntity<?> reviewReturnRequest(
            @RequestParam("returnRequestId") Long returnRequestId,
            @RequestParam("decision") String decision,
            @RequestParam(value = "decisionNotes", required = false) String decisionNotes,
            @RequestParam(value = "refundNotes", required = false) String refundNotes,
            @RequestParam(value = "refundScreenshot", required = false) MultipartFile refundScreenshot,
            Authentication authentication) {

        try {
            log.info("Admin/Vendor {} reviewing return request {} with decision {}", authentication.getName(),
                    returnRequestId, decision);

            // Validate shop access for VENDOR
            validateShopAccess(returnRequestId, authentication);

            // Validate refund screenshot is required for approvals
            if ("APPROVED".equalsIgnoreCase(decision) && (refundScreenshot == null || refundScreenshot.isEmpty())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(createErrorResponse("SCREENSHOT_REQUIRED",
                                "Payment screenshot is required when approving return requests"));
            }

            // Build decision DTO
            ReturnDecisionDTO decisionDTO = new ReturnDecisionDTO(returnRequestId, decision, decisionNotes, refundNotes,
                    null);

            // Handle refund screenshot upload
            if (refundScreenshot != null && !refundScreenshot.isEmpty()) {
                try {
                    Map<String, String> uploadResult = cloudinaryService.uploadImage(refundScreenshot);
                    String screenshotUrl = uploadResult.get("url");
                    decisionDTO.setRefundScreenshotUrl(screenshotUrl);
                    log.info("Uploaded refund screenshot for return request {}: {}", returnRequestId, screenshotUrl);
                } catch (Exception e) {
                    log.error("Failed to upload refund screenshot for return request {}: {}", returnRequestId,
                            e.getMessage(), e);
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(createErrorResponse("SCREENSHOT_UPLOAD_ERROR", "Failed to upload refund screenshot"));
                }
            }

            ReturnRequestDTO result = returnService.reviewReturnRequest(decisionDTO);

            log.info("Return request {} reviewed successfully by admin {} with decision {}",
                    returnRequestId, authentication.getName(), decision);

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            log.warn("Invalid review data for return request {}: {}", returnRequestId, e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse("INVALID_REQUEST", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Error reviewing return request {} by admin {}: {}", returnRequestId,
                    authentication.getName(), e.getMessage(), e);

            String message = e.getMessage() != null ? e.getMessage() : "Failed to review return request";

            if (message.contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("RETURN_NOT_FOUND", message));
            } else if (message.contains("not in pending status") || message.contains("already")) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(createErrorResponse("ALREADY_REVIEWED", message));
            } else if (message.contains("Decision notes are required")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(createErrorResponse("INVALID_REQUEST", message));
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("REVIEW_ERROR", message));
        }
    }

    /**
     * Complete quality control for approved return (Admin/Employee only)
     */
    @PostMapping("/admin/{returnRequestId}/quality-control")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    @Operation(summary = "Complete quality control (Admin)", description = "Complete quality control assessment for an approved return", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Quality control completed successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid quality control data"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin/Employee role required"),
            @ApiResponse(responseCode = "404", description = "Return request not found"),
            @ApiResponse(responseCode = "409", description = "Return request not in correct status for QC")
    })
    public ResponseEntity<?> completeQualityControl(
            @Parameter(description = "Return request ID") @PathVariable Long returnRequestId,
            @Valid @RequestBody QualityControlDTO qcDTO, Authentication authentication) {

        try {
            log.info("Admin {} completing quality control for return request {} with result {}",
                    authentication.getName(),
                    returnRequestId, qcDTO.getQcResult());

            // Set the return request ID in the DTO
            qcDTO.setReturnRequestId(returnRequestId);

            // Validate shop access for VENDOR
            validateShopAccess(returnRequestId, authentication);

            returnService.completeQualityControl(qcDTO);

            log.info("Quality control completed successfully for return request {} by admin {} with result {}",
                    returnRequestId, authentication.getName(), qcDTO.getQcResult());

            return ResponseEntity.ok(createSuccessResponse("Quality control completed successfully"));

        } catch (IllegalArgumentException e) {
            log.warn("Invalid quality control data for return request {}: {}", returnRequestId, e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse("INVALID_REQUEST", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Error completing quality control for return request {} by admin {}: {}", returnRequestId,
                    authentication.getName(), e.getMessage(), e);

            String message = e.getMessage() != null ? e.getMessage() : "Failed to complete quality control";

            if (message.contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("RETURN_NOT_FOUND", message));
            } else if (message.contains("not approved") || message.contains("status")) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(createErrorResponse("INVALID_STATUS", message));
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("QC_ERROR", message));
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Create standardized error response
     */
    private Map<String, Object> createErrorResponse(String errorCode, String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("errorCode", errorCode);
        error.put("message", message);
        error.put("timestamp", System.currentTimeMillis());
        return error;
    }

    /**
     * Submit return request using tracking token (secure endpoint)
     */
    @PostMapping(value = "/submit/tokenized", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Submit return request with tracking token", description = "Submit a return request using a valid tracking token for secure access")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Return request submitted successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data or expired token"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<Map<String, Object>> submitTokenizedReturnRequest(
            @Parameter(description = "Return request data as JSON") @Valid @RequestPart("returnRequest") TokenizedReturnRequestDTO returnRequest,
            @Parameter(description = "Optional media files (images/videos)") @RequestPart(value = "mediaFiles", required = false) MultipartFile[] mediaFiles) {

        try {
            log.info("Processing tokenized return request for order: {}", returnRequest.getOrderNumber());

            // Submit the return request
            ReturnRequestDTO response = returnService.submitTokenizedReturnRequest(returnRequest, mediaFiles);

            Map<String, Object> successResponse = createSuccessResponse("Return request submitted successfully");
            successResponse.put("data", response);

            return ResponseEntity.ok(successResponse);

        } catch (IllegalArgumentException e) {
            log.warn("Invalid tokenized return request: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(createErrorResponse("INVALID_REQUEST", "Invalid request: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Error processing tokenized return request", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to process return request: " + e.getMessage()));
        }
    }

    /**
     * Create standardized success response
     */
    private Map<String, Object> createSuccessResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }

    /**
     * Get pending return requests count (Admin/Employee only)
     */
    @GetMapping("/admin/count/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    @Operation(summary = "Get count of pending return requests", description = "Get count of pending return requests for sidebar badge or dashboard")
    public ResponseEntity<?> getPendingReturnsCount(@RequestParam(required = false) UUID shopId,
            Authentication authentication) {
        try {
            // If user is VENDOR, they can only see counts for their shop
            if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_VENDOR"))) {
                UUID authenticatedUserId = getAuthenticatedUserId(authentication);
                if (authenticatedUserId != null) {
                    if (shopId != null) {
                        shopAuthorizationService.assertCanManageShop(authenticatedUserId, shopId);
                    } else {
                        log.warn("VENDOR {} requested pending returns count without shopId. Returning 0.",
                                authenticatedUserId);
                        return ResponseEntity.ok(Map.of("success", true, "count", 0L));
                    }
                }
            }
            long count = returnService.countReturnRequestsByStatus(ReturnRequest.ReturnStatus.PENDING, shopId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", count);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Access denied or error getting pending return requests count: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "count", 0L, "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error getting pending return requests count: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "count", 0L));
        }
    }

    /**
     * Get all return requests with filters (Admin/Employee/Vendor portal)
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    @Operation(summary = "Get all return requests", description = "Get paginated list of all return requests with various filters")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Return requests retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Access denied to this shop"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<Map<String, Object>> getAllReturnRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String customerType,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) UUID shopId,
            @PageableDefault(size = 20) Pageable pageable,
            Authentication authentication) {

        try {
            log.info("{} retrieving all return requests with filters", authentication.getName());

            // If user is VENDOR, they can only see returns for their shop
            if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_VENDOR"))) {
                UUID authenticatedUserId = getAuthenticatedUserId(authentication);
                if (authenticatedUserId != null) {
                    if (shopId != null) {
                        shopAuthorizationService.assertCanManageShop(authenticatedUserId, shopId);
                    } else {
                        log.error("Vendor {} requested returns without shopId", authenticatedUserId);
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(createErrorResponse("ACCESS_DENIED", "Vendors must specify a shop ID."));
                    }
                }
            }

            ReturnRequest.ReturnStatus returnStatus = null;
            if (status != null && !status.isEmpty()) {
                try {
                    returnStatus = ReturnRequest.ReturnStatus.valueOf(status.toUpperCase());
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid status filter: {}", status);
                }
            }

            org.springframework.data.domain.Page<ReturnRequestDTO> requests = returnService
                    .getAllReturnRequestsWithFilters(
                            returnStatus, customerType, search, dateFrom, dateTo, shopId, pageable);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", requests.getContent());
            response.put("totalElements", requests.getTotalElements());
            response.put("totalPages", requests.getTotalPages());
            response.put("currentPage", requests.getNumber());
            response.put("pageSize", requests.getSize());

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Access denied or error getting all returns: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("ACCESS_DENIED", e.getMessage()));
        } catch (Exception e) {
            log.error("Error getting all return requests: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to retrieve return requestsi"));
        }
    }

    /**
     * Validate whether the current user has access to the shop associated with the
     * return request
     */
    private void validateShopAccess(Long returnRequestId, Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("User not authenticated");
        }

        // If it's an ADMIN or EMPLOYEE, they might have global access (handle based on
        // business rules)
        // For VENDOR, we MUST check shop ownership
        boolean isVendor = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_VENDOR"));

        if (isVendor) {
            UUID authenticatedUserId = getAuthenticatedUserId(authentication);
            if (authenticatedUserId == null) {
                throw new RuntimeException("User not authenticated");
            }
            UUID shopId = returnService.getShopIdForReturnRequest(returnRequestId);
            shopAuthorizationService.assertCanManageShop(authenticatedUserId, shopId);
        }
    }

    /**
     * Get return requests by shop ID (Vendor/Employee portal)
     */
    @GetMapping("/shop/{shopId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    @Operation(summary = "Get return requests by shop", description = "Get return requests for a specific shop")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Return requests retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Access denied to this shop"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<?> getReturnRequestsByShop(
            @PathVariable UUID shopId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable,
            Authentication authentication) {
        try {
            log.info("Getting return requests for shop: {}", shopId);

            // Validate shop access
            UUID authenticatedUserId = getAuthenticatedUserId(authentication);
            boolean isVendor = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_VENDOR"));
            if (isVendor && authenticatedUserId != null) {
                shopAuthorizationService.assertCanManageShop(authenticatedUserId, shopId);
            }

            ReturnRequest.ReturnStatus returnStatus = null;
            if (status != null && !status.isEmpty()) {
                try {
                    returnStatus = ReturnRequest.ReturnStatus.valueOf(status.toUpperCase());
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid status filter: {}", status);
                }
            }

            org.springframework.data.domain.Page<ReturnRequestDTO> requests = returnService.getReturnRequestsByShopId(
                    shopId, returnStatus, search, pageable);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", requests.getContent());
            response.put("totalElements", requests.getTotalElements());
            response.put("totalPages", requests.getTotalPages());
            response.put("currentPage", requests.getNumber());
            response.put("pageSize", requests.getSize());

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Access denied or error getting shop returns: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("ACCESS_DENIED", e.getMessage()));
        } catch (Exception e) {
            log.error("Error getting return requests for shop: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to retrieve return requestsj"));
        }
    }

    /**
     * Process manual refund with screenshot upload (Vendor/Employee only)
     */
    @PostMapping(value = "/admin/{returnRequestId}/refund", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    @Operation(summary = "Process manual refund", description = "Process refund with optional screenshot upload")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Refund processed successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request"),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "404", description = "Return request not found"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<?> processManualRefund(
            @PathVariable Long returnRequestId,
            @RequestParam java.math.BigDecimal refundAmount,
            @RequestParam(required = false) String refundNotes,
            @RequestPart(value = "refundScreenshot", required = false) MultipartFile refundScreenshot,
            Authentication authentication) {
        try {
            log.info("Processing manual refund for return request: {}", returnRequestId);

            // Validate shop access
            validateShopAccess(returnRequestId, authentication);

            ReturnRequestDTO result = returnService.processManualRefund(
                    returnRequestId, refundAmount, refundNotes, refundScreenshot);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Refund processed successfully");
            response.put("data", result);

            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            log.error("Invalid state for refund processing: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(createErrorResponse("INVALID_STATE", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Error processing refund: {}", e.getMessage());
            String message = e.getMessage() != null ? e.getMessage() : "Failed to process refund";
            if (message.contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("NOT_FOUND", message));
            }
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("ACCESS_DENIED", message));
        } catch (Exception e) {
            log.error("Internal error processing refund: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to process refund"));
        }
    }
}
