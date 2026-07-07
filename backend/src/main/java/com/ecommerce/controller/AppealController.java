
package com.ecommerce.controller;

import com.ecommerce.ServiceImpl.CustomUserDetails;
import com.ecommerce.dto.AppealDecisionDTO;
import com.ecommerce.dto.AppealStatisticsDTO;
import com.ecommerce.dto.ReturnAppealDTO;
import com.ecommerce.dto.SubmitAppealRequestDTO;
import com.ecommerce.dto.TokenizedAppealRequestDTO;
import com.ecommerce.entity.Order;
import com.ecommerce.entity.OrderTransaction;
import com.ecommerce.entity.ReturnAppeal;
import com.ecommerce.entity.ReturnRequest;
import com.ecommerce.entity.User;
import com.ecommerce.repository.ReturnAppealRepository;
import com.ecommerce.repository.ReturnRequestRepository;
import com.ecommerce.service.AppealService;
import com.ecommerce.service.ShopAuthorizationService;
import com.ecommerce.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/appeals")
@RequiredArgsConstructor
@Slf4j
@Validated
public class AppealController {

    private final AppealService appealService;
    private final ShopAuthorizationService shopAuthorizationService;
    private final CloudinaryService cloudinaryService;
    private final ReturnAppealRepository returnAppealRepository;
    private final ReturnRequestRepository returnRequestRepository;

    @PostMapping(value = "/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','EMPLOYEE', 'VENDOR')")
    public ResponseEntity<?> submitAppeal(
            @RequestParam("returnRequestId") Long returnRequestId,
            @RequestParam("reason") String reason,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "mediaFiles", required = false) MultipartFile[] mediaFiles,
            Authentication authentication) {
        try {
            UUID customerId = getAuthenticatedUserId(authentication);
            if (customerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            SubmitAppealRequestDTO dto = new SubmitAppealRequestDTO(returnRequestId, customerId, reason, description);
            ReturnAppealDTO result = appealService.submitAppeal(dto, mediaFiles);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            log.error("Error submitting appeal for returnRequestId {}: {}", returnRequestId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("APPEAL_SUBMIT_ERROR", e.getMessage()));
        } catch (Exception e) {
            log.error("Internal error submitting appeal for returnRequestId {}: {}", returnRequestId, e.getMessage(),
                    e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to submit appeal"));
        }
    }

    @PostMapping(value = "/submit/tokenized", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submitTokenizedAppeal(
            @RequestParam("returnRequestId") Long returnRequestId,
            @RequestParam("trackingToken") String trackingToken,
            @RequestParam("reason") String reason,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "mediaFiles", required = false) MultipartFile[] mediaFiles) {
        try {
            TokenizedAppealRequestDTO dto = new TokenizedAppealRequestDTO(returnRequestId, trackingToken, reason,
                    description);
            ReturnAppealDTO result = appealService.submitTokenizedAppeal(dto, mediaFiles);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            log.error("Error submitting tokenized appeal for returnRequestId {}: {}", returnRequestId, e.getMessage(),
                    e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("APPEAL_SUBMIT_ERROR", e.getMessage()));
        } catch (Exception e) {
            log.error("Internal error submitting tokenized appeal for returnRequestId {}: {}", returnRequestId,
                    e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to submit appeal"));
        }
    }

    @GetMapping("/return/{returnRequestId}")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','EMPLOYEE', 'VENDOR')")
    public ResponseEntity<?> getAppealByReturnRequestId(@PathVariable Long returnRequestId) {
        try {
            ReturnAppealDTO appeal = appealService.getAppealByReturnRequestId(returnRequestId);
            return ResponseEntity.ok(appeal);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("NOT_FOUND", e.getMessage()));
        } catch (Exception e) {
            log.error("Internal error retrieving appeal for returnRequestId {}: {}", returnRequestId, e.getMessage(),
                    e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to retrieve appeal"));
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'ADMIN')")
    public ResponseEntity<?> getAppeals(
            @RequestParam UUID shopId,
            @RequestParam(required = false) String status,
            Pageable pageable,
            Authentication authentication) {
        try {
            UUID authenticatedUserId = getAuthenticatedUserId(authentication);
            if (authenticatedUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            // Validate shop access for vendors and employees
            if (!authentication.getAuthorities().stream()
                    .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"))) {
                shopAuthorizationService.assertCanManageShop(authenticatedUserId, shopId);
            }

            ReturnAppeal.AppealStatus appealStatus = null;
            if (status != null && !status.trim().isEmpty()) {
                try {
                    appealStatus = ReturnAppeal.AppealStatus.valueOf(status.toUpperCase());
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(createErrorResponse("INVALID_STATUS", "Invalid status value: " + status));
                }
            }

            Page<ReturnAppealDTO> appeals = appealService.getAppealsByShopId(shopId, appealStatus, pageable);
            return ResponseEntity.ok(appeals);
        } catch (RuntimeException e) {
            log.error("Error retrieving appeals for shop {}: {}", shopId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("APPEALS_RETRIEVAL_ERROR", e.getMessage()));
        } catch (Exception e) {
            log.error("Internal error retrieving appeals for shop {}: {}", shopId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to retrieve appeals"));
        }
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'ADMIN')")
    public ResponseEntity<?> getAppealStats(
            @RequestParam UUID shopId,
            Authentication authentication) {
        try {
            UUID authenticatedUserId = getAuthenticatedUserId(authentication);
            if (authenticatedUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            // Validate shop access for vendors and employees
            if (!authentication.getAuthorities().stream()
                    .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"))) {
                shopAuthorizationService.assertCanManageShop(authenticatedUserId, shopId);
            }

            AppealStatisticsDTO stats = appealService.getAppealStatistics(shopId);
            return ResponseEntity.ok(stats);
        } catch (RuntimeException e) {
            log.error("Error retrieving appeal stats for shop {}: {}", shopId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("STATS_RETRIEVAL_ERROR", e.getMessage()));
        } catch (Exception e) {
            log.error("Internal error retrieving appeal stats for shop {}: {}", shopId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to retrieve appeal statistics"));
        }
    }

    @GetMapping("/pending/count")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'ADMIN')")
    public ResponseEntity<?> getPendingAppealsCount(
            @RequestParam(required = false) UUID shopId,
            Authentication authentication) {
        try {
            UUID authenticatedUserId = getAuthenticatedUserId(authentication);
            if (authenticatedUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "message", "User not authenticated", "count", 0L));
            }

            // Validate shop access for vendors and employees
            if (shopId != null && !authentication.getAuthorities().stream()
                    .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"))) {
                shopAuthorizationService.assertCanManageShop(authenticatedUserId, shopId);
            }

            long count = appealService.countPendingAppeals(shopId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", count);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving pending appeals count for shop {}: {}", shopId, e.getMessage(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("count", 0L);
            return ResponseEntity.ok(response); // Return success=false with 0 instead of failing
        }
    }

    @PostMapping(value = "/{appealId}/approve", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'ADMIN')")
    public ResponseEntity<?> approveAppeal(
            @PathVariable Long appealId,
            @RequestParam UUID shopId,
            @RequestParam(value = "decisionNotes", required = false) String decisionNotes,
            @RequestParam(value = "refundNotes", required = false) String refundNotes,
            @RequestParam(value = "refundScreenshot", required = false) MultipartFile refundScreenshot,
            Authentication authentication) {
        try {
            UUID authenticatedUserId = getAuthenticatedUserId(authentication);
            if (authenticatedUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            // Validate shop access for vendors and employees
            if (!authentication.getAuthorities().stream()
                    .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"))) {
                shopAuthorizationService.assertCanManageShop(authenticatedUserId, shopId);
            }

            // Build decision DTO
            AppealDecisionDTO decisionDTO = new AppealDecisionDTO(appealId, "APPROVED", decisionNotes,
                    authenticatedUserId.toString(), refundNotes, null);

            // Handle refund screenshot upload
            if (refundScreenshot != null && !refundScreenshot.isEmpty()) {
                try {
                    Map<String, String> uploadResult = cloudinaryService.uploadImage(refundScreenshot);
                    String screenshotUrl = uploadResult.get("url");
                    decisionDTO.setRefundScreenshotUrl(screenshotUrl);
                    log.info("Uploaded refund screenshot for appeal {}: {}", appealId, screenshotUrl);
                } catch (Exception e) {
                    log.error("Failed to upload refund screenshot for appeal {}: {}", appealId, e.getMessage(), e);
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(createErrorResponse("SCREENSHOT_UPLOAD_ERROR", "Failed to upload refund screenshot"));
                }
            }

            ReturnAppealDTO result = appealService.reviewAppeal(decisionDTO);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            log.error("Error approving appeal {}: {}", appealId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("APPEAL_APPROVAL_ERROR", e.getMessage()));
        } catch (Exception e) {
            log.error("Internal error approving appeal {}: {}", appealId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to approve appeal"));
        }
    }

    @PostMapping(value = "/review", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'ADMIN')")
    public ResponseEntity<?> reviewAppeal(
            @RequestParam Long appealId,
            @RequestParam UUID shopId,
            @RequestParam String decision,
            @RequestParam(value = "notes", required = false) String decisionNotes,
            @RequestParam(value = "refundScreenshot", required = false) MultipartFile refundScreenshot,
            Authentication authentication) {
        try {
            UUID authenticatedUserId = getAuthenticatedUserId(authentication);
            if (authenticatedUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(createErrorResponse("UNAUTHORIZED", "User not authenticated"));
            }

            // Validate shop access for vendors and employees
            if (!authentication.getAuthorities().stream()
                    .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"))) {
                shopAuthorizationService.assertCanManageShop(authenticatedUserId, shopId);
            }

            // Validate decision
            if (!"APPROVED".equals(decision) && !"DENIED".equals(decision)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(createErrorResponse("INVALID_DECISION", "Decision must be APPROVED or DENIED"));
            }

            // For approvals, check if refund screenshot is required
            if ("APPROVED".equals(decision) && (refundScreenshot == null || refundScreenshot.isEmpty())) {
                // Check if the appeal involves card refunds that would require a screenshot
                try {
                    ReturnAppeal appeal = returnAppealRepository.findById(appealId)
                            .orElseThrow(() -> new RuntimeException("Appeal not found"));
                    ReturnRequest returnRequest = returnRequestRepository.findById(appeal.getReturnRequestId())
                            .orElseThrow(() -> new RuntimeException("Return request not found"));

                    // Check if this return involves card payments that would need manual refund
                    Order order = returnRequest.getShopOrder().getOrder();
                    OrderTransaction transaction = order.getOrderTransaction();
                    if (transaction != null &&
                            (transaction.getPaymentMethod() == OrderTransaction.PaymentMethod.CREDIT_CARD ||
                                    transaction.getPaymentMethod() == OrderTransaction.PaymentMethod.DEBIT_CARD ||
                                    transaction.getPaymentMethod() == OrderTransaction.PaymentMethod.HYBRID)) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(createErrorResponse("SCREENSHOT_REQUIRED",
                                        "Refund screenshot is required for appeals involving card payments"));
                    }
                } catch (Exception e) {
                    log.warn("Could not check if screenshot is required for appeal {}: {}", appealId, e.getMessage());
                    // Continue without requiring screenshot if we can't determine
                }
            }

            // Build decision DTO
            AppealDecisionDTO decisionDTO = new AppealDecisionDTO(appealId, decision, decisionNotes,
                    authenticatedUserId.toString(), null, null);

            // Handle refund screenshot upload
            if (refundScreenshot != null && !refundScreenshot.isEmpty()) {
                try {
                    Map<String, String> uploadResult = cloudinaryService.uploadImage(refundScreenshot);
                    String screenshotUrl = uploadResult.get("url");
                    decisionDTO.setRefundScreenshotUrl(screenshotUrl);
                    log.info("Uploaded refund screenshot for appeal {}: {}", appealId, screenshotUrl);
                } catch (Exception e) {
                    log.error("Failed to upload refund screenshot for appeal {}: {}", appealId, e.getMessage(), e);
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(createErrorResponse("SCREENSHOT_UPLOAD_ERROR", "Failed to upload refund screenshot"));
                }
            }

            ReturnAppealDTO result = appealService.reviewAppeal(decisionDTO);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            log.error("Error reviewing appeal {}: {}", appealId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("APPEAL_REVIEW_ERROR", e.getMessage()));
        } catch (Exception e) {
            log.error("Internal error reviewing appeal {}: {}", appealId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to review appeal"));
        }
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

    private Map<String, Object> createErrorResponse(String errorCode, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("errorCode", errorCode);
        response.put("message", message);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }
}
