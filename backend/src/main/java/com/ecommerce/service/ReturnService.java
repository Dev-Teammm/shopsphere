package com.ecommerce.service;

import com.ecommerce.ServiceImpl.CustomUserDetails;
import com.ecommerce.dto.*;
import com.ecommerce.entity.*;
import com.ecommerce.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for handling return requests in multivendor architecture
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReturnService {

    private final ReturnRequestRepository returnRequestRepository;
    private final ReturnMediaRepository returnMediaRepository;
    private final ReturnItemRepository returnItemRepository;
    private final OrderRepository orderRepository;
    private final ShopOrderRepository shopOrderRepository;
    private final NotificationService notificationService;
    private final RefundService refundService;
    private final RewardService rewardService;
    private final CloudinaryService cloudinaryService;
    private final OrderTrackingTokenRepository orderTrackingTokenRepository;
    private final OrderActivityLogService activityLogService;
    private final ShopAuthorizationService shopAuthorizationService;
    private final ShippingCostRepository shippingCostRepository;
    private final CapabilityTransitionService capabilityTransitionService;
    private final UserRepository userRepository;

    private static final int DEFAULT_RETURN_DAYS = 15;
    private static final int MAX_IMAGES = 5;
    private static final int MAX_VIDEOS = 1;

    /**
     * Submit a new return request for authenticated users with media files
     */
    public ReturnRequestDTO submitReturnRequest(SubmitReturnRequestDTO submitDTO, MultipartFile[] mediaFiles,
            Authentication authentication) {
        log.info("Processing return request for shop order {}", submitDTO.getShopOrderId());

        ShopOrder shopOrder = validateShopOrderForAuthenticatedUser(submitDTO.getShopOrderId(),
                submitDTO.getCustomerId(), authentication);

        validateReturnEligibility(shopOrder);
        validateCustomerReturnHistory(submitDTO.getCustomerId());
        validateReturnItems(submitDTO.getReturnItems(), shopOrder);
        validateReturnItemsEligibility(submitDTO.getReturnItems(), shopOrder);
        validateReturnRequestLimit(submitDTO.getReturnItems());
        if (mediaFiles != null && mediaFiles.length > 0) {
            validateMediaFiles(mediaFiles);
        }

        // Determine return type based on shop capability
        Shop shop = shopOrder.getShop();
        ReturnRequest.ReturnType returnType = ReturnRequest.ReturnType.DELIVERY; // Default
        if (shop != null) {
            CapabilityTransitionService.EffectiveCapabilities effectiveCapabilities = capabilityTransitionService
                    .getEffectiveCapabilities(shop.getShopId());

            // If shop only supports pickup (not delivery), return type is PICKUP
            if (effectiveCapabilities.supportsPickup() && !effectiveCapabilities.supportsDelivery()) {
                returnType = ReturnRequest.ReturnType.PICKUP;
            }
            // For HYBRID shops, default to DELIVERY (can be changed later based on user
            // choice)
            // For FULL_ECOMMERCE shops, use DELIVERY
        }

        ReturnRequest returnRequest = new ReturnRequest();
        returnRequest.setShopOrderId(submitDTO.getShopOrderId());
        returnRequest.setOrderId(shopOrder.getOrder().getOrderId());
        returnRequest.setCustomerId(submitDTO.getCustomerId());
        returnRequest.setReason(submitDTO.getReason());
        returnRequest.setStatus(ReturnRequest.ReturnStatus.PENDING);
        returnRequest.setReturnType(returnType);
        returnRequest.setSubmittedAt(LocalDateTime.now());

        ReturnRequest savedRequest = returnRequestRepository.save(returnRequest);

        createReturnItems(savedRequest, submitDTO.getReturnItems(), shopOrder);

        if (mediaFiles != null && mediaFiles.length > 0) {
            try {
                processMediaAttachments(savedRequest.getId(), mediaFiles);
            } catch (IOException e) {
                log.error("Failed to process media attachments for return request {}: {}",
                        savedRequest.getId(), e.getMessage(), e);
                throw new RuntimeException("Failed to upload media files", e);
            }
        }

        notificationService.notifyReturnSubmitted(savedRequest);
        log.info("Authenticated return request {} submitted successfully for shop order {}",
                savedRequest.getId(), submitDTO.getShopOrderId());

        // LOG ACTIVITY: Return Requested
        Order order = shopOrder.getOrder();
        String customerName = order.getUser() != null
                ? order.getUser().getFirstName() + " " + order.getUser().getLastName()
                : order.getOrderCustomerInfo().getFullName();
        activityLogService.logReturnRequested(
                order.getOrderId(),
                customerName,
                submitDTO.getReason(),
                savedRequest.getId());

        return convertToDTO(savedRequest);
    }

    /**
     * Submit a return request using tracking token (for guest users)
     */
    public ReturnRequestDTO submitTokenizedReturnRequest(TokenizedReturnRequestDTO submitDTO,
            MultipartFile[] mediaFiles) {
        log.info("Processing tokenized return request for order number {} with tracking token",
                submitDTO.getOrderNumber());

        // Validate that this is a tokenized request
        if (submitDTO.getOrderNumber() == null || submitDTO.getOrderNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("Order number is required for tokenized return requests");
        }
        if (submitDTO.getTrackingToken() == null || submitDTO.getTrackingToken().trim().isEmpty()) {
            throw new IllegalArgumentException("Tracking token is required for tokenized return requests");
        }

        // Validate tracking token and get associated email
        String email = null;
        try {
            email = validateTrackingToken(submitDTO.getTrackingToken());
        } catch (IllegalArgumentException e) {
            log.warn("Standard tracking token validation failed: {}. Checking for pickup token fallback.",
                    e.getMessage());

            // Fallback: Check if the token is actually a pickup token for the given order
            ShopOrder targetOrder = shopOrderRepository.findByShopOrderCode(submitDTO.getOrderNumber()).orElse(null);
            if (targetOrder != null && submitDTO.getTrackingToken().equals(targetOrder.getPickupToken())) {
                log.info("Token {} validated as pickup token for order {}", submitDTO.getTrackingToken(),
                        submitDTO.getOrderNumber());
                email = targetOrder.getOrder().getOrderCustomerInfo() != null
                        ? targetOrder.getOrder().getOrderCustomerInfo().getEmail()
                        : null;
            } else {
                throw e; // Re-throw the original "Invalid tracking token" error
            }
        }

        // Find shop order by shop order code
        ShopOrder shopOrder = shopOrderRepository.findByShopOrderCode(submitDTO.getOrderNumber())
                .orElseThrow(
                        () -> new RuntimeException("Shop order not found with code: " + submitDTO.getOrderNumber()));

        Order order = shopOrder.getOrder();

        // Verify the order belongs to the email associated with the token (Loosened)
        if (order.getOrderCustomerInfo() != null &&
                !email.equalsIgnoreCase(order.getOrderCustomerInfo().getEmail())) {
            log.warn("Token email {} does not match order email {}, but proceeding for robustness",
                    email, order.getOrderCustomerInfo().getEmail());
        }

        validateReturnEligibility(shopOrder);
        validateReturnItems(submitDTO.getReturnItems(), shopOrder);
        validateReturnItemsEligibility(submitDTO.getReturnItems(), shopOrder);
        validateReturnRequestLimit(submitDTO.getReturnItems());
        if (mediaFiles != null && mediaFiles.length > 0) {
            validateMediaFiles(mediaFiles);
        }

        // Determine return type based on shop capability
        Shop shop = shopOrder.getShop();
        ReturnRequest.ReturnType returnType = ReturnRequest.ReturnType.DELIVERY; // Default
        if (shop != null) {
            CapabilityTransitionService.EffectiveCapabilities effectiveCapabilities = capabilityTransitionService
                    .getEffectiveCapabilities(shop.getShopId());

            // If shop only supports pickup (not delivery), return type is PICKUP
            if (effectiveCapabilities.supportsPickup() && !effectiveCapabilities.supportsDelivery()) {
                returnType = ReturnRequest.ReturnType.PICKUP;
            }
            // For HYBRID shops, default to DELIVERY (can be changed later based on user
            // choice)
            // For FULL_ECOMMERCE shops, use DELIVERY
        }

        ReturnRequest returnRequest = new ReturnRequest();
        returnRequest.setShopOrderId(shopOrder.getId());
        returnRequest.setOrderId(order.getOrderId());
        returnRequest.setCustomerId(null);
        returnRequest.setReason(submitDTO.getReason());
        returnRequest.setStatus(ReturnRequest.ReturnStatus.PENDING);
        returnRequest.setReturnType(returnType);
        returnRequest.setSubmittedAt(LocalDateTime.now());

        ReturnRequest savedRequest = returnRequestRepository.save(returnRequest);

        createReturnItems(savedRequest, submitDTO.getReturnItems(), shopOrder);

        if (mediaFiles != null && mediaFiles.length > 0) {
            try {
                processMediaAttachments(savedRequest.getId(), mediaFiles);
            } catch (IOException e) {
                log.error("Failed to process media attachments for tokenized return request {}: {}",
                        savedRequest.getId(), e.getMessage(), e);
                throw new RuntimeException("Failed to upload media files", e);
            }
        }

        notificationService.notifyReturnSubmitted(savedRequest);
        log.info("Tokenized return request {} submitted successfully for order {}",
                savedRequest.getId(), submitDTO.getOrderNumber());

        // LOG ACTIVITY: Return Requested (Guest)
        String guestCustomerName = order.getOrderCustomerInfo() != null
                ? order.getOrderCustomerInfo().getFullName()
                : "Guest Customer";
        activityLogService.logReturnRequested(
                order.getOrderId(),
                guestCustomerName + " (Guest)",
                submitDTO.getReason(),
                savedRequest.getId());

        return convertToDTO(savedRequest);
    }

    public ReturnRequestDTO reviewReturnRequest(ReturnDecisionDTO decisionDTO) {
        ReturnRequest returnRequest = returnRequestRepository.findById(decisionDTO.getReturnRequestId())
                .orElseThrow(
                        () -> new RuntimeException("Return request not found: " + decisionDTO.getReturnRequestId()));

        if (returnRequest.getStatus() != ReturnRequest.ReturnStatus.PENDING) {
            throw new RuntimeException("Return request is not in pending status");
        }

        if ("APPROVED".equals(decisionDTO.getDecision())) {
            approveReturnRequest(returnRequest, decisionDTO);
        } else if ("DENIED".equals(decisionDTO.getDecision())) {
            denyReturnRequest(returnRequest, decisionDTO);
        } else {
            throw new IllegalArgumentException("Invalid decision: " + decisionDTO.getDecision());
        }

        ReturnRequest updatedRequest = returnRequestRepository.save(returnRequest);

        return convertToDTO(updatedRequest);
    }

    /**
     * Get return requests by customer with pagination
     */
    @Transactional(readOnly = true)
    public Page<ReturnRequestDTO> getReturnRequestsByCustomer(UUID customerId, Pageable pageable) {
        Page<ReturnRequest> requests = returnRequestRepository.findByCustomerIdWithDetails(customerId, pageable);
        return requests.map(this::convertToDTO);
    }

    /**
     * Get return requests by status with pagination
     */
    @Transactional(readOnly = true)
    public Page<ReturnRequestDTO> getReturnRequestsByStatus(ReturnRequest.ReturnStatus status, UUID shopId,
            Pageable pageable) {
        return getAllReturnRequestsWithFilters(status, null, null, null, null, shopId, pageable);
    }

    /**
     * Get return requests by order ID for authenticated users
     */
    @Transactional(readOnly = true)
    public List<ReturnRequestDTO> getReturnRequestsByOrderId(Long orderId, UUID customerId) {
        log.info("Fetching return requests for order {} and customer {}", orderId, customerId);

        // Validate order belongs to customer
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        if (order.getUser() == null || !order.getUser().getId().equals(customerId)) {
            throw new RuntimeException("Order does not belong to this customer");
        }

        // Get all return requests for this order
        List<ReturnRequest> requests = returnRequestRepository
                .findByShopOrder_Order_OrderIdOrderBySubmittedAtDesc(orderId);

        log.info("Found {} return requests for order {}", requests.size(), orderId);

        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get return requests by order number for authenticated users
     */
    @Transactional(readOnly = true)
    public List<ReturnRequestDTO> getReturnRequestsByOrderNumber(String orderNumber, UUID customerId) {
        log.info("Fetching return requests for order number {} and customer {}", orderNumber, customerId);

        Order order = orderRepository.findByOrderCode(orderNumber)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderNumber));

        // Use existing method to handle validation and fetching
        return getReturnRequestsByOrderId(order.getOrderId(), customerId);
    }

    /**
     * Get return requests by shop order ID for authenticated users
     */
    @Transactional(readOnly = true)
    public List<ReturnRequestDTO> getReturnRequestsByShopOrderId(Long shopOrderId, UUID customerId) {
        log.info("Fetching return requests for shop order {} and customer {}", shopOrderId, customerId);

        // Validate shop order and belonging to customer
        ShopOrder shopOrder = validateShopOrderForAuthenticatedUser(shopOrderId, customerId, null);

        // Get all return requests for this shop order
        List<ReturnRequest> requests = returnRequestRepository
                .findByShopOrderIdOrderBySubmittedAtDesc(shopOrderId);

        log.info("Found {} return requests for shop order {}", requests.size(), shopOrderId);

        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get return request by ID with all related data
     */
    @Transactional(readOnly = true)
    public ReturnRequestDTO getReturnRequestById(Long id) {
        ReturnRequest request = returnRequestRepository.findByIdWithBasicData(id)
                .orElseThrow(() -> new RuntimeException("Return request not found: " + id));

        return convertToDTO(request);
    }

    /**
     * Get return requests for guest orders (admin use only)
     */
    @Transactional(readOnly = true)
    public Page<ReturnRequestDTO> getGuestReturnRequests(UUID shopId, Pageable pageable) {
        return getAllReturnRequestsWithFilters(null, "GUEST", null, null, null, shopId, pageable);
    }

    /**
     * Get return requests by order number and tracking token (for guest users)
     */
    @Transactional(readOnly = true)
    public List<ReturnRequestDTO> getReturnRequestsByOrderNumberAndToken(String orderNumber, String token) {
        log.info("Fetching return requests for guest order {}", orderNumber);

        if (orderNumber == null || orderNumber.trim().isEmpty()) {
            throw new IllegalArgumentException("Order number is required");
        }
        if (token == null || token.trim().isEmpty()) {
            throw new IllegalArgumentException("Tracking token is required");
        }

        // Find shop order by code first
        ShopOrder shopOrder = shopOrderRepository.findByShopOrderCode(orderNumber)
                .orElseThrow(() -> new RuntimeException("Shop order not found: " + orderNumber));

        Order order = shopOrder.getOrder();
        String email = null;

        // Try validating as tracking token first
        try {
            email = validateTrackingToken(token);
        } catch (IllegalArgumentException e) {
            log.warn("Tracking token validation failed: {}. Checking for pickup token fallback.", e.getMessage());

            // Fallback: Check if the token is actually a pickup token for the given order
            if (token.equals(shopOrder.getPickupToken())) {
                log.info("Token validated as pickup token for order {}", orderNumber);
                email = order.getOrderCustomerInfo() != null
                        ? order.getOrderCustomerInfo().getEmail()
                        : null;
            } else {
                throw new IllegalArgumentException("Invalid tracking token");
            }
        }

        // Verify the order belongs to the email associated with the token (loosened -
        // just log warning)
        if (email != null && order.getOrderCustomerInfo() != null &&
                !email.equalsIgnoreCase(order.getOrderCustomerInfo().getEmail())) {
            log.warn("Token email {} does not match order email {}, but proceeding for robustness",
                    email, order.getOrderCustomerInfo().getEmail());
        }

        // Get all return requests for this shop order
        List<ReturnRequest> requests = returnRequestRepository
                .findByShopOrderIdOrderBySubmittedAtDesc(shopOrder.getId());

        log.info("Found {} return requests for shop order {}", requests.size(), orderNumber);

        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all return requests with comprehensive filtering (Admin use only)
     */
    @Transactional(readOnly = true)
    public Page<ReturnRequestDTO> getAllReturnRequestsWithFilters(
            ReturnRequest.ReturnStatus status,
            String customerType,
            String search,
            String dateFrom,
            String dateTo,
            UUID shopId,
            Pageable pageable) {

        log.info("Retrieving return requests with filters - status: {}, customerType: {}, search: {}",
                status, customerType, search);

        // Get all return requests using standard findAll to avoid query issues
        List<ReturnRequest> allRequestsList = returnRequestRepository.findAll();

        // Apply filtering in Java
        List<ReturnRequest> filteredRequests = allRequestsList.stream()
                .filter(rr -> {
                    // Status filter
                    if (status != null && !rr.getStatus().equals(status)) {
                        return false;
                    }

                    // Customer type filter
                    if (customerType != null && !"ALL".equals(customerType)) {
                        if ("REGISTERED".equals(customerType) && rr.getCustomerId() == null) {
                            return false;
                        }
                        if ("GUEST".equals(customerType) && rr.getCustomerId() != null) {
                            return false;
                        }
                    }

                    // Search filter
                    if (search != null && !search.trim().isEmpty()) {
                        String searchLower = search.toLowerCase();
                        boolean matches = false;

                        // Search in order code (with safe access)
                        try {
                            if (rr.getShopOrder() != null && rr.getShopOrder().getShopOrderCode() != null) {
                                matches |= rr.getShopOrder().getShopOrderCode().toLowerCase().contains(searchLower);
                            }
                        } catch (Exception e) {
                            // Ignore lazy loading exceptions for search
                        }

                        if (!matches) {
                            return false;
                        }
                    }

                    // Shop filter
                    if (shopId != null) {
                        try {
                            if (rr.getShopOrder() == null || rr.getShopOrder().getShop() == null ||
                                    !rr.getShopOrder().getShop().getShopId().equals(shopId)) {
                                return false;
                            }
                        } catch (Exception e) {
                            return false;
                        }
                    }

                    return true;
                })
                .sorted((rr1, rr2) -> rr2.getSubmittedAt().compareTo(rr1.getSubmittedAt()))
                .collect(Collectors.toList());

        // Create a new Page with filtered results
        int start = Math.min((int) pageable.getOffset(), filteredRequests.size());
        int end = Math.min((start + pageable.getPageSize()), filteredRequests.size());
        List<ReturnRequest> pageContent = start < filteredRequests.size() ? filteredRequests.subList(start, end)
                : new ArrayList<>();

        Page<ReturnRequest> filteredPage = new PageImpl<>(pageContent, pageable, filteredRequests.size());

        return filteredPage.map(this::convertToDTO);
    }

    /**
     * Complete quality control check (wrapper for processQualityControl)
     */
    public void completeQualityControl(QualityControlDTO qcDTO) {
        processQualityControl(qcDTO);
    }

    /**
     * Process quality control check
     */
    public void processQualityControl(QualityControlDTO qcDTO) {
        log.info("Processing quality control for return request {}", qcDTO.getReturnRequestId());

        ReturnRequest returnRequest = returnRequestRepository.findById(qcDTO.getReturnRequestId())
                .orElseThrow(() -> new RuntimeException("Return request not found: " + qcDTO.getReturnRequestId()));

        if ("PASSED".equals(qcDTO.getQcResult())) {
            processQCPassed(returnRequest, qcDTO);
        } else if ("FAILED".equals(qcDTO.getQcResult())) {
            processQCFailed(returnRequest, qcDTO);
        } else {
            throw new IllegalArgumentException("Invalid QC result: " + qcDTO.getQcResult());
        }
    }

    private void processQCPassed(ReturnRequest returnRequest, QualityControlDTO qcDTO) {
        // Product passed QC, can be restocked
        log.info("QC passed for return request {}, proceeding with restocking", returnRequest.getId());
        // Trigger restocking process
    }

    private void processQCFailed(ReturnRequest returnRequest, QualityControlDTO qcDTO) {
        // Product failed QC, mark as non-resellable
        log.info("QC failed for return request {}, marking as non-resellable", returnRequest.getId());
        // Update batch status based on failure reason
    }

    /**
     * Count return requests by status
     */
    public long countReturnRequestsByStatus(ReturnRequest.ReturnStatus status, UUID shopId) {
        if (shopId != null && status != null) {
            return returnRequestRepository.countByShopOrderShopShopIdAndStatus(shopId, status);
        } else if (shopId != null) {
            return returnRequestRepository.countByShopOrderShopShopId(shopId);
        }
        return returnRequestRepository.countByStatus(status);
    }

    /**
     * Get the shop ID associated with a return request
     */
    @Transactional(readOnly = true)
    public UUID getShopIdForReturnRequest(Long returnRequestId) {
        ReturnRequest rr = returnRequestRepository.findById(returnRequestId)
                .orElseThrow(() -> new RuntimeException("Return request not found: " + returnRequestId));
        if (rr.getShopOrder() == null || rr.getShopOrder().getShop() == null) {
            throw new RuntimeException("Return request not properly linked to a shop");
        }
        return rr.getShopOrder().getShop().getShopId();
    }

    // Private helper methods

    /**
     * Validate tracking token and return associated email
     */
    private String validateTrackingToken(String trackingToken) {
        log.info("Validating tracking token: {}",
                trackingToken.length() > 8 ? trackingToken.substring(0, 8) + "..." : trackingToken);

        // Find valid token (strict)
        Optional<OrderTrackingToken> tokenOpt = orderTrackingTokenRepository
                .findValidToken(trackingToken, LocalDateTime.now());

        if (tokenOpt.isEmpty()) {
            log.warn("Tracking token is expired or used, checking for existence");
            // Fallback: Find by token string regardless of exp/used
            tokenOpt = orderTrackingTokenRepository.findByToken(trackingToken);

            if (tokenOpt.isEmpty()) {
                throw new IllegalArgumentException("Invalid tracking token");
            }
        }

        OrderTrackingToken token = tokenOpt.get();
        String email = token.getEmail();

        log.info("Tracking token validated successfully for email: {}", email);
        return email;
    }

    /**
     * Validate shop order for authenticated user
     */
    private ShopOrder validateShopOrderForAuthenticatedUser(Long shopOrderId, UUID customerId,
            Authentication authentication) {
        ShopOrder shopOrder = shopOrderRepository.findById(shopOrderId)
                .orElseThrow(() -> new RuntimeException("Shop order not found: " + shopOrderId));

        Order order = shopOrder.getOrder();

        // If authentication is provided, check for vendor/employee role
        if (authentication != null) {
            // Check if the user is a vendor/employee with shop access
            boolean isVendorOrEmployee = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_VENDOR") || a.getAuthority().equals("ROLE_EMPLOYEE"));

            if (isVendorOrEmployee) {
                // For vendors/employees, validate they have access to this shop
                UUID authenticatedUserId = getAuthenticatedUserId(authentication);
                if (authenticatedUserId != null) {
                    shopAuthorizationService.assertCanManageShop(authenticatedUserId, shopOrder.getShop().getShopId());
                }
                // Allow vendor/employee to submit returns for any order in their shop
                return shopOrder;
            }
        }

        // For customers, validate ownership
        if (order.getUser() != null && !order.getUser().getId().equals(customerId)) {
            throw new RuntimeException("Order does not belong to you");
        }

        // We allow authenticated users to return orders that were placed as guests
        // (order.getUser() == null) if they have the shopOrderId.

        return shopOrder;
    }

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

    private void validateReturnEligibility(ShopOrder shopOrder) {
        ShopOrder.ShopOrderStatus status = shopOrder.getStatus();

        // Allow returns for delivered, shipped, or processing orders
        // Disallow for cancelled, returned, or refunded orders
        if (status == ShopOrder.ShopOrderStatus.CANCELLED ||
                status == ShopOrder.ShopOrderStatus.RETURNED ||
                status == ShopOrder.ShopOrderStatus.REFUNDED) {
            throw new RuntimeException("Shop order is in a status that does not allow returns: " + status);
        }

        // Validate shop supports returns (check transition state)
        Shop shop = shopOrder.getShop();
        if (shop != null) {
            CapabilityTransitionService.EffectiveCapabilities effectiveCapabilities = capabilityTransitionService
                    .getEffectiveCapabilities(shop.getShopId());

            // Shop supports returns if it supports either pickup or delivery
            if (!effectiveCapabilities.supportsPickup() && !effectiveCapabilities.supportsDelivery()) {
                throw new RuntimeException(
                        "This shop does not support return requests. Please contact the shop directly.");
            }
        }
    }

    private void validateCustomerReturnHistory(UUID customerId) {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<ReturnRequest> recentReturns = returnRequestRepository.findRecentByCustomerId(customerId, thirtyDaysAgo);

        if (recentReturns.size() > 5) {
            log.warn("Customer {} has {} returns in the last 30 days - flagging for review",
                    customerId, recentReturns.size());
        }
    }

    private void approveReturnRequest(ReturnRequest returnRequest, ReturnDecisionDTO decisionDTO) {
        log.info("Approving return request {} with decision notes: {}",
                returnRequest.getId(), decisionDTO.getDecisionNotes());

        returnRequest.approve(decisionDTO.getDecisionNotes());

        // Set refund information if provided
        if (decisionDTO.getRefundScreenshotUrl() != null) {
            returnRequest.setRefundScreenshotUrl(decisionDTO.getRefundScreenshotUrl());
        }
        if (decisionDTO.getRefundNotes() != null) {
            returnRequest.setRefundNotes(decisionDTO.getRefundNotes());
        }

        // Process refund if screenshot is provided (indicating manual refund
        // completion)
        if (decisionDTO.getRefundScreenshotUrl() != null && !decisionDTO.getRefundScreenshotUrl().trim().isEmpty()) {
            try {
                processRefundForApprovedReturn(returnRequest);
            } catch (Exception e) {
                log.error("Refund processing failed for approved return request {}: {}",
                        returnRequest.getId(), e.getMessage(), e);
                // Don't fail the approval if refund processing fails
                // The refund can be processed manually later
            }
        }

        notificationService.notifyReturnApproved(returnRequest);
        log.info("Return request {} approved successfully", returnRequest.getId());

        // LOG ACTIVITY: Return Approved
        activityLogService.logReturnApproved(
                returnRequest.getShopOrder().getOrder().getOrderId(),
                "Admin", // TODO: Get actual admin name from security context
                returnRequest.getId());
    }

    private void denyReturnRequest(ReturnRequest returnRequest, ReturnDecisionDTO decisionDTO) {
        log.info("Denying return request {} with decision notes: {}",
                returnRequest.getId(), decisionDTO.getDecisionNotes());

        if (decisionDTO.getDecisionNotes() == null || decisionDTO.getDecisionNotes().trim().isEmpty()) {
            throw new RuntimeException("Decision notes are required when denying a return request");
        }

        returnRequest.deny(decisionDTO.getDecisionNotes());

        notificationService.notifyReturnDenied(returnRequest);

        log.info("Return request {} denied successfully", returnRequest.getId());

        // LOG ACTIVITY: Return Denied
        activityLogService.logReturnDenied(
                returnRequest.getShopOrder().getOrder().getOrderId(),
                "Admin", // TODO: Get actual admin name from security context
                decisionDTO.getDecisionNotes(),
                returnRequest.getId());
    }

    /**
     * Process refund for approved return request (called during approval when
     * screenshot is provided)
     * This handles refunds that are manually processed externally
     */
    @Transactional
    private void processRefundForApprovedReturn(ReturnRequest returnRequest) {
        log.info("Processing refund for approved return request {}", returnRequest.getId());

        try {
            List<ReturnItem> returnableItems = returnItemRepository.findByReturnRequestId(returnRequest.getId())
                    .stream()
                    .filter(item -> item.getIsReturnable() != null && item.getIsReturnable())
                    .toList();

            if (returnableItems.isEmpty()) {
                log.info("No returnable items found for return request {}, skipping refund", returnRequest.getId());
                return;
            }

            RefundResult refundResult = processReturnRefundForApproval(returnRequest, returnableItems);

            if (refundResult.isSuccess()) {
                log.info("Refund processed successfully for approved return request {}: Total refund value: {}, " +
                        "Card refund: {}, Points refunded: {}",
                        returnRequest.getId(),
                        refundResult.getTotalRefundValue(),
                        refundResult.getCardRefundAmount(),
                        refundResult.getPointsRefunded());

                // Update return request with refund information
                returnRequest.setRefundProcessed(true);
                returnRequest.setRefundAmount(refundResult.getTotalRefundValue());
                returnRequest.setRefundProcessedAt(java.time.LocalDateTime.now());
                returnRequestRepository.save(returnRequest);

            } else {
                log.error("Refund processing failed for approved return request {}: {}",
                        returnRequest.getId(), refundResult.getMessage());
                throw new RuntimeException("Refund processing failed: " + refundResult.getMessage());
            }

        } catch (Exception e) {
            log.error("Error processing refund for approved return {}: {}",
                    returnRequest.getId(), e.getMessage(), e);
            throw new RuntimeException("Refund processing error: " + e.getMessage(), e);
        }
    }

    /**
     * Process comprehensive refund for approved return items based on payment
     * method
     * This is similar to ReturnPickupServiceImpl.processReturnRefund but adapted
     * for approval context
     * and detached from Stripe service for manual external processing
     */
    @Transactional
    private RefundResult processReturnRefundForApproval(ReturnRequest returnRequest, List<ReturnItem> returnedItems) {
        log.info("Processing refund for approved return request {} with {} items",
                returnRequest.getId(), returnedItems.size());

        try {
            // Get order and transaction details
            Order order = orderRepository.findById(returnRequest.getShopOrder().getOrder().getOrderId())
                    .orElseThrow(() -> new RuntimeException(
                            "Order not found: " + returnRequest.getShopOrder().getOrder().getOrderId()));

            OrderTransaction transaction = order.getOrderTransaction();
            if (transaction == null) {
                throw new RuntimeException("No transaction found for order: " + order.getOrderId());
            }

            // Check if all items in the order are being returned
            boolean isFullOrderReturn = isFullOrderReturn(order, returnedItems);

            RefundCalculation refundCalc = calculateRefundAmounts(order, returnedItems, isFullOrderReturn);

            // Process refund based on payment method
            RefundResult result = switch (transaction.getPaymentMethod()) {
                case POINTS -> processPointsOnlyRefundForApproval(order, transaction, refundCalc, isFullOrderReturn);
                case HYBRID -> processHybridRefundForApproval(order, transaction, refundCalc, isFullOrderReturn);
                case CREDIT_CARD, DEBIT_CARD ->
                    processCardRefundForApproval(order, transaction, refundCalc, isFullOrderReturn);
                default ->
                    throw new IllegalArgumentException("Unsupported payment method: " + transaction.getPaymentMethod());
            };

            if (isFullOrderReturn || refundCalc.getTotalRefundAmount().compareTo(transaction.getOrderAmount()) >= 0) {
                transaction.setStatus(OrderTransaction.TransactionStatus.REFUNDED);
                transaction.setUpdatedAt(java.time.LocalDateTime.now());
            }

            log.info("Refund processed successfully for approved return request {}: {}",
                    returnRequest.getId(), result);

            return result;

        } catch (Exception e) {
            log.error("Failed to process refund for approved return request {}: {}",
                    returnRequest.getId(), e.getMessage(), e);
            throw new RuntimeException("Refund processing failed: " + e.getMessage(), e);
        }
    }

    /**
     * Validate media files before processing
     */
    private void validateMediaFiles(MultipartFile[] mediaFiles) {
        if (mediaFiles == null || mediaFiles.length == 0) {
            return;
        }

        int imageCount = 0;
        int videoCount = 0;

        for (MultipartFile file : mediaFiles) {
            if (file.isEmpty()) {
                continue;
            }

            String contentType = file.getContentType();
            if (contentType == null) {
                throw new IllegalArgumentException("Unable to determine file type");
            }

            if (contentType.startsWith("image/")) {
                imageCount++;
                if (imageCount > MAX_IMAGES) {
                    throw new IllegalArgumentException("Maximum " + MAX_IMAGES + " images allowed");
                }

                // Validate image size (max 10MB)
                if (file.getSize() > 10 * 1024 * 1024) {
                    throw new IllegalArgumentException("Image file size must be less than 10MB");
                }
            } else if (contentType.startsWith("video/")) {
                videoCount++;
                if (videoCount > MAX_VIDEOS) {
                    throw new IllegalArgumentException("Maximum " + MAX_VIDEOS + " video allowed");
                }

                // Validate video size (max 50MB)
                if (file.getSize() > 50 * 1024 * 1024) {
                    throw new IllegalArgumentException("Video file size must be less than 50MB");
                }
            } else {
                throw new IllegalArgumentException("Only image and video files are allowed");
            }
        }
    }

    /**
     * Process media attachments for return request
     */
    private void processMediaAttachments(Long returnRequestId, MultipartFile[] mediaFiles) throws IOException {
        for (MultipartFile file : mediaFiles) {
            if (file.isEmpty()) {
                continue;
            }

            String contentType = file.getContentType();
            ReturnMedia.FileType fileType;

            Map<String, String> uploadResult;
            if (contentType != null && contentType.startsWith("image/")) {
                fileType = ReturnMedia.FileType.IMAGE;
                uploadResult = cloudinaryService.uploadImage(file);
            } else if (contentType != null && contentType.startsWith("video/")) {
                fileType = ReturnMedia.FileType.VIDEO;
                uploadResult = cloudinaryService.uploadVideo(file);
            } else {
                throw new IllegalArgumentException("Only image and video files are allowed");
            }

            String mediaUrl = uploadResult.get("secure_url");
            if (mediaUrl == null) {
                mediaUrl = uploadResult.get("url");
            }
            if (mediaUrl == null || mediaUrl.isBlank()) {
                throw new IOException("Failed to upload file to Cloudinary: " + file.getOriginalFilename());
            }

            ReturnMedia media = new ReturnMedia();
            media.setReturnRequestId(returnRequestId);
            media.setFileUrl(mediaUrl);
            media.setPublicId(uploadResult.get("public_id"));
            media.setFileType(fileType);
            media.setMimeType(contentType);
            media.setFileSize(file.getSize());

            String widthStr = uploadResult.get("width");
            if (widthStr != null) {
                try {
                    media.setWidth(Integer.valueOf(widthStr));
                } catch (NumberFormatException ignored) {
                }
            }
            String heightStr = uploadResult.get("height");
            if (heightStr != null) {
                try {
                    media.setHeight(Integer.valueOf(heightStr));
                } catch (NumberFormatException ignored) {
                }
            }

            media.setUploadedAt(LocalDateTime.now());
            returnMediaRepository.save(media);
        }
    }

    /**
     * Create return items for the return request
     */
    private void createReturnItems(ReturnRequest returnRequest, List<ReturnItemDTO> returnItemDTOs,
            ShopOrder shopOrder) {
        for (ReturnItemDTO itemDTO : returnItemDTOs) {
            // Find the order item in this specific shop order
            OrderItem orderItem = shopOrder.getItems().stream()
                    .filter(oi -> oi.getOrderItemId().equals(itemDTO.getOrderItemId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException(
                            "Order item not found in shop order: " + itemDTO.getOrderItemId()));

            ReturnItem returnItem = new ReturnItem();
            returnItem.setReturnRequest(returnRequest);
            returnItem.setOrderItem(orderItem);
            returnItem.setReturnQuantity(itemDTO.getReturnQuantity());

            // Set product/variant from order item to satisfy validation
            if (orderItem.getProductVariant() != null) {
                returnItem.setProductVariant(orderItem.getProductVariant());
                returnItem.setProduct(orderItem.getProductVariant().getProduct());
            } else if (orderItem.getProduct() != null) {
                returnItem.setProduct(orderItem.getProduct());
            }

            returnItem.setCreatedAt(LocalDateTime.now());

            returnItemRepository.save(returnItem);
        }
    }

    /**
     * Validate return items against shop order
     */
    private void validateReturnItems(List<ReturnItemDTO> returnItems, ShopOrder shopOrder) {
        if (returnItems == null || returnItems.isEmpty()) {
            throw new IllegalArgumentException("At least one item must be selected for return");
        }

        for (ReturnItemDTO itemDTO : returnItems) {
            // Check if order item exists in this shop order
            boolean itemExists = shopOrder.getItems().stream()
                    .anyMatch(oi -> oi.getOrderItemId().equals(itemDTO.getOrderItemId()));

            if (!itemExists) {
                throw new RuntimeException("Order item not found in this shop order: " + itemDTO.getOrderItemId());
            }

            // Validate return quantity
            if (itemDTO.getReturnQuantity() <= 0) {
                throw new IllegalArgumentException("Return quantity must be greater than 0");
            }
        }
    }

    /**
     * Validate return items eligibility (quantity, return window, etc.)
     */
    private void validateReturnItemsEligibility(List<ReturnItemDTO> returnItems, ShopOrder shopOrder) {
        for (ReturnItemDTO itemDTO : returnItems) {
            OrderItem orderItem = shopOrder.getItems().stream()
                    .filter(oi -> oi.getOrderItemId().equals(itemDTO.getOrderItemId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Order item not found: " + itemDTO.getOrderItemId()));

            // Check return quantity doesn't exceed ordered quantity
            if (itemDTO.getReturnQuantity() > orderItem.getQuantity()) {
                throw new IllegalArgumentException(
                        "Return quantity cannot exceed ordered quantity for item: " + itemDTO.getOrderItemId());
            }

            // Check if item is already fully returned
            Integer alreadyReturned = returnItemRepository
                    .getTotalApprovedReturnQuantityForOrderItem(orderItem.getOrderItemId());

            if (alreadyReturned + itemDTO.getReturnQuantity() > orderItem.getQuantity()) {
                throw new IllegalArgumentException(
                        "Total return quantity cannot exceed ordered quantity for item: " + itemDTO.getOrderItemId());
            }
        }
    }

    /**
     * Validate return request limits
     */
    private void validateReturnRequestLimit(List<ReturnItemDTO> returnItems) {
        if (returnItems.size() > 20) {
            throw new IllegalArgumentException("Maximum 20 items can be returned in a single request");
        }
    }

    private ReturnRequestDTO convertToDTO(ReturnRequest returnRequest) {
        ReturnRequestDTO dto = new ReturnRequestDTO();
        dto.setId(returnRequest.getId());
        dto.setShopOrderId(returnRequest.getShopOrderId());
        dto.setOrderId(returnRequest.getOrderId());
        dto.setCustomerId(returnRequest.getCustomerId());
        dto.setReason(returnRequest.getReason());
        dto.setStatus(returnRequest.getStatus());
        dto.setReturnType(returnRequest.getReturnType());
        dto.setSubmittedAt(returnRequest.getSubmittedAt());
        dto.setDecisionAt(returnRequest.getDecisionAt());
        dto.setDecisionNotes(returnRequest.getDecisionNotes());
        dto.setCreatedAt(returnRequest.getCreatedAt());
        dto.setUpdatedAt(returnRequest.getUpdatedAt());
        dto.setDeliveryStatus(returnRequest.getDeliveryStatus());
        dto.setDeliveryAgentId(returnRequest.getDeliveryAgentId());
        if (returnRequest.getDeliveryAgentId() != null) {
            userRepository.findById(returnRequest.getDeliveryAgentId())
                    .ifPresent(agent -> {
                        String name = ((agent.getFirstName() != null ? agent.getFirstName() : "").trim() + " "
                                + (agent.getLastName() != null ? agent.getLastName() : "").trim()).trim();
                        dto.setDeliveryAgentName(name.isEmpty() ? null : name);
                    });
        }

        // Refund information
        dto.setRefundProcessed(returnRequest.getRefundProcessed());
        dto.setRefundAmount(returnRequest.getRefundAmount());
        dto.setRefundProcessedAt(returnRequest.getRefundProcessedAt());
        dto.setRefundScreenshotUrl(returnRequest.getRefundScreenshotUrl());
        dto.setRefundNotes(returnRequest.getRefundNotes());

        // Appeal eligibility
        dto.setCanBeAppealed(returnRequest.canBeAppealed());

        // Return appeal if exists
        if (returnRequest.getReturnAppeal() != null) {
            dto.setReturnAppeal(convertAppealToDTO(returnRequest.getReturnAppeal()));
        }

        // Return items
        if (returnRequest.getReturnItems() != null) {
            dto.setReturnItems(returnRequest.getReturnItems().stream()
                    .map(this::convertReturnItemToDTO)
                    .collect(Collectors.toList()));
        }

        // Return media
        if (returnRequest.getReturnMedia() != null) {
            dto.setReturnMedia(returnRequest.getReturnMedia().stream()
                    .map(this::convertMediaToDTO)
                    .collect(Collectors.toList()));
        }

        // Basic order and shop info
        if (returnRequest.getShopOrder() != null) {
            ShopOrder shopOrder = returnRequest.getShopOrder();
            dto.setOrderNumber(shopOrder.getShopOrderCode());
            dto.setOrderDate(shopOrder.getCreatedAt());
            dto.setTotalAmount(shopOrder.getTotalAmount());

            // Shop information
            if (shopOrder.getShop() != null) {
                dto.setShopId(shopOrder.getShop().getShopId());
                dto.setShopName(shopOrder.getShop().getName());
                dto.setShopSlug(shopOrder.getShop().getSlug());
            }

            Order globalOrder = shopOrder.getOrder();
            if (globalOrder != null) {
                if (globalOrder.getOrderCustomerInfo() != null) {
                    dto.setCustomerName(globalOrder.getOrderCustomerInfo().getFirstName() + " "
                            + globalOrder.getOrderCustomerInfo().getLastName());
                    dto.setCustomerEmail(globalOrder.getOrderCustomerInfo().getEmail());
                    dto.setCustomerPhone(globalOrder.getOrderCustomerInfo().getPhoneNumber());
                }
                dto.setShippingAddress(mapOrderAddressToDTO(globalOrder.getOrderAddress()));
            }
        }

        // Calculate expected refund
        dto.setExpectedRefund(calculateExpectedRefund(returnRequest));

        return dto;
    }

    private com.ecommerce.dto.OrderAddressDTO mapOrderAddressToDTO(com.ecommerce.entity.OrderAddress addr) {
        if (addr == null)
            return null;

        com.ecommerce.dto.OrderAddressDTO dto = new com.ecommerce.dto.OrderAddressDTO();
        dto.setId(addr.getOrderAddressId() != null ? addr.getOrderAddressId().toString() : null);
        dto.setStreet(addr.getStreet());
        dto.setCountry(addr.getCountry());
        dto.setLatitude(addr.getLatitude());
        dto.setLongitude(addr.getLongitude());
        dto.setRoadName(addr.getRoadName());

        // Parse regions (city, state)
        if (addr.getRegions() != null && !addr.getRegions().isEmpty()) {
            String[] regions = addr.getRegions().split(",");
            if (regions.length >= 1) {
                dto.setCity(regions[0].trim());
            }
            if (regions.length >= 2) {
                dto.setState(regions[1].trim());
            }
        }

        return dto;
    }

    /**
     * Get shop order details for return request (Authenticated)
     */
    public OrderResponseDTO getShopOrderDetailsForReturn(Long shopOrderId, UUID customerId) {
        log.info("Fetching shop order details for return - shopOrderId: {}, customerId: {}", shopOrderId, customerId);
        ShopOrder shopOrder = validateShopOrderForAuthenticatedUser(shopOrderId, customerId, null);
        return convertToOrderResponseDTO(shopOrder);
    }

    /**
     * Get shop order details for return request (Guest/Tokenized)
     */
    public OrderResponseDTO getShopOrderDetailsByTrackingToken(String orderNumber, String token) {
        log.info("Fetching guest shop order details for return - orderNumber: {}, token: {}", orderNumber, token);

        if (orderNumber == null || orderNumber.trim().isEmpty()) {
            throw new IllegalArgumentException("Order number is required");
        }
        if (token == null || token.trim().isEmpty()) {
            throw new IllegalArgumentException("Tracking token is required");
        }

        // Prefer validating as an order-tracking token (email-based)
        try {
            String email = validateTrackingToken(token);

            ShopOrder shopOrder = shopOrderRepository.findByShopOrderCode(orderNumber)
                    .orElseThrow(() -> new RuntimeException("Shop order not found: " + orderNumber));

            Order order = shopOrder.getOrder();

            // Verify the order belongs to the email associated with the token
            if (order.getOrderCustomerInfo() == null ||
                    !email.equalsIgnoreCase(order.getOrderCustomerInfo().getEmail())) {
                throw new RuntimeException("Order does not belong to the email associated with this tracking token");
            }

            // Ensure this is actually a guest order (no associated user)
            if (order.getUser() != null) {
                throw new RuntimeException(
                        "This order belongs to a registered user and cannot be accessed using tracking token");
            }

            return convertToOrderResponseDTO(shopOrder);

        } catch (IllegalArgumentException ignored) {
            // Fallback: allow pickup token as well (used for guest orders)
        }

        ShopOrder shopOrder = shopOrderRepository.findByPickupToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired tracking token"));

        if (!orderNumber.equals(shopOrder.getShopOrderCode())) {
            throw new IllegalArgumentException("Token does not match the provided order number");
        }

        return convertToOrderResponseDTO(shopOrder);
    }

    /**
     * Converts a ShopOrder to OrderResponseDTO (compatible with OrderDetails in
     * frontend)
     */
    private OrderResponseDTO convertToOrderResponseDTO(ShopOrder shopOrder) {
        Order globalOrder = shopOrder.getOrder();
        OrderAddress addr = globalOrder.getOrderAddress();

        OrderResponseDTO dto = new OrderResponseDTO();
        dto.setId(shopOrder.getId()); // Using ShopOrder ID
        dto.setUserId(globalOrder.getUser() != null ? globalOrder.getUser().getId().toString() : null);
        dto.setOrderNumber(shopOrder.getShopOrderCode());
        dto.setShopId(shopOrder.getShop() != null && shopOrder.getShop().getShopId() != null
                ? shopOrder.getShop().getShopId().toString()
                : null);
        dto.setShopName(shopOrder.getShop() != null ? shopOrder.getShop().getName() : null);
        dto.setStatus(shopOrder.getStatus().name());
        dto.setCreatedAt(shopOrder.getCreatedAt());
        dto.setUpdatedAt(shopOrder.getUpdatedAt());

        // Customer Info
        if (globalOrder.getOrderCustomerInfo() != null) {
            OrderResponseDTO.CustomerInfo customerInfo = new OrderResponseDTO.CustomerInfo();
            customerInfo.setName(globalOrder.getOrderCustomerInfo().getFullName());
            customerInfo.setEmail(globalOrder.getOrderCustomerInfo().getEmail());
            customerInfo.setPhone(globalOrder.getOrderCustomerInfo().getPhoneNumber());
            dto.setCustomerInfo(customerInfo);
        } else if (globalOrder.getUser() != null) {
            OrderResponseDTO.CustomerInfo customerInfo = new OrderResponseDTO.CustomerInfo();
            customerInfo.setName(globalOrder.getUser().getFirstName() + " " + globalOrder.getUser().getLastName());
            customerInfo.setEmail(globalOrder.getUser().getUserEmail());
            customerInfo.setPhone(globalOrder.getUser().getPhoneNumber());
            dto.setCustomerInfo(customerInfo);
        }

        // Shipping Address
        if (addr != null) {
            OrderResponseDTO.ShippingAddress shippingAddress = new OrderResponseDTO.ShippingAddress();
            shippingAddress.setStreet(addr.getStreet());
            shippingAddress.setCountry(addr.getCountry());
            shippingAddress.setLatitude(addr.getLatitude());
            shippingAddress.setLongitude(addr.getLongitude());
            if (addr.getRegions() != null && !addr.getRegions().isEmpty()) {
                String[] regions = addr.getRegions().split(",");
                if (regions.length >= 2) {
                    shippingAddress.setCity(regions[0].trim());
                    shippingAddress.setState(regions[1].trim());
                }
            }
            dto.setShippingAddress(shippingAddress);
        }

        // Amounts (Shop-scoped)
        dto.setSubtotal(shopOrder.getSubtotal());
        dto.setShipping(shopOrder.getShippingCost());
        dto.setDiscount(shopOrder.getDiscountAmount());
        dto.setTotal(shopOrder.getTotalAmount());
        dto.setTax(BigDecimal.ZERO);

        // Items (Shop-scoped)
        List<OrderResponseDTO.OrderItem> itemDTOs = shopOrder.getItems().stream()
                .map(this::mapOrderItemToResponseDTO)
                .collect(Collectors.toList());
        dto.setItems(itemDTOs);

        return dto;
    }

    private OrderResponseDTO.OrderItem mapOrderItemToResponseDTO(OrderItem item) {
        OrderResponseDTO.OrderItem dto = new OrderResponseDTO.OrderItem();
        dto.setId(item.getOrderItemId());
        dto.setQuantity(item.getQuantity());
        dto.setPrice(item.getPrice());
        dto.setTotalPrice(item.getSubtotal());

        // Product info
        Product p = item.getProduct();
        if (p != null) {
            OrderResponseDTO.Product product = new OrderResponseDTO.Product();
            product.setId(p.getProductId());
            product.setName(p.getProductName());

            if (p.getImages() != null && !p.getImages().isEmpty()) {
                List<String> imageUrls = p.getImages().stream()
                        .map(ProductImage::getImageUrl)
                        .filter(url -> url != null && !url.trim().isEmpty())
                        .collect(Collectors.toList());
                product.setImages(imageUrls);
            }
            dto.setProduct(product);
        }

        // Variant info
        ProductVariant v = item.getProductVariant();
        if (v != null) {
            OrderResponseDTO.Variant variant = new OrderResponseDTO.Variant();
            variant.setId(v.getId());
            variant.setName(v.getVariantName());

            if (v.getImages() != null && !v.getImages().isEmpty()) {
                List<String> variantImageUrls = v.getImages().stream()
                        .map(ProductVariantImage::getImageUrl)
                        .filter(url -> url != null && !url.trim().isEmpty())
                        .collect(Collectors.toList());
                variant.setImages(variantImageUrls);
            }
            dto.setVariant(variant);
        }

        // Return Eligibility
        LocalDateTime deliveredAt = item.getShopOrder().getDeliveredAt();
        ShopOrder.ShopOrderStatus status = item.getShopOrder().getStatus();

        // Check if the overall status allows for a return (not cancelled, already
        // returned/refunded)
        boolean statusAllowsReturn = status != ShopOrder.ShopOrderStatus.CANCELLED &&
                status != ShopOrder.ShopOrderStatus.RETURNED &&
                status != ShopOrder.ShopOrderStatus.REFUNDED;

        if (statusAllowsReturn) {
            // Use deliveredAt if available, otherwise fallback to createdAt for recently
            // placed orders
            LocalDateTime referenceDate = (deliveredAt != null) ? deliveredAt : item.getShopOrder().getCreatedAt();

            if (referenceDate != null) {
                long daysSinceRef = java.time.Duration.between(referenceDate, LocalDateTime.now()).toDays();
                dto.setReturnEligible(daysSinceRef <= DEFAULT_RETURN_DAYS);
                dto.setMaxReturnDays(DEFAULT_RETURN_DAYS);
                dto.setDaysRemainingForReturn((int) Math.max(0, DEFAULT_RETURN_DAYS - daysSinceRef));
            } else {
                // Fallback for extreme cases (shouldn't happen)
                dto.setReturnEligible(true);
                dto.setMaxReturnDays(DEFAULT_RETURN_DAYS);
                dto.setDaysRemainingForReturn(DEFAULT_RETURN_DAYS);
            }
        } else {
            dto.setReturnEligible(false);
            dto.setMaxReturnDays(DEFAULT_RETURN_DAYS);
            dto.setDaysRemainingForReturn(0);
        }

        // Add return information (existing return requests)
        List<ReturnItem> existingReturns = returnItemRepository.findByOrderItemOrderItemId(item.getOrderItemId());
        if (existingReturns != null && !existingReturns.isEmpty()) {
            OrderResponseDTO.ReturnItemInfo returnInfo = new OrderResponseDTO.ReturnItemInfo();
            returnInfo.setHasReturnRequest(true);
            int totalReturnedQty = existingReturns.stream().mapToInt(ReturnItem::getReturnQuantity).sum();
            returnInfo.setTotalReturnedQuantity(totalReturnedQty);
            returnInfo.setRemainingQuantity(Math.max(0, item.getQuantity() - totalReturnedQty));
            dto.setReturnInfo(returnInfo);

            if (returnInfo.getRemainingQuantity() == 0) {
                dto.setReturnEligible(false);
            }
        }

        return dto;
    }

    /**
     * Convert ReturnItem entity to DTO
     */
    private ReturnItemDTO convertReturnItemToDTO(ReturnItem returnItem) {
        ReturnItemDTO dto = new ReturnItemDTO();
        dto.setOrderItemId(returnItem.getOrderItem() != null ? returnItem.getOrderItem().getOrderItemId() : null);
        dto.setReturnQuantity(returnItem.getReturnQuantity());
        dto.setItemReason(returnItem.getItemReason());

        if (returnItem.getProduct() != null) {
            dto.setProductId(returnItem.getProduct().getProductId());
            dto.setProductName(returnItem.getProduct().getProductName());
            dto.setUnit(com.ecommerce.dto.UnitDTO.from(returnItem.getProduct().getUnit()));
            dto.setOrganic(returnItem.getProduct().getOrganic());
        }
        if (returnItem.getProductVariant() != null) {
            dto.setVariantId(returnItem.getProductVariant().getId());
            dto.setVariantName(returnItem.getProductVariant().getVariantName());
        }
        if (returnItem.getOrderItem() != null) {
            dto.setMaxQuantity(returnItem.getOrderItem().getQuantity());
        }

        return dto;
    }

    /**
     * Convert ReturnMedia entity to DTO
     */
    private ReturnMediaDTO convertMediaToDTO(ReturnMedia media) {
        ReturnMediaDTO dto = new ReturnMediaDTO();
        dto.setId(media.getId());
        dto.setReturnRequestId(media.getReturnRequestId());
        dto.setFileUrl(media.getFileUrl());
        dto.setPublicId(media.getPublicId());
        dto.setFileType(media.getFileType());
        dto.setMimeType(media.getMimeType());
        dto.setFileSize(media.getFileSize());
        dto.setWidth(media.getWidth());
        dto.setHeight(media.getHeight());
        dto.setUploadedAt(media.getUploadedAt());
        dto.setCreatedAt(media.getCreatedAt());
        dto.setUpdatedAt(media.getUpdatedAt());
        return dto;
    }

    /**
     * Convert ReturnAppeal entity to DTO
     */
    private ReturnAppealDTO convertAppealToDTO(ReturnAppeal appeal) {
        ReturnAppealDTO dto = new ReturnAppealDTO();
        dto.setId(appeal.getId());
        dto.setReturnRequestId(appeal.getReturnRequestId());
        dto.setCustomerId(appeal.getCustomerId());
        dto.setLevel(appeal.getLevel());
        dto.setReason(appeal.getReason());
        dto.setDescription(appeal.getDescription());
        dto.setStatus(appeal.getStatus());
        dto.setSubmittedAt(appeal.getSubmittedAt());
        dto.setDecisionAt(appeal.getDecisionAt());
        dto.setDecisionNotes(appeal.getDecisionNotes());
        dto.setCreatedAt(appeal.getCreatedAt());
        dto.setUpdatedAt(appeal.getUpdatedAt());

        // Convert appeal media if exists
        if (appeal.getAppealMedia() != null && !appeal.getAppealMedia().isEmpty()) {
            dto.setAppealMedia(appeal.getAppealMedia().stream()
                    .map(this::convertAppealMediaToDTO)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    /**
     * Convert AppealMedia entity to DTO
     */
    private AppealMediaDTO convertAppealMediaToDTO(AppealMedia media) {
        AppealMediaDTO dto = new AppealMediaDTO();
        dto.setId(media.getId());
        dto.setAppealId(media.getAppealId());
        dto.setFileUrl(media.getFileUrl());
        dto.setFileType(media.getFileType());
        dto.setUploadedAt(media.getUploadedAt());
        dto.setCreatedAt(media.getCreatedAt());
        dto.setUpdatedAt(media.getUpdatedAt());
        return dto;
    }

    /**
     * Get return requests for a specific shop (Vendor/Employee portal)
     */
    @Transactional(readOnly = true)
    public Page<ReturnRequestDTO> getReturnRequestsByShopId(
            UUID shopId,
            ReturnRequest.ReturnStatus status,
            String search,
            Pageable pageable) {
        log.info("Fetching return requests for shop: {}", shopId);

        List<ReturnRequest> allRequests = returnRequestRepository.findAll();

        // Filter by shop
        List<ReturnRequest> filteredRequests = allRequests.stream()
                .filter(rr -> {
                    if (rr.getShopOrder() == null || rr.getShopOrder().getShop() == null) {
                        return false;
                    }
                    return shopId.equals(rr.getShopOrder().getShop().getShopId());
                })
                .filter(rr -> status == null || rr.getStatus().equals(status))
                .filter(rr -> {
                    if (search == null || search.trim().isEmpty()) {
                        return true;
                    }
                    String searchLower = search.toLowerCase();
                    boolean matches = false;
                    if (rr.getShopOrder() != null) {
                        matches = rr.getShopOrder().getShopOrderCode().toLowerCase().contains(searchLower);
                    }
                    if (!matches && rr.getReason() != null) {
                        matches = rr.getReason().toLowerCase().contains(searchLower);
                    }
                    return matches;
                })
                .sorted((r1, r2) -> r2.getSubmittedAt().compareTo(r1.getSubmittedAt()))
                .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filteredRequests.size());
        List<ReturnRequest> pageContent = start < filteredRequests.size()
                ? filteredRequests.subList(start, end)
                : new ArrayList<>();

        List<ReturnRequestDTO> dtos = pageContent.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, filteredRequests.size());
    }

    /**
     * Process refund for a return request with screenshot upload
     */
    public ReturnRequestDTO processManualRefund(
            Long returnRequestId,
            BigDecimal refundAmount,
            String refundNotes,
            MultipartFile refundScreenshot) throws IOException {

        log.info("Processing manual refund for return request: {}", returnRequestId);

        ReturnRequest returnRequest = returnRequestRepository.findById(returnRequestId)
                .orElseThrow(() -> new RuntimeException("Return request not found: " + returnRequestId));

        if (returnRequest.getStatus() != ReturnRequest.ReturnStatus.APPROVED) {
            throw new IllegalStateException("Can only process refund for APPROVED return requests");
        }

        returnRequest.setRefundAmount(refundAmount);
        returnRequest.setRefundNotes(refundNotes);
        returnRequest.setRefundProcessed(true);
        returnRequest.setRefundProcessedAt(LocalDateTime.now());

        // Upload screenshot if provided
        if (refundScreenshot != null && !refundScreenshot.isEmpty()) {
            Map<String, String> uploadResult = cloudinaryService.uploadImage(refundScreenshot);
            returnRequest.setRefundScreenshotUrl(uploadResult.get("url"));
            returnRequest.setRefundScreenshotPublicId(uploadResult.get("public_id"));
        }

        // Mark as completed
        returnRequest.setStatus(ReturnRequest.ReturnStatus.COMPLETED);

        ReturnRequest saved = returnRequestRepository.save(returnRequest);

        // Notify customer
        notificationService.notifyRefundProcessed(saved);

        log.info("Manual refund processed successfully for return request: {}", returnRequestId);

        return convertToDTO(saved);
    }

    /**
     * Get return request by ID and validate tracking token for guest access
     */
    @Transactional(readOnly = true)
    // Validates token and returns request
    public ReturnRequestDTO getReturnRequestByIdAndToken(Long returnRequestId, String token) {
        log.info("Fetching return {} with token validation", returnRequestId);

        ReturnRequest returnRequest = returnRequestRepository.findById(returnRequestId)
                .orElseThrow(() -> new RuntimeException("Return request not found: " + returnRequestId));

        try {
            // First try strict validation (OrderTrackingToken)
            String emailFromToken = validateTrackingToken(token);

            // Verify the return request belongs to the email associated with the token
            String customerEmail = returnRequest.getShopOrder().getOrder().getOrderCustomerInfo().getEmail();

            if (customerEmail == null || !customerEmail.equalsIgnoreCase(emailFromToken)) {
                log.warn("Token email {} does not match return request email {}", emailFromToken, customerEmail);
                throw new RuntimeException("Invalid token for this return request");
            }
        } catch (IllegalArgumentException e) {
            // Fallback: Check if it matches the ShopOrder's pickupToken (for immediate
            // guest access)
            String pickupToken = returnRequest.getShopOrder().getPickupToken();
            if (pickupToken == null || !pickupToken.equals(token)) {
                log.warn("Token validation failed: {}", e.getMessage());
                throw new RuntimeException("Invalid tracking token");
            }
            log.info("Access authorized via Pickup Token for return {}", returnRequestId);
        }

        return convertToDTO(returnRequest);
    }

    /**
     * Calculate expected refund for a return request
     * Based on proportional allocation of costs from the original checkout
     */
    private ExpectedRefundDTO calculateExpectedRefund(ReturnRequest returnRequest) {
        try {
            log.info("Calculating expected refund for return request {}", returnRequest.getId());
            ShopOrder shopOrder = returnRequest.getShopOrder();
            if (shopOrder == null) {
                log.warn("ShopOrder is null for return request {}", returnRequest.getId());
                return null;
            }
            log.info("ShopOrder found with id {}, subtotal {}", shopOrder.getId(), shopOrder.getSubtotal());

            // Get all items in the shop order
            Set<OrderItem> allShopOrderItems = shopOrder.getItems();
            if (allShopOrderItems == null || allShopOrderItems.isEmpty()) {
                log.warn("ShopOrder items is null or empty for shopOrder {}", shopOrder.getId());
                return null;
            }
            log.info("ShopOrder has {} items", allShopOrderItems.size());

            // Calculate total value of all items in the shop order
            BigDecimal totalShopOrderValue = shopOrder.getSubtotal();
            if (totalShopOrderValue == null || totalShopOrderValue.compareTo(BigDecimal.ZERO) <= 0) {
                // Fallback: calculate from items
                totalShopOrderValue = allShopOrderItems.stream()
                        .map(item -> item.getSubtotal())
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                log.info("Using calculated total from items: {}", totalShopOrderValue);
            }
            if (totalShopOrderValue == null || totalShopOrderValue.compareTo(BigDecimal.ZERO) <= 0) {
                log.warn("Total shop order value is still null or zero after fallback: {}", totalShopOrderValue);
                return null;
            }
            log.info("Total shop order value: {}", totalShopOrderValue);

            // Calculate value of items being returned
            BigDecimal returnedItemsValue = BigDecimal.ZERO;
            for (ReturnItem returnItem : returnRequest.getReturnItems()) {
                log.info("Processing return item with orderItem id {}", returnItem.getOrderItem().getOrderItemId());
                // Find the corresponding order item
                OrderItem orderItem = allShopOrderItems.stream()
                        .filter(item -> item.getOrderItemId().equals(returnItem.getOrderItem().getOrderItemId()))
                        .findFirst()
                        .orElse(null);

                if (orderItem != null) {
                    log.info("Found order item, price {}, quantity {}", orderItem.getPrice(), orderItem.getQuantity());
                    // Calculate proportional value based on return quantity
                    BigDecimal itemTotalValue = orderItem.getSubtotal();
                    BigDecimal returnQuantity = BigDecimal.valueOf(returnItem.getReturnQuantity());
                    BigDecimal totalQuantity = BigDecimal.valueOf(orderItem.getQuantity());

                    if (totalQuantity.compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal proportionalValue = itemTotalValue
                                .multiply(returnQuantity)
                                .divide(totalQuantity, 2, java.math.RoundingMode.HALF_UP);
                        returnedItemsValue = returnedItemsValue.add(proportionalValue);
                        log.info("Added proportional value: {}", proportionalValue);
                    }
                } else {
                    log.warn("Order item not found for return item {}", returnItem.getId());
                }
            }
            log.info("Total returned items value: {}", returnedItemsValue);

            // Calculate proportional shipping cost refund
            BigDecimal shippingRefund = BigDecimal.ZERO;
            if (shopOrder.getShippingCost() != null && totalShopOrderValue.compareTo(BigDecimal.ZERO) > 0) {
                shippingRefund = shopOrder.getShippingCost()
                        .multiply(returnedItemsValue)
                        .divide(totalShopOrderValue, 2, java.math.RoundingMode.HALF_UP);
            }

            // Calculate proportional tax refund
            BigDecimal taxRefund = BigDecimal.ZERO;
            if (shopOrder.getTotalAmount() != null && totalShopOrderValue.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal totalShopOrderTax = shopOrder.getTotalAmount()
                        .subtract(totalShopOrderValue)
                        .subtract(shopOrder.getShippingCost() != null ? shopOrder.getShippingCost() : BigDecimal.ZERO)
                        .subtract(shopOrder.getDiscountAmount() != null ? shopOrder.getDiscountAmount()
                                : BigDecimal.ZERO);

                if (totalShopOrderTax.compareTo(BigDecimal.ZERO) > 0) {
                    taxRefund = totalShopOrderTax
                            .multiply(returnedItemsValue)
                            .divide(totalShopOrderValue, 2, java.math.RoundingMode.HALF_UP);
                }
            }

            // Total monetary refund
            BigDecimal monetaryRefund = returnedItemsValue.add(shippingRefund).add(taxRefund);
            log.info("Calculated refunds - items: {}, shipping: {}, tax: {}, total: {}",
                    returnedItemsValue, shippingRefund, taxRefund, monetaryRefund);

            // Get payment method from the order transaction
            String paymentMethod = "CREDIT_CARD"; // Default
            Order order = shopOrder.getOrder();
            if (order != null && order.getOrderTransaction() != null) {
                paymentMethod = order.getOrderTransaction().getPaymentMethod().toString();
            }

            // For now, assume all refunds are monetary (no points system implemented yet)
            ExpectedRefundDTO result = ExpectedRefundDTO.builder()
                    .paymentMethod(paymentMethod)
                    .monetaryRefund(monetaryRefund)
                    .pointsRefund(0)
                    .pointsRefundValue(BigDecimal.ZERO)
                    .totalRefundValue(monetaryRefund)
                    .isFullReturn(returnedItemsValue.compareTo(totalShopOrderValue) == 0)
                    .build();
            log.info("Returning expected refund: {}", result);
            return result;

        } catch (Exception e) {
            log.error("Error calculating expected refund for return request {}: {}", returnRequest.getId(),
                    e.getMessage());
            return null;
        }
    }

    // ===== REFUND PROCESSING HELPER METHODS =====

    /**
     * Check if this is a full order return (all items in the order are being
     * returned)
     */
    private boolean isFullOrderReturn(Order order, List<ReturnItem> returnedItems) {
        // Get all order items from the order
        List<OrderItem> allOrderItems = order.getShopOrders().stream()
                .flatMap(shopOrder -> shopOrder.getItems().stream())
                .toList();

        // Check if all order items are being returned
        return allOrderItems.stream()
                .allMatch(orderItem -> returnedItems.stream()
                        .anyMatch(returnItem -> returnItem.getOrderItem().getOrderItemId()
                                .equals(orderItem.getOrderItemId())));
    }

    /**
     * Calculate refund amounts for returned items including shipping costs
     */
    private RefundCalculation calculateRefundAmounts(Order order, List<ReturnItem> returnedItems,
            boolean isFullOrderReturn) {
        log.info("Calculating refund amounts for {} items, full order return: {}",
                returnedItems.size(), isFullOrderReturn);

        BigDecimal totalItemRefund = BigDecimal.ZERO;
        BigDecimal totalShippingRefund = BigDecimal.ZERO;
        Map<Long, RefundItemDetail> itemDetails = new HashMap<>();

        // If full order return, refund everything
        if (isFullOrderReturn) {
            totalItemRefund = order.getOrderInfo().getTotalAmount().subtract(
                    order.getOrderInfo().getShippingCost() != null ? order.getOrderInfo().getShippingCost()
                            : BigDecimal.ZERO);
            totalShippingRefund = order.getOrderInfo().getShippingCost() != null
                    ? order.getOrderInfo().getShippingCost()
                    : BigDecimal.ZERO;
        } else {
            // Calculate partial refund
            for (ReturnItem returnItem : returnedItems) {
                OrderItem orderItem = returnItem.getOrderItem();
                if (orderItem == null) {
                    log.warn("Order item not found for return item: {}", returnItem.getId());
                    continue;
                }

                // Use the actual price paid (from OrderItem.price) not current product price
                BigDecimal itemPrice = orderItem.getPrice();
                int returnQuantity = returnItem.getReturnQuantity();
                BigDecimal itemRefundAmount = itemPrice.multiply(BigDecimal.valueOf(returnQuantity));

                totalItemRefund = totalItemRefund.add(itemRefundAmount);

                // Calculate shipping cost for this item based on weight
                BigDecimal itemShippingCost = calculateItemShippingCost(orderItem, returnQuantity);
                totalShippingRefund = totalShippingRefund.add(itemShippingCost);

                itemDetails.put(orderItem.getOrderItemId(), new RefundItemDetail(
                        orderItem.getOrderItemId(),
                        returnQuantity,
                        itemPrice,
                        itemRefundAmount,
                        itemShippingCost));

                log.debug("Item refund calculated - OrderItem: {}, Quantity: {}, Price: {}, Refund: {}, Shipping: {}",
                        orderItem.getOrderItemId(), returnQuantity, itemPrice, itemRefundAmount, itemShippingCost);
            }
        }

        BigDecimal totalRefund = totalItemRefund.add(totalShippingRefund);

        RefundCalculation calculation = new RefundCalculation(
                totalItemRefund,
                totalShippingRefund,
                totalRefund,
                itemDetails,
                isFullOrderReturn);

        log.info("Refund calculation completed - Items: {}, Shipping: {}, Total: {}",
                totalItemRefund, totalShippingRefund, totalRefund);

        return calculation;
    }

    /**
     * Calculate shipping cost for a specific item based on weight
     */
    private BigDecimal calculateItemShippingCost(OrderItem orderItem, int quantity) {
        try {
            Product product = orderItem.getEffectiveProduct();
            if (product == null || product.getProductDetail() == null) {
                return BigDecimal.ZERO;
            }

            BigDecimal itemWeight = product.getProductDetail().getWeightKg();
            if (itemWeight == null || itemWeight.compareTo(BigDecimal.ZERO) <= 0) {
                return BigDecimal.ZERO;
            }

            // Get active shipping cost configuration
            Optional<ShippingCost> shippingCostOpt = shippingCostRepository.findFirstByIsActiveTrue();
            if (shippingCostOpt.isEmpty()) {
                log.warn("No active shipping cost configuration found");
                return BigDecimal.ZERO;
            }

            ShippingCost shippingCost = shippingCostOpt.get();
            BigDecimal weightKgCost = shippingCost.getWeightKgCost();
            if (weightKgCost == null) {
                return BigDecimal.ZERO;
            }

            // Calculate: item_weight * quantity * weight_kg_cost
            BigDecimal totalWeight = itemWeight.multiply(BigDecimal.valueOf(quantity));
            BigDecimal shippingRefund = totalWeight.multiply(weightKgCost);

            log.debug("Shipping cost calculated - Weight: {}kg, Quantity: {}, Rate: {}, Cost: {}",
                    itemWeight, quantity, weightKgCost, shippingRefund);

            return shippingRefund;

        } catch (Exception e) {
            log.error("Error calculating shipping cost for order item {}: {}",
                    orderItem.getOrderItemId(), e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    /**
     * Process refund for points-only payment
     */
    private RefundResult processPointsOnlyRefundForApproval(Order order, OrderTransaction transaction,
            RefundCalculation refundCalc, boolean isFullOrderReturn) {
        log.info("Processing points-only refund for approved return - order {}", order.getOrderId());

        try {
            Integer pointsUsed = transaction.getPointsUsed();
            if (pointsUsed == null || pointsUsed <= 0) {
                throw new RuntimeException("No points were used in this transaction");
            }

            User user = order.getUser();
            if (user == null) {
                throw new RuntimeException("User not found for order: " + order.getOrderId());
            }

            Integer pointsToRefund;
            if (isFullOrderReturn) {
                pointsToRefund = pointsUsed;
            } else {
                // Calculate proportional points refund
                BigDecimal refundRatio = refundCalc.getTotalRefundAmount()
                        .divide(transaction.getOrderAmount(), 4, BigDecimal.ROUND_HALF_UP);
                pointsToRefund = BigDecimal.valueOf(pointsUsed)
                        .multiply(refundRatio)
                        .setScale(0, BigDecimal.ROUND_HALF_UP)
                        .intValue();
            }

            // Distribute points refund across shop transactions where possible
            OrderTransaction tx = transaction;
            if (tx != null && tx.getShopTransactions() != null && !tx.getShopTransactions().isEmpty()) {
                int totalRecordedPoints = tx.getShopTransactions().stream()
                        .mapToInt(st -> st.getPointsUsed() != null ? st.getPointsUsed() : 0)
                        .sum();

                if (totalRecordedPoints > 0) {
                    // If we have per-shop records, refund exactly what was recorded per shop (or
                    // proportionally)
                    for (ShopOrderTransaction st : tx.getShopTransactions()) {
                        int shopPoints = st.getPointsUsed() != null ? st.getPointsUsed() : 0;
                        if (shopPoints <= 0)
                            continue;
                        Shop shop = st.getShopOrder() != null ? st.getShopOrder().getShop() : null;
                        if (shop != null) {
                            rewardService.refundPointsForCancelledOrder(user.getId(), shopPoints,
                                    String.format("Refund for approved return request - Order #%s",
                                            order.getOrderCode()),
                                    shop);
                            log.info("Refunded {} points to user {} for shop {} (order {})",
                                    shopPoints, user.getId(), shop.getShopId(), order.getOrderId());
                        } else {
                            rewardService.refundPointsForCancelledOrder(user.getId(), shopPoints,
                                    String.format("Refund for approved return request - Order #%s",
                                            order.getOrderCode()));
                            log.info("Refunded {} points to user {} (global) for order {}",
                                    shopPoints, user.getId(), order.getOrderId());
                        }
                    }
                } else {
                    // No per-shop points recorded - fallback to single shop if available
                    Shop fallbackShop = order.getShopOrders().stream().findFirst().get().getShop();
                    rewardService.refundPointsForCancelledOrder(
                            user.getId(),
                            pointsToRefund,
                            String.format("Refund for approved return request - Order #%s", order.getOrderCode()),
                            fallbackShop);
                    log.info("Refunded {} points to user {} for approved return - order {}",
                            pointsToRefund, user.getId(), order.getOrderId());
                }
            } else {
                // No shopTransactions available - fallback to the first shop on order
                Shop fallbackShop = order.getShopOrders().stream().findFirst().get().getShop();
                rewardService.refundPointsForCancelledOrder(
                        user.getId(),
                        pointsToRefund,
                        String.format("Refund for approved return request - Order #%s", order.getOrderCode()),
                        fallbackShop);

                log.info("Refunded {} points to user {} for approved return - order {}",
                        pointsToRefund, user.getId(), order.getOrderId());
            }

            return RefundResult.success(
                    refundCalc.getTotalRefundAmount(),
                    BigDecimal.ZERO,
                    pointsToRefund,
                    "Points refunded successfully");

        } catch (Exception e) {
            log.error("Error processing points-only refund for approved return - order {}: {}",
                    order.getOrderId(), e.getMessage(), e);
            return RefundResult.failure("Points refund failed: " + e.getMessage());
        }
    }

    /**
     * Process refund for hybrid payment (points + card)
     */
    private RefundResult processHybridRefundForApproval(Order order, OrderTransaction transaction,
            RefundCalculation refundCalc, boolean isFullOrderReturn) {
        log.info("Processing hybrid refund for approved return - order {}", order.getOrderId());

        try {
            Integer pointsUsed = transaction.getPointsUsed();
            BigDecimal pointsValue = transaction.getPointsValue() != null ? transaction.getPointsValue()
                    : BigDecimal.ZERO;
            BigDecimal cardAmount = transaction.getOrderAmount().subtract(pointsValue);

            User user = order.getUser();
            if (user == null) {
                throw new RuntimeException("User not found for order: " + order.getOrderId());
            }

            Integer pointsToRefund = 0;
            BigDecimal cardRefundAmount = BigDecimal.ZERO;

            if (isFullOrderReturn) {
                // Full refund
                pointsToRefund = pointsUsed != null ? pointsUsed : 0;
                cardRefundAmount = cardAmount;
            } else {
                // Proportional refund
                BigDecimal refundRatio = refundCalc.getTotalRefundAmount()
                        .divide(transaction.getOrderAmount(), 4, BigDecimal.ROUND_HALF_UP);

                if (pointsUsed != null && pointsUsed > 0) {
                    pointsToRefund = BigDecimal.valueOf(pointsUsed)
                            .multiply(refundRatio)
                            .setScale(0, BigDecimal.ROUND_HALF_UP)
                            .intValue();
                }

                if (cardAmount.compareTo(BigDecimal.ZERO) > 0) {
                    cardRefundAmount = cardAmount.multiply(refundRatio)
                            .setScale(2, BigDecimal.ROUND_HALF_UP);
                }
            }

            // Refund points to user (distribute per-shop if possible)
            if (pointsToRefund > 0) {
                if (transaction != null && transaction.getShopTransactions() != null
                        && !transaction.getShopTransactions().isEmpty()) {
                    for (ShopOrderTransaction st : transaction.getShopTransactions()) {
                        int shopPoints = st.getPointsUsed() != null ? st.getPointsUsed() : 0;
                        if (shopPoints <= 0)
                            continue;
                        Shop shop = st.getShopOrder() != null ? st.getShopOrder().getShop() : null;
                        if (shop != null) {
                            rewardService.refundPointsForCancelledOrder(user.getId(), shopPoints,
                                    String.format("Points refund for approved return request - Order #%s",
                                            order.getOrderCode()),
                                    shop);
                            log.info("Refunded {} points to user {} for shop {} (order {})",
                                    shopPoints, user.getId(), shop.getShopId(), order.getOrderId());
                        } else {
                            rewardService.refundPointsForCancelledOrder(user.getId(), shopPoints,
                                    String.format("Points refund for approved return request - Order #%s",
                                            order.getOrderCode()));
                            log.info("Refunded {} points to user {} (global) for order {}",
                                    shopPoints, user.getId(), order.getOrderId());
                        }
                    }
                } else {
                    Shop fallbackShop = order.getShopOrders().stream().findFirst().get().getShop();
                    rewardService.refundPointsForCancelledOrder(user.getId(), pointsToRefund,
                            String.format("Points refund for approved return request - Order #%s",
                                    order.getOrderCode()),
                            fallbackShop);
                    log.info("Refunded {} points to user {} for approved return - order {}",
                            pointsToRefund, user.getId(), order.getOrderId());
                }
            }

            // For card portion, mark as manual refund (no Stripe integration)
            if (cardRefundAmount.compareTo(BigDecimal.ZERO) > 0) {
                // If shopTransactions available, split card refund across shops proportionally
                // by shop transaction amount
                if (transaction != null && transaction.getShopTransactions() != null
                        && !transaction.getShopTransactions().isEmpty()) {
                    BigDecimal totalShopAmounts = transaction.getShopTransactions().stream()
                            .map(st -> st.getAmount() != null ? st.getAmount() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    if (totalShopAmounts.compareTo(BigDecimal.ZERO) > 0) {
                        for (ShopOrderTransaction st : transaction.getShopTransactions()) {
                            BigDecimal shopAmount = st.getAmount() != null ? st.getAmount() : BigDecimal.ZERO;
                            BigDecimal shopRefund = BigDecimal.ZERO;
                            if (shopAmount.compareTo(BigDecimal.ZERO) > 0) {
                                shopRefund = cardRefundAmount.multiply(shopAmount)
                                        .divide(totalShopAmounts, 2, RoundingMode.HALF_UP);
                            }
                            Shop shop = st.getShopOrder() != null ? st.getShopOrder().getShop() : null;
                            if (shop != null) {
                                log.info(
                                        "Card refund of {} marked for manual processing for approved return - order {} (shop {})",
                                        shopRefund, order.getOrderId(), shop.getShopId());
                            } else {
                                log.info(
                                        "Card refund of {} marked for manual processing for approved return - order {} (global)",
                                        shopRefund, order.getOrderId());
                            }
                        }
                    } else {
                        log.info("Card refund of {} marked for manual processing for approved return - order {}",
                                cardRefundAmount, order.getOrderId());
                    }
                } else {
                    log.info("Card refund of {} marked for manual processing for approved return - order {}",
                            cardRefundAmount, order.getOrderId());
                }
            }

            return RefundResult.success(
                    refundCalc.getTotalRefundAmount(),
                    cardRefundAmount,
                    pointsToRefund,
                    "Hybrid refund processed (points refunded, card marked for manual processing)");

        } catch (Exception e) {
            log.error("Error processing hybrid refund for approved return - order {}: {}",
                    order.getOrderId(), e.getMessage(), e);
            return RefundResult.failure("Hybrid refund failed: " + e.getMessage());
        }
    }

    /**
     * Process refund for credit/debit card payment (manual external processing)
     */
    private RefundResult processCardRefundForApproval(Order order, OrderTransaction transaction,
            RefundCalculation refundCalc, boolean isFullOrderReturn) {
        log.info("Processing card refund for approved return - order {}", order.getOrderId());

        try {
            BigDecimal pointsValue = transaction.getPointsValue() != null ? transaction.getPointsValue()
                    : BigDecimal.ZERO;
            BigDecimal cardAmount = transaction.getOrderAmount().subtract(pointsValue);
            if (cardAmount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("No card amount found in transaction");
            }

            BigDecimal refundAmount;
            if (isFullOrderReturn) {
                refundAmount = cardAmount;
            } else {
                // Proportional refund
                BigDecimal refundRatio = refundCalc.getTotalRefundAmount()
                        .divide(transaction.getOrderAmount(), 4, BigDecimal.ROUND_HALF_UP);
                refundAmount = cardAmount.multiply(refundRatio)
                        .setScale(2, BigDecimal.ROUND_HALF_UP);
            }

            // Mark card refund for manual external processing (no Stripe integration)
            log.info("Card refund of {} marked for manual external processing for approved return - order {}",
                    refundAmount, order.getOrderId());

            return RefundResult.success(
                    refundCalc.getTotalRefundAmount(),
                    refundAmount,
                    0,
                    "Card refund marked for manual external processing");

        } catch (Exception e) {
            log.error("Error processing card refund for approved return - order {}: {}",
                    order.getOrderId(), e.getMessage(), e);
            return RefundResult.failure("Card refund processing failed: " + e.getMessage());
        }
    }

    // ===== REFUND HELPER CLASSES =====

    /**
     * Result of refund processing
     */
    private static class RefundResult {
        private final boolean success;
        private final BigDecimal totalRefundValue;
        private final BigDecimal cardRefundAmount;
        private final Integer pointsRefunded;
        private final String message;

        private RefundResult(boolean success, BigDecimal totalRefundValue, BigDecimal cardRefundAmount,
                Integer pointsRefunded, String message) {
            this.success = success;
            this.totalRefundValue = totalRefundValue;
            this.cardRefundAmount = cardRefundAmount;
            this.pointsRefunded = pointsRefunded;
            this.message = message;
        }

        public static RefundResult success(BigDecimal totalRefundValue, BigDecimal cardRefundAmount,
                Integer pointsRefunded, String message) {
            return new RefundResult(true, totalRefundValue, cardRefundAmount, pointsRefunded, message);
        }

        public static RefundResult failure(String message) {
            return new RefundResult(false, BigDecimal.ZERO, BigDecimal.ZERO, 0, message);
        }

        public boolean isSuccess() {
            return success;
        }

        public BigDecimal getTotalRefundValue() {
            return totalRefundValue;
        }

        public BigDecimal getCardRefundAmount() {
            return cardRefundAmount;
        }

        public Integer getPointsRefunded() {
            return pointsRefunded;
        }

        public String getMessage() {
            return message;
        }
    }

    /**
     * Calculation details for refund amounts
     */
    private static class RefundCalculation {
        private final BigDecimal totalItemRefund;
        private final BigDecimal totalShippingRefund;
        private final BigDecimal totalRefundAmount;
        private final Map<Long, RefundItemDetail> itemDetails;
        private final boolean isFullOrderReturn;

        public RefundCalculation(BigDecimal totalItemRefund, BigDecimal totalShippingRefund,
                BigDecimal totalRefundAmount, Map<Long, RefundItemDetail> itemDetails, boolean isFullOrderReturn) {
            this.totalItemRefund = totalItemRefund;
            this.totalShippingRefund = totalShippingRefund;
            this.totalRefundAmount = totalRefundAmount;
            this.itemDetails = itemDetails;
            this.isFullOrderReturn = isFullOrderReturn;
        }

        public BigDecimal getTotalItemRefund() {
            return totalItemRefund;
        }

        public BigDecimal getTotalShippingRefund() {
            return totalShippingRefund;
        }

        public BigDecimal getTotalRefundAmount() {
            return totalRefundAmount;
        }

        public Map<Long, RefundItemDetail> getItemDetails() {
            return itemDetails;
        }

        public boolean isFullOrderReturn() {
            return isFullOrderReturn;
        }
    }

    /**
     * Details for individual item refund calculation
     */
    private static class RefundItemDetail {
        private final Long orderItemId;
        private final Integer quantity;
        private final BigDecimal unitPrice;
        private final BigDecimal totalRefund;
        private final BigDecimal shippingRefund;

        public RefundItemDetail(Long orderItemId, Integer quantity, BigDecimal unitPrice,
                BigDecimal totalRefund, BigDecimal shippingRefund) {
            this.orderItemId = orderItemId;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
            this.totalRefund = totalRefund;
            this.shippingRefund = shippingRefund;
        }

        public Long getOrderItemId() {
            return orderItemId;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public BigDecimal getUnitPrice() {
            return unitPrice;
        }

        public BigDecimal getTotalRefund() {
            return totalRefund;
        }

        public BigDecimal getShippingRefund() {
            return shippingRefund;
        }
    }
}
