package com.ecommerce.service.impl;

import com.ecommerce.dto.*;
import com.ecommerce.entity.*;
import com.ecommerce.repository.*;
import com.ecommerce.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointsPaymentServiceImpl implements PointsPaymentService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final OrderTransactionRepository transactionRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final WarehouseRepository warehouseRepository;
    private final RewardService rewardService;
    private final ShippingCostService shippingCostService;
    private final EnhancedStockValidationService stockValidationService;
    private final EnhancedMultiWarehouseAllocator warehouseAllocator;
    private final FEFOStockAllocationService fefoService;
    private final OrderItemBatchRepository orderItemBatchRepository;
    private final StripeService stripeService;
    private final EnhancedStockLockService enhancedStockLockService;
    private final OrderEmailService orderEmailService;
    private final MoneyFlowService moneyFlowService;
    private final UserPointsRepository userPointsRepository;
    private final ShopRepository shopRepository;
    private final RewardSystemRepository rewardSystemRepository;
    private final ShopOrderRepository shopOrderRepository;
    private final CheckoutService checkoutService;

    @Override
    public PointsPaymentPreviewDTO previewPointsPayment(PointsPaymentRequest request) {
        if (request.getUserId() == null) {
            throw new IllegalArgumentException("User ID is required");
        }

        userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        validateDeliveryCountry(request.getShippingAddress().getCountry());

        // Use CheckoutService for consistent total calculations (now with 0% tax)
        PaymentSummaryDTO summary = checkoutService.calculatePaymentSummary(
                request.getShippingAddress(), request.getItems(), request.getUserId());

        BigDecimal totalOrderAmount = summary.getTotalAmount();
        BigDecimal totalPointsValueUsed = BigDecimal.ZERO;
        Integer totalAvailablePoints = 0;

        log.info("=== POINTS PAYMENT PREVIEW ===");
        log.info("Total Order Amount (from CheckoutService): {} RWF", totalOrderAmount);
        log.info("Number of shops: {}", summary.getShopSummaries().size());

        // Build shop preview summaries with complete cost breakdown and points
        // information
        List<PointsPaymentPreviewDTO.ShopPreviewSummary> shopPreviews = new java.util.ArrayList<>();

        for (PaymentSummaryDTO.ShopSummary shopSummary : summary.getShopSummaries()) {
            UUID shopId = UUID.fromString(shopSummary.getShopId());
            BigDecimal shopTotal = shopSummary.getTotalAmount();

            Integer shopPoints = getAvailablePointsForShop(request.getUserId(), shopId);
            BigDecimal shopPointValue = getPointValueForShop(shopId);
            BigDecimal shopPointsPotentialValue = shopPointValue.multiply(BigDecimal.valueOf(shopPoints));

            log.info("Shop: {} - Total: {} RWF, Available Points: {}, Point Value: {} RWF, Potential: {} RWF",
                    shopSummary.getShopName(), shopTotal, shopPoints, shopPointValue, shopPointsPotentialValue);

            // Use points up to shop order total
            BigDecimal usablePointsValue = shopPointsPotentialValue.min(shopTotal);
            totalPointsValueUsed = totalPointsValueUsed.add(usablePointsValue);
            totalAvailablePoints += shopPoints;

            log.info("Usable Points Value for {}: {} RWF", shopSummary.getShopName(), usablePointsValue);

            // Calculate points to use for this shop
            Integer pointsToUseForShop = 0;
            BigDecimal pointsValueToUseForShop = BigDecimal.ZERO;
            if (usablePointsValue.compareTo(BigDecimal.ZERO) > 0) {
                pointsToUseForShop = calculatePointsNeeded(usablePointsValue, shopPointValue);
                pointsValueToUseForShop = shopPointValue.multiply(BigDecimal.valueOf(pointsToUseForShop))
                        .min(shopTotal);
            }

            Integer remainingPointsAfterUse = shopPoints - pointsToUseForShop;

            // Build shop preview with COMPLETE breakdown
            PointsPaymentPreviewDTO.ShopPreviewSummary shopPreview = PointsPaymentPreviewDTO.ShopPreviewSummary
                    .builder()
                    .shopId(shopSummary.getShopId())
                    .shopName(shopSummary.getShopName())
                    .subtotal(shopSummary.getSubtotal())
                    .discountAmount(shopSummary.getDiscountAmount())
                    .shippingCost(shopSummary.getShippingCost())
                    .packagingFee(
                            shopSummary.getPackagingFee() != null ? shopSummary.getPackagingFee() : BigDecimal.ZERO)
                    .totalAmount(shopTotal)
                    .availablePoints(shopPoints)
                    .pointValue(shopPointValue)
                    .pointsToUse(pointsToUseForShop)
                    .pointsValueToUse(pointsValueToUseForShop)
                    .remainingPointsAfterUse(remainingPointsAfterUse)
                    .fulfillmentType(
                            shopSummary.getFulfillmentType() != null ? shopSummary.getFulfillmentType() : "DELIVERY")
                    .build();

            shopPreviews.add(shopPreview);
        }

        BigDecimal remainingToPay = totalOrderAmount.subtract(totalPointsValueUsed).max(BigDecimal.ZERO);
        boolean canPayWithPointsOnly = remainingToPay.compareTo(BigDecimal.valueOf(0.01)) <= 0;

        // Get average point value for display
        BigDecimal avgPointValue = totalAvailablePoints > 0
                ? totalPointsValueUsed.divide(BigDecimal.valueOf(totalAvailablePoints), 4,
                        java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        log.info("Total Points Value Available: {} RWF", totalPointsValueUsed);
        log.info("Remaining to Pay: {} RWF", remainingToPay);
        log.info("Can Pay with Points Only: {}", canPayWithPointsOnly);
        log.info("===============================");

        return PointsPaymentPreviewDTO.builder()
                .totalAmount(totalOrderAmount)
                .subtotal(summary.getSubtotal())
                .shippingCost(summary.getShippingCost())
                .taxAmount(summary.getTaxAmount())
                .totalAvailablePoints(totalAvailablePoints)
                .totalPointsValueUsed(totalPointsValueUsed)
                .avgPointValue(avgPointValue)
                .remainingToPay(remainingToPay)
                .canPayWithPointsOnly(canPayWithPointsOnly)
                .shopSummaries(shopPreviews)
                .build();
    }

    @Override
    public PointsPaymentResult processPointsPayment(PointsPaymentRequest request) {
        try {
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            validateDeliveryCountry(request.getShippingAddress().getCountry());
            stockValidationService.validateCartItems(request.getItems());

            // Group items by shop
            Map<UUID, List<CartItemDTO>> itemsByShop = groupItemsByShop(request.getItems());

            log.info("=== PROCESSING POINTS PAYMENT ===");
            log.info("User: {}, Total Shops in Request: {}", user.getId(), itemsByShop.size());

            // CRITICAL VALIDATION: Ensure request includes items from ALL shops user is
            // trying to buy from
            // If only partial shops included, this is an error case where frontend didn't
            // include all items
            if (itemsByShop.isEmpty()) {
                log.error("CRITICAL ERROR: No items provided in points payment request");
                throw new IllegalArgumentException(
                        "Cannot process points payment without items. Please ensure all cart items are included in the request.");
            }

            // Calculate shop-by-shop points usage
            List<ShopPointsCalculation> shopCalculations = calculateShopPointsUsage(
                    user.getId(), itemsByShop, request.getSelectedShopsForPoints(), request.getShippingAddress());

            BigDecimal totalOrderAmount = shopCalculations.stream()
                    .map(c -> c.shopTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalPointsValue = shopCalculations.stream()
                    .map(c -> c.pointsValueToUse)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal remainingToPay = totalOrderAmount.subtract(totalPointsValue).max(BigDecimal.ZERO);

            // Calculate per-shop remaining amounts (some shops may need card payment)
            Map<UUID, BigDecimal> shopRemainingAmounts = new java.util.HashMap<>();
            BigDecimal totalShopRemainingForCard = BigDecimal.ZERO;

            for (ShopPointsCalculation calc : shopCalculations) {
                BigDecimal shopRemaining = calc.shopTotal.subtract(calc.pointsValueToUse).max(BigDecimal.ZERO);
                shopRemainingAmounts.put(calc.shopId, shopRemaining);
                totalShopRemainingForCard = totalShopRemainingForCard.add(shopRemaining);
            }

            // Use the recalculated remaining amount (safety check)
            remainingToPay = totalShopRemainingForCard;

            boolean isFullPointsPayment = remainingToPay.compareTo(BigDecimal.valueOf(0.01)) <= 0;

            log.info("Total Order: {} RWF, Points Value: {} RWF, Total Remaining for Card: {} RWF, Full Payment: {}",
                    totalOrderAmount, totalPointsValue, remainingToPay, isFullPointsPayment);

            // Log per-shop breakdown
            for (ShopPointsCalculation calc : shopCalculations) {
                BigDecimal shopRemaining = shopRemainingAmounts.get(calc.shopId);
                log.info("Shop {}: Total={} RWF, Points={}, PointsValue={} RWF, RemainForCard={} RWF",
                        calc.shopName, calc.shopTotal, calc.pointsToUse, calc.pointsValueToUse, shopRemaining);
            }

            // CRITICAL VALIDATION: If ANY shop has remaining amount, must use hybrid
            // payment (even for 750 RWF+ check)
            if (isFullPointsPayment) {
                log.info("All shops covered by points - proceeding with FULL POINTS PAYMENT");
                return processFullPointsPaymentMultiVendor(user, request, shopCalculations, totalOrderAmount);
            } else {
                log.info(
                        "Not all shops covered by points - proceeding with HYBRID PAYMENT ({}  RWF remaining for card)",
                        remainingToPay);
                return processHybridPaymentMultiVendor(user, request, shopCalculations, totalOrderAmount,
                        remainingToPay);
            }
        } catch (Exception e) {
            log.error("Error processing points payment: {}", e.getMessage(), e);
            throw new RuntimeException("Payment processing failed: " + e.getMessage(), e);
        }
    }

    private PointsPaymentResult processFullPointsPaymentMultiVendor(User user, PointsPaymentRequest request,
            List<ShopPointsCalculation> shopCalculations, BigDecimal totalOrderAmount) throws Exception {

        log.info("=== FULL POINTS PAYMENT ===");
        log.info("User: {}, Total: {} RWF, Shops: {}", user.getId(), totalOrderAmount, shopCalculations.size());

        Map<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> allocations = warehouseAllocator
                .allocateStockWithFEFO(request.getItems(), request.getShippingAddress());
        log.info("Stock allocation completed for {} items", allocations.size());

        Order order = createMultiVendorOrder(request, user, shopCalculations, allocations, totalOrderAmount, true);
        Order savedOrder = orderRepository.save(order);
        log.info("Order created: {}", savedOrder.getOrderId());

        // Commit FEFO allocations
        for (Map.Entry<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> entry : allocations.entrySet()) {
            fefoService.commitAllocation(entry.getValue());
            createOrderItemBatches(savedOrder, entry.getKey(), entry.getValue());
        }
        log.info("Batch allocations committed");

        // Deduct points shop by shop
        List<PointsPaymentResult.ShopPointsDeduction> deductions = new ArrayList<>();
        int totalPointsUsed = 0;
        BigDecimal totalPointsValue = BigDecimal.ZERO;

        for (ShopPointsCalculation calc : shopCalculations) {
            if (calc.pointsToUse > 0) {
                createPointsRecord(user, calc.shopId, savedOrder.getOrderId(), -calc.pointsToUse,
                        calc.pointsValueToUse,
                        "Points used for order #" + savedOrder.getOrderCode() + " at " + calc.shopName);

                totalPointsUsed += calc.pointsToUse;
                totalPointsValue = totalPointsValue.add(calc.pointsValueToUse);

                updateShopOrderTransactionPoints(savedOrder, calc.shopId, calc.pointsToUse, calc.pointsValueToUse);

                deductions.add(PointsPaymentResult.ShopPointsDeduction.builder()
                        .shopId(calc.shopId)
                        .shopName(calc.shopName)
                        .pointsUsed(calc.pointsToUse)
                        .pointsValue(calc.pointsValueToUse)
                        .shopOrderAmount(calc.shopTotal)
                        .remainingForShop(BigDecimal.ZERO)
                        .build());

                log.info("Deducted {} points (value: {} RWF) from shop: {}",
                        calc.pointsToUse, calc.pointsValueToUse, calc.shopName);
            }
        }

        // Update transaction
        OrderTransaction transaction = savedOrder.getOrderTransaction();
        transaction.setStatus(OrderTransaction.TransactionStatus.COMPLETED);
        transaction.setPointsUsed(totalPointsUsed);
        transaction.setPointsValue(totalPointsValue);
        transaction.setPaymentDate(LocalDateTime.now());
        transactionRepository.save(transaction);

        // Update shop orders to PROCESSING
        for (ShopOrder shopOrder : savedOrder.getShopOrders()) {
            shopOrder.setStatus(ShopOrder.ShopOrderStatus.PROCESSING);
        }
        orderRepository.save(savedOrder);

        // Send confirmation email
        try {
            orderEmailService.sendOrderConfirmationEmail(savedOrder);
        } catch (Exception e) {
            log.error("Failed to send order confirmation email: {}", e.getMessage());
        }

        // DO NOT award reward points if points were used for payment
        // Reward points should only be given when checkout happens WITHOUT using points
        // This prevents circular dependency: Points → Payment → Reward Points
        log.info("Skipping reward points for full points payment (to prevent circular dependency)");

        log.info("=== FULL POINTS PAYMENT COMPLETED "
                + "===");
        log.info("Total Points Used: {}, Total Value: {} RWF", totalPointsUsed, totalPointsValue);

        return PointsPaymentResult.builder()
                .success(true)
                .message("Payment completed successfully with points!")
                .orderId(savedOrder.getOrderId())
                .orderNumber(savedOrder.getOrderCode())
                .pointsUsed(totalPointsUsed)
                .pointsValue(totalPointsValue)
                .remainingAmount(BigDecimal.ZERO)
                .stripeSessionId(null)
                .hybridPayment(false)
                .shopPointsDeductions(deductions)
                .build();
    }

    private PointsPaymentResult processHybridPaymentMultiVendor(User user, PointsPaymentRequest request,
            List<ShopPointsCalculation> shopCalculations, BigDecimal totalOrderAmount, BigDecimal remainingToPay)
            throws Exception {

        log.info("=== HYBRID PAYMENT ===");
        log.info("User: {}, Total: {} RWF, Points Cover: {} RWF, Stripe Pay: {} RWF",
                user.getId(), totalOrderAmount,
                totalOrderAmount.subtract(remainingToPay), remainingToPay);

        // Validate Stripe minimum amount (750 RWF)
        if (remainingToPay.compareTo(new BigDecimal("750")) < 0) {
            throw new IllegalArgumentException(
                    String.format("The remaining amount (%s RWF) is below Stripe's minimum (750 RWF). " +
                            "Please use more points or add more items to your cart.", remainingToPay));
        }

        Map<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> allocations = warehouseAllocator
                .allocateStockWithFEFO(request.getItems(), request.getShippingAddress());

        Order order = createMultiVendorOrder(request, user, shopCalculations, allocations, totalOrderAmount, false);
        Order savedOrder = orderRepository.save(order);
        log.info("Order created: {}", savedOrder.getOrderId());

        // Create order item batches
        for (Map.Entry<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> entry : allocations.entrySet()) {
            createOrderItemBatches(savedOrder, entry.getKey(), entry.getValue());
        }

        // Lock stock
        String tempSessionId = "temp_hybrid_" + savedOrder.getOrderId();
        if (!lockStockWithFEFOAllocation(tempSessionId, request.getItems(), request.getShippingAddress())) {
            log.error("Failed to lock stock for hybrid payment");
            orderRepository.delete(savedOrder);
            throw new IllegalStateException("Unable to secure stock. Please try again.");
        }
        log.info("Stock locked: {}", tempSessionId);

        // Deduct points shop by shop
        List<PointsPaymentResult.ShopPointsDeduction> deductions = new ArrayList<>();
        int totalPointsUsed = 0;
        BigDecimal totalPointsValue = BigDecimal.ZERO;

        for (ShopPointsCalculation calc : shopCalculations) {
            if (calc.pointsToUse > 0) {
                createPointsRecord(user, calc.shopId, savedOrder.getOrderId(), -calc.pointsToUse,
                        calc.pointsValueToUse,
                        "Partial points for order #" + savedOrder.getOrderCode() + " at " + calc.shopName);

                totalPointsUsed += calc.pointsToUse;
                totalPointsValue = totalPointsValue.add(calc.pointsValueToUse);

                updateShopOrderTransactionPoints(savedOrder, calc.shopId, calc.pointsToUse, calc.pointsValueToUse);

                BigDecimal shopRemaining = calc.shopTotal.subtract(calc.pointsValueToUse).max(BigDecimal.ZERO);
                deductions.add(PointsPaymentResult.ShopPointsDeduction.builder()
                        .shopId(calc.shopId)
                        .shopName(calc.shopName)
                        .pointsUsed(calc.pointsToUse)
                        .pointsValue(calc.pointsValueToUse)
                        .shopOrderAmount(calc.shopTotal)
                        .remainingForShop(shopRemaining)
                        .build());

                log.info("Shop {}: Points={}, Value={} RWF, Shop Total={} RWF, Remaining={} RWF",
                        calc.shopName, calc.pointsToUse, calc.pointsValueToUse, calc.shopTotal, shopRemaining);
            } else {
                // No points used for this shop - full amount goes to Stripe
                deductions.add(PointsPaymentResult.ShopPointsDeduction.builder()
                        .shopId(calc.shopId)
                        .shopName(calc.shopName)
                        .pointsUsed(0)
                        .pointsValue(BigDecimal.ZERO)
                        .shopOrderAmount(calc.shopTotal)
                        .remainingForShop(calc.shopTotal)
                        .build());

                log.info("Shop {}: No points used, Full amount={} RWF goes to Stripe",
                        calc.shopName, calc.shopTotal);
            }
        }

        // Update transaction with points before creating Stripe session
        OrderTransaction transaction = savedOrder.getOrderTransaction();
        transaction.setPointsUsed(totalPointsUsed);
        transaction.setPointsValue(totalPointsValue);
        transactionRepository.save(transaction);

        log.info("Creating Stripe session for remaining: {} RWF", remainingToPay);

        // Create Stripe session for remaining amount
        String stripeSessionUrl = stripeService.createCheckoutSessionForHybridPayment(
                savedOrder, "rwf", "web", remainingToPay);

        // Get the updated session ID from transaction
        OrderTransaction updatedTx = transactionRepository
                .findById(savedOrder.getOrderTransaction().getOrderTransactionId())
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        String stripeSessionId = updatedTx.getStripeSessionId();
        log.info("Stripe session created: {}", stripeSessionId);

        // Transfer locks to Stripe session
        if (stripeSessionId != null && !stripeSessionId.equals(tempSessionId)) {
            transferBatchLocks(tempSessionId, stripeSessionId);
            log.info("Transferred locks from {} to {}", tempSessionId, stripeSessionId);
        }

        log.info("=== HYBRID PAYMENT INITIATED ===");
        log.info("Points: {} (value: {} RWF), Stripe: {} RWF", totalPointsUsed, totalPointsValue, remainingToPay);

        return PointsPaymentResult.builder()
                .success(true)
                .message("Hybrid payment initiated. Complete payment via Stripe.")
                .orderId(savedOrder.getOrderId())
                .orderNumber(savedOrder.getOrderCode())
                .pointsUsed(totalPointsUsed)
                .pointsValue(totalPointsValue)
                .remainingAmount(remainingToPay)
                .stripeSessionId(stripeSessionUrl)
                .hybridPayment(true)
                .shopPointsDeductions(deductions)
                .build();
    }

    @Override
    public PointsPaymentResult completeHybridPayment(UUID userId, Long orderId, String stripeSessionId) {
        try {
            OrderTransaction transaction = transactionRepository.findByStripeSessionId(stripeSessionId)
                    .orElseThrow(() -> new RuntimeException("Transaction not found"));

            // Check if already completed (idempotency)
            if (transaction.getStatus() == OrderTransaction.TransactionStatus.COMPLETED) {
                log.info("Hybrid payment already completed: {}", stripeSessionId);
                Order order = orderRepository.findById(orderId)
                        .orElseThrow(() -> new RuntimeException("Order not found"));
                return buildCompletedHybridResult(order, transaction);
            }

            // Confirm batch locks
            enhancedStockLockService.confirmBatchLocks(stripeSessionId);

            transaction.setStatus(OrderTransaction.TransactionStatus.COMPLETED);
            transaction.setPaymentDate(LocalDateTime.now());
            transactionRepository.save(transaction);

            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));

            // Update shop orders to PROCESSING
            if (order.getShopOrders() != null) {
                for (ShopOrder shopOrder : order.getShopOrders()) {
                    shopOrder.setStatus(ShopOrder.ShopOrderStatus.PROCESSING);
                }
                orderRepository.save(order);
            }

            // Record money flow (only the Stripe portion, not points)
            recordHybridPaymentInMoneyFlow(order, transaction);

            // Send confirmation email
            try {
                orderEmailService.sendOrderConfirmationEmail(order);
            } catch (Exception e) {
                log.error("Failed to send confirmation email: {}", e.getMessage());
            }

            // DO NOT award reward points if points were used for payment
            // Reward points should only be given when Stripe payment completes (in
            // verifyCheckoutSession)
            // For hybrid payments, rewards will be checked when final Stripe payment is
            // verified
            log.info("Reward points will be awarded after Stripe payment completion (hybrid payment)");

            log.info("=== HYBRID PAYMENT COMPLETED ===");
            log.info("Order: {}, Points: {}, Stripe: {} RWF", order.getOrderId(),
                    transaction.getPointsUsed(), transaction.getOrderAmount().subtract(transaction.getPointsValue()));

            return buildCompletedHybridResult(order, transaction);

        } catch (Exception e) {
            log.error("Error completing hybrid payment: {}", e.getMessage(), e);
            return PointsPaymentResult.builder()
                    .success(false)
                    .message("Failed to complete payment: " + e.getMessage())
                    .build();
        }
    }

    private PointsPaymentResult buildCompletedHybridResult(Order order, OrderTransaction transaction) {
        return PointsPaymentResult.builder()
                .success(true)
                .message("Hybrid payment completed successfully!")
                .orderId(order.getOrderId())
                .orderNumber(order.getOrderCode())
                .pointsUsed(transaction.getPointsUsed())
                .pointsValue(transaction.getPointsValue())
                .remainingAmount(BigDecimal.ZERO)
                .stripeSessionId(null)
                .hybridPayment(false)
                .build();
    }

    // Helper class for shop-level calculations
    private static class ShopPointsCalculation {
        UUID shopId;
        String shopName;
        BigDecimal shopTotal;
        Integer availablePoints;
        BigDecimal pointValue;
        Integer pointsToUse;
        BigDecimal pointsValueToUse;
        Integer remainingPointsAfterUse; // Points left for this shop after usage
        List<CartItemDTO> items;
    }

    /**
     * Calculate points usage per shop using CheckoutService for accurate totals
     */
    private List<ShopPointsCalculation> calculateShopPointsUsage(UUID userId, Map<UUID, List<CartItemDTO>> itemsByShop,
            List<PointsPaymentRequest.ShopPointsSelection> selectedShops, AddressDto shippingAddress) {

        // Build a map of selected shops
        Map<UUID, Integer> selectedPointsByShop = new HashMap<>();
        if (selectedShops != null) {
            for (PointsPaymentRequest.ShopPointsSelection selection : selectedShops) {
                selectedPointsByShop.put(selection.getShopId(), selection.getPointsToUse());
            }
        }

        // Use CheckoutService for accurate per-shop totals (including shipping,
        // packaging, NO TAX)
        List<CartItemDTO> allItems = itemsByShop.values().stream()
                .flatMap(List::stream)
                .collect(Collectors.toList());

        PaymentSummaryDTO summary = checkoutService.calculatePaymentSummary(shippingAddress, allItems, userId);

        List<ShopPointsCalculation> calculations = new ArrayList<>();

        log.info("=== CALCULATING SHOP POINTS USAGE ===");

        for (PaymentSummaryDTO.ShopSummary shopSummary : summary.getShopSummaries()) {
            UUID shopId = UUID.fromString(shopSummary.getShopId());

            ShopPointsCalculation calc = new ShopPointsCalculation();
            calc.shopId = shopId;
            calc.items = itemsByShop.get(shopId);
            calc.shopName = shopSummary.getShopName();
            calc.shopTotal = shopSummary.getTotalAmount(); // Includes items + shipping + packaging (NO TAX)

            calc.availablePoints = getAvailablePointsForShop(userId, shopId);
            calc.pointValue = getPointValueForShop(shopId);

            log.info("Shop: {}", calc.shopName);
            log.info("  Total Amount: {} RWF", calc.shopTotal);
            log.info("  Available Points: {}", calc.availablePoints);
            log.info("  Point Value: {} RWF", calc.pointValue);

            // Determine how many points to use
            if (selectedPointsByShop.containsKey(shopId)) {
                // User selected specific amount
                calc.pointsToUse = Math.min(selectedPointsByShop.get(shopId), calc.availablePoints);
                log.info("  User selected: {} points (capped at available: {})",
                        selectedPointsByShop.get(shopId), calc.pointsToUse);
            } else if (selectedShops == null || selectedShops.isEmpty()) {
                // Legacy: use all available
                calc.pointsToUse = calc.availablePoints;
                log.info("  Using all available points: {}", calc.pointsToUse);
            } else {
                // Shop not selected - no points
                calc.pointsToUse = 0;
                log.info("  Shop not selected for points usage");
            }

            // Cap points value at shop total
            BigDecimal maxPointsValue = calc.pointValue.multiply(BigDecimal.valueOf(calc.pointsToUse));
            if (maxPointsValue.compareTo(calc.shopTotal) > 0) {
                // Reduce points to only what's needed
                calc.pointsToUse = calculatePointsNeeded(calc.shopTotal, calc.pointValue);
                calc.pointsValueToUse = calc.pointValue.multiply(BigDecimal.valueOf(calc.pointsToUse));
                log.info("  Capped points to shop total: {} points = {} RWF",
                        calc.pointsToUse, calc.pointsValueToUse);
            } else {
                calc.pointsValueToUse = maxPointsValue;
                log.info("  Points value to use: {} RWF", calc.pointsValueToUse);
            }

            // Calculate remaining points for this shop after usage
            calc.remainingPointsAfterUse = calc.availablePoints - calc.pointsToUse;
            log.info("  Remaining points for {}: {} (after using {})",
                    calc.shopName, calc.remainingPointsAfterUse, calc.pointsToUse);

            calculations.add(calc);
        }

        log.info("====================================");

        return calculations;
    }

    private Map<UUID, List<CartItemDTO>> groupItemsByShop(List<CartItemDTO> items) {
        Map<UUID, List<CartItemDTO>> itemsByShop = new HashMap<>();

        for (CartItemDTO item : items) {
            Shop shop = null;
            if (item.getVariantId() != null) {
                ProductVariant variant = productVariantRepository.findById(item.getVariantId()).orElse(null);
                if (variant != null && variant.getProduct() != null) {
                    shop = variant.getProduct().getShop();
                }
            } else if (item.getProductId() != null) {
                Product product = productRepository.findById(item.getProductId()).orElse(null);
                if (product != null) {
                    shop = product.getShop();
                }
            }

            if (shop != null) {
                itemsByShop.computeIfAbsent(shop.getShopId(), k -> new ArrayList<>()).add(item);
            }
        }

        return itemsByShop;
    }

    private Order createMultiVendorOrder(PointsPaymentRequest request, User user,
            List<ShopPointsCalculation> shopCalculations,
            Map<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> allocations,
            BigDecimal totalAmount, boolean isFullPointsPayment) {

        Order order = new Order();
        order.setUser(user);
        order.setOrderCode(generateOrderNumber());
        order.setStatus("PENDING");

        // Calculate subtotal from all items
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal shippingCost = BigDecimal.ZERO;
        BigDecimal packagingCost = BigDecimal.ZERO;

        for (ShopPointsCalculation calc : shopCalculations) {
            BigDecimal shopSubtotal = calculateShopSubtotal(calc.items);
            BigDecimal shopShippingAndPackaging = calc.shopTotal.subtract(shopSubtotal);

            subtotal = subtotal.add(shopSubtotal);
            shippingCost = shippingCost.add(shopShippingAndPackaging);
        }

        // Order Info (NO TAX)
        OrderInfo orderInfo = new OrderInfo();
        orderInfo.setSubtotal(subtotal);
        orderInfo.setShippingCost(shippingCost);
        orderInfo.setTaxAmount(BigDecimal.ZERO); // NO TAX
        orderInfo.setTotalAmount(totalAmount);
        orderInfo.setDiscountAmount(BigDecimal.ZERO);
        orderInfo.setOrder(order);
        order.setOrderInfo(orderInfo);

        // Address
        OrderAddress orderAddress = new OrderAddress();
        orderAddress.setStreet(request.getShippingAddress().getStreetAddress());
        orderAddress.setRegions(request.getShippingAddress().getCity() + "," + request.getShippingAddress().getState());
        orderAddress.setCountry(request.getShippingAddress().getCountry());
        orderAddress.setLatitude(request.getShippingAddress().getLatitude());
        orderAddress.setLongitude(request.getShippingAddress().getLongitude());
        orderAddress.setOrder(order);
        order.setOrderAddress(orderAddress);

        // Customer Info
        OrderCustomerInfo customerInfo = new OrderCustomerInfo();
        customerInfo.setFirstName(user.getFirstName());
        customerInfo.setLastName(user.getLastName());
        customerInfo.setEmail(user.getUserEmail());
        customerInfo.setPhoneNumber(user.getPhoneNumber());
        customerInfo.setOrder(order);
        order.setOrderCustomerInfo(customerInfo);

        // Transaction
        OrderTransaction tx = new OrderTransaction();
        tx.setOrderAmount(totalAmount);
        tx.setPaymentMethod(
                isFullPointsPayment ? OrderTransaction.PaymentMethod.POINTS : OrderTransaction.PaymentMethod.HYBRID);
        tx.setStatus(OrderTransaction.TransactionStatus.PENDING);
        order.setOrderTransaction(tx);
        tx.setOrder(order);

        // Create ShopOrders
        Set<ShopOrder> shopOrders = new HashSet<>();
        for (ShopPointsCalculation calc : shopCalculations) {
            ShopOrder shopOrder = new ShopOrder();
            shopOrder.setOrder(order);
            shopOrder.setStatus(ShopOrder.ShopOrderStatus.PENDING);

            Shop shop = shopRepository.findById(calc.shopId).orElse(null);
            shopOrder.setShop(shop);

            BigDecimal shopSubtotal = calculateShopSubtotal(calc.items);
            BigDecimal shopShippingAndPackaging = calc.shopTotal.subtract(shopSubtotal);

            shopOrder.setSubtotal(shopSubtotal);
            shopOrder.setShippingCost(shopShippingAndPackaging);
            shopOrder.setPackagingFee(BigDecimal.ZERO);
            shopOrder.setTotalAmount(calc.shopTotal);
            shopOrder.setDiscountAmount(BigDecimal.ZERO);

            // Create order items
            Set<OrderItem> orderItems = new HashSet<>();
            for (CartItemDTO cartItem : calc.items) {
                OrderItem orderItem = new OrderItem();
                orderItem.setShopOrder(shopOrder);
                orderItem.setQuantity(cartItem.getQuantity());

                if (cartItem.getVariantId() != null) {
                    ProductVariant variant = productVariantRepository.findById(cartItem.getVariantId()).orElse(null);
                    if (variant != null) {
                        orderItem.setProductVariant(variant);
                        orderItem.setProduct(variant.getProduct());
                        orderItem.setPrice(calculateDiscountedPrice(variant));
                    }
                } else if (cartItem.getProductId() != null) {
                    Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
                    if (product != null) {
                        orderItem.setProduct(product);
                        orderItem.setPrice(calculateDiscountedPrice(product));
                    }
                }

                orderItems.add(orderItem);
            }
            shopOrder.setItems(orderItems);

            // Shop order transaction
            ShopOrderTransaction shopTx = new ShopOrderTransaction();
            shopTx.setShopOrder(shopOrder);
            shopTx.setGlobalTransaction(tx);
            shopTx.setAmount(calc.shopTotal);
            shopTx.setPointsUsed(calc.pointsToUse != null ? calc.pointsToUse : 0);
            shopTx.setPointsValue(calc.pointsValueToUse != null ? calc.pointsValueToUse : BigDecimal.ZERO);
            shopOrder.setShopOrderTransaction(shopTx);
            tx.getShopTransactions().add(shopTx);

            shopOrders.add(shopOrder);
        }
        order.setShopOrders(shopOrders);

        return order;
    }

    private void createOrderItemBatches(Order order, CartItemDTO cartItem,
            List<FEFOStockAllocationService.BatchAllocation> allocations) {
        OrderItem orderItem = findOrderItemByCartItem(order, cartItem);
        if (orderItem == null) {
            log.warn("Order item not found for cart item: {}", cartItem.getProductId());
            return;
        }

        for (FEFOStockAllocationService.BatchAllocation allocation : allocations) {
            OrderItemBatch orderItemBatch = new OrderItemBatch();
            orderItemBatch.setOrderItem(orderItem);
            orderItemBatch.setStockBatch(allocation.getStockBatch());
            orderItemBatch.setWarehouse(allocation.getWarehouse());
            orderItemBatch.setQuantityUsed(allocation.getQuantityAllocated());
            orderItemBatchRepository.save(orderItemBatch);
        }
    }

    private OrderItem findOrderItemByCartItem(Order order, CartItemDTO cartItem) {
        return order.getShopOrders().stream()
                .flatMap(shopOrder -> shopOrder.getItems().stream())
                .filter(item -> {
                    if (cartItem.getVariantId() != null) {
                        return item.getProductVariant() != null &&
                                item.getProductVariant().getId().equals(cartItem.getVariantId());
                    } else {
                        return item.getProduct() != null &&
                                item.getProduct().getProductId().equals(cartItem.getProductId());
                    }
                })
                .findFirst()
                .orElse(null);
    }

    private Integer calculatePointsNeeded(BigDecimal amount, BigDecimal pointValue) {
        // Round UP: if there's any remainder, add 1 point to cover it
        // Formula: CEIL(amount / pointValue)
        if (pointValue.compareTo(BigDecimal.ZERO) == 0)
            return 0;
        return amount.divide(pointValue, 0, RoundingMode.CEILING).intValue();
    }

    private String generateOrderNumber() {
        return "ORD-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private Integer getAvailablePointsForShop(UUID userId, UUID shopId) {
        try {
            Integer balance = userPointsRepository.calculateCurrentBalanceByShop(userId, shopId);
            return balance != null ? Math.max(0, balance) : 0;
        } catch (Exception e) {
            log.warn("Failed to get points for user {} shop {}: {}", userId, shopId, e.getMessage());
            return 0;
        }
    }

    private BigDecimal getPointValueForShop(UUID shopId) {
        try {
            RewardSystemDTO system = rewardService.getActiveRewardSystem(shopId);
            return system != null && system.getPointValue() != null ? system.getPointValue() : BigDecimal.ZERO;
        } catch (Exception e) {
            log.warn("Failed to get reward system for shop {}: {}", shopId, e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    private void createPointsRecord(User user, UUID shopId, Long orderId, Integer pointsChange,
            BigDecimal pointsValue, String description) {
        Integer current = getAvailablePointsForShop(user.getId(), shopId);
        Integer balanceAfter = current + pointsChange;

        UserPoints record = new UserPoints();
        record.setUser(user);
        if (shopId != null) {
            shopRepository.findById(shopId).ifPresent(record::setShop);
        }
        record.setPoints(pointsChange);
        record.setPointsType(
                pointsChange < 0 ? UserPoints.PointsType.SPENT_PURCHASE : UserPoints.PointsType.ADJUSTMENT);
        record.setDescription(description);
        record.setOrderId(orderId);
        record.setPointsValue(pointsValue);
        record.setBalanceAfter(balanceAfter);
        record.setCreatedAt(LocalDateTime.now());

        userPointsRepository.save(record);
    }

    private void updateShopOrderTransactionPoints(Order order, UUID shopId, Integer pointsUsed,
            BigDecimal pointsValue) {
        for (ShopOrder shopOrder : order.getShopOrders()) {
            if (shopOrder.getShop() != null && shopOrder.getShop().getShopId().equals(shopId)) {
                ShopOrderTransaction shopTx = shopOrder.getShopOrderTransaction();
                if (shopTx != null) {
                    shopTx.setPointsUsed(pointsUsed);
                    shopTx.setPointsValue(pointsValue);
                }
                break;
            }
        }
    }

    private boolean lockStockWithFEFOAllocation(String sessionId, List<CartItemDTO> items, AddressDto shippingAddress) {
        try {
            Map<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> fefoAllocations = warehouseAllocator
                    .allocateStockWithFEFO(items, shippingAddress);

            if (fefoAllocations.isEmpty()) {
                return false;
            }

            List<EnhancedStockLockService.BatchLockRequest> lockRequests = new ArrayList<>();
            for (Map.Entry<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> entry : fefoAllocations
                    .entrySet()) {
                for (FEFOStockAllocationService.BatchAllocation allocation : entry.getValue()) {
                    lockRequests.add(new EnhancedStockLockService.BatchLockRequest(
                            allocation.getStockBatch().getId(),
                            allocation.getQuantityAllocated(),
                            allocation.getWarehouse().getId(),
                            null, null));
                }
            }

            return enhancedStockLockService.lockStockBatches(sessionId, lockRequests);
        } catch (Exception e) {
            log.error("Error locking stock: {}", e.getMessage(), e);
            return false;
        }
    }

    private void transferBatchLocks(String fromSessionId, String toSessionId) {
        try {
            enhancedStockLockService.transferBatchLocks(fromSessionId, toSessionId);
        } catch (Exception e) {
            log.error("Failed to transfer locks: {}", e.getMessage());
        }
    }

    private void validateDeliveryCountry(String country) {
        if (country == null || country.trim().isEmpty()) {
            throw new IllegalArgumentException("Delivery country is required");
        }
        if (!warehouseRepository.existsByCountryIgnoreCase(country.trim())) {
            throw new IllegalArgumentException("Sorry, we don't deliver to " + country);
        }
    }

    private void recordHybridPaymentInMoneyFlow(Order order, OrderTransaction transaction) {
        try {
            BigDecimal pointsValue = transaction.getPointsValue() != null ? transaction.getPointsValue()
                    : BigDecimal.ZERO;
            BigDecimal financialAmount = transaction.getOrderAmount().subtract(pointsValue);

            if (financialAmount.compareTo(BigDecimal.ZERO) > 0) {
                CreateMoneyFlowDTO moneyFlowDTO = new CreateMoneyFlowDTO();
                moneyFlowDTO.setDescription(String.format("Hybrid payment for Order #%s (Stripe portion)",
                        order.getOrderCode()));
                moneyFlowDTO.setType(com.ecommerce.enums.MoneyFlowType.IN);
                moneyFlowDTO.setAmount(financialAmount);
                moneyFlowService.save(moneyFlowDTO);
            }
        } catch (Exception e) {
            log.error("Failed to record money flow: {}", e.getMessage());
        }
    }

    private BigDecimal calculateShopSubtotal(List<CartItemDTO> items) {
        BigDecimal subtotal = BigDecimal.ZERO;
        for (CartItemDTO item : items) {
            BigDecimal itemPrice = BigDecimal.ZERO;
            if (item.getVariantId() != null) {
                ProductVariant variant = productVariantRepository.findById(item.getVariantId()).orElse(null);
                if (variant != null)
                    itemPrice = calculateDiscountedPrice(variant);
            } else if (item.getProductId() != null) {
                Product product = productRepository.findById(item.getProductId()).orElse(null);
                if (product != null)
                    itemPrice = calculateDiscountedPrice(product);
            }
            subtotal = subtotal.add(itemPrice.multiply(BigDecimal.valueOf(item.getQuantity())));
        }
        return subtotal;
    }

    // Discount calculation methods
    private BigDecimal calculateDiscountedPrice(ProductVariant variant) {
        if (variant.getDiscount() != null && variant.getDiscount().isValid() && variant.getDiscount().isActive()) {
            if (validateDiscountValidity(variant.getDiscount())) {
                return variant.getPrice().multiply(BigDecimal.ONE.subtract(
                        variant.getDiscount().getPercentage().divide(BigDecimal.valueOf(100))));
            }
        }
        if (variant.getProduct() != null && variant.getProduct().getDiscount() != null
                && variant.getProduct().getDiscount().isValid() && variant.getProduct().getDiscount().isActive()) {
            if (validateDiscountValidity(variant.getProduct().getDiscount())) {
                return variant.getPrice().multiply(BigDecimal.ONE.subtract(
                        variant.getProduct().getDiscount().getPercentage().divide(BigDecimal.valueOf(100))));
            }
        }
        if (variant.getProduct() != null && variant.getProduct().isOnSale()
                && variant.getProduct().getSalePercentage() != null && variant.getProduct().getSalePercentage() > 0) {
            return variant.getPrice().multiply(BigDecimal.ONE.subtract(
                    BigDecimal.valueOf(variant.getProduct().getSalePercentage()).divide(BigDecimal.valueOf(100))));
        }
        return variant.getPrice();
    }

    private BigDecimal calculateDiscountedPrice(Product product) {
        if (product.getDiscount() != null && product.getDiscount().isValid() && product.getDiscount().isActive()) {
            if (validateDiscountValidity(product.getDiscount())) {
                return product.getPrice().multiply(BigDecimal.ONE.subtract(
                        product.getDiscount().getPercentage().divide(BigDecimal.valueOf(100))));
            }
        }
        if (product.isOnSale() && product.getSalePercentage() != null && product.getSalePercentage() > 0) {
            return product.getPrice().multiply(BigDecimal.ONE.subtract(
                    BigDecimal.valueOf(product.getSalePercentage()).divide(BigDecimal.valueOf(100))));
        }
        return product.getPrice();
    }

    private boolean validateDiscountValidity(Discount discount) {
        LocalDateTime now = LocalDateTime.now();
        if (!discount.isActive())
            return false;
        if (now.isBefore(discount.getStartDate()))
            return false;
        if (discount.getEndDate() != null && now.isAfter(discount.getEndDate()))
            return false;
        if (discount.getUsageLimit() != null && discount.getUsedCount() >= discount.getUsageLimit())
            return false;
        return true;
    }

    @Override
    public PointsEligibilityResponse checkPointsEligibility(PointsEligibilityRequest request) {
        if (request.getUserId() == null) {
            throw new IllegalArgumentException("User ID is required");
        }

        userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getItems() == null || request.getItems().isEmpty()) {
            return PointsEligibilityResponse.builder()
                    .shopEligibilities(Collections.emptyList())
                    .build();
        }

        // Use CheckoutService for accurate per-shop totals (NO TAX)
        PaymentSummaryDTO summary;
        try {
            AddressDto address = request.getShippingAddress();
            if (address == null) {
                log.warn("Shipping address missing in eligibility check");
                address = new AddressDto();
                address.setCountry("Rwanda");
            }

            summary = checkoutService.calculatePaymentSummary(address, request.getItems(), request.getUserId());
        } catch (Exception e) {
            log.error("Error calculating payment summary for eligibility: {}", e.getMessage());
            throw new RuntimeException("Could not calculate order totals: " + e.getMessage());
        }

        List<ShopPointsEligibilityDTO> summaries = new ArrayList<>();

        for (PaymentSummaryDTO.ShopSummary shopSummary : summary.getShopSummaries()) {
            UUID shopId = UUID.fromString(shopSummary.getShopId());

            BigDecimal totalAmount = shopSummary.getTotalAmount();
            int totalProductCount = shopSummary.getProductCount();

            RewardSystem rewardSystem = rewardSystemRepository.findByShopShopIdAndIsActiveTrue(shopId).orElse(null);

            boolean isRewardingEnabled = false;
            Integer potentialPoints = 0;
            BigDecimal pointValue = BigDecimal.ZERO;

            if (rewardSystem != null && Boolean.TRUE.equals(rewardSystem.getIsSystemEnabled())) {
                isRewardingEnabled = true;
                pointValue = rewardSystem.getPointValue();
                potentialPoints = shopSummary.getRewardPoints();
            }

            Integer currentPoints = getAvailablePointsForShop(request.getUserId(), shopId);
            BigDecimal currentPointsValue = pointValue.multiply(BigDecimal.valueOf(currentPoints));
            boolean canPay = isRewardingEnabled && currentPoints > 0;
            BigDecimal maxPayable = currentPointsValue.min(totalAmount);

            String message;
            if (!isRewardingEnabled) {
                message = "Reward system not active for this shop.";
            } else if (currentPoints <= 0) {
                message = "No points available in this shop.";
            } else {
                message = "Include points from this shop";
            }

            summaries.add(ShopPointsEligibilityDTO.builder()
                    .shopId(shopId)
                    .shopName(shopSummary.getShopName())
                    .isRewardingEnabled(isRewardingEnabled)
                    .currentPointsBalance(currentPoints)
                    .currentPointsValue(currentPointsValue)
                    .potentialEarnedPoints(potentialPoints)
                    .totalAmount(totalAmount)
                    .canPayWithPoints(canPay)
                    .maxPointsPayableAmount(maxPayable)
                    .message(message)
                    .build());
        }

        return PointsEligibilityResponse.builder()
                .shopEligibilities(summaries)
                .build();
    }
}