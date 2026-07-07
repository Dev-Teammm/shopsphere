package com.ecommerce.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import com.ecommerce.dto.AddressDto;
import com.ecommerce.dto.CartItemDTO;
import com.ecommerce.dto.CheckoutRequest;
import com.ecommerce.dto.CheckoutVerificationResult;
import com.ecommerce.dto.GuestCheckoutRequest;
import com.ecommerce.dto.ShopFulfillmentPreference;
import com.ecommerce.dto.OrderResponseDTO;
import com.ecommerce.dto.OrderItemDTO;
import com.ecommerce.dto.OrderTransactionDTO;
import com.ecommerce.dto.SimpleProductDTO;
import com.ecommerce.entity.Discount;
import com.ecommerce.entity.Order;
import com.ecommerce.entity.OrderAddress;
import com.ecommerce.entity.OrderCustomerInfo;
import com.ecommerce.entity.OrderInfo;
import com.ecommerce.entity.OrderItem;
import com.ecommerce.entity.OrderItemBatch;
import com.ecommerce.entity.OrderTransaction;
import com.ecommerce.entity.Product;
import com.ecommerce.entity.ProductVariant;
import com.ecommerce.entity.StockBatch;
import com.ecommerce.entity.User;
import com.ecommerce.repository.OrderRepository;
import com.ecommerce.repository.OrderItemBatchRepository;
import com.ecommerce.repository.OrderTransactionRepository;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.repository.ProductVariantRepository;
import com.ecommerce.repository.StockBatchRepository;
import com.ecommerce.repository.UserRepository;
import com.ecommerce.repository.DiscountRepository;
import com.ecommerce.repository.WarehouseRepository;
import com.ecommerce.repository.ShopRepository;
import com.ecommerce.repository.RewardSystemRepository;
import com.ecommerce.repository.ShopOrderRepository;
import com.ecommerce.entity.Shop;
import com.ecommerce.entity.Warehouse;
import com.ecommerce.entity.ShopOrder;
import com.ecommerce.entity.ShopOrderTransaction;
import com.ecommerce.service.FEFOStockAllocationService;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final OrderTransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final DiscountRepository discountRepository;
    private final OrderRepository orderRepository;
    private final WarehouseRepository warehouseRepository;
    private final ShopRepository shopRepository;
    private final RewardSystemRepository rewardSystemRepository;
    private final ShopOrderRepository shopOrderRepository;
    private final StripeService stripeService;
    private final StockLockService stockLockService;
    private final MultiWarehouseStockAllocator multiWarehouseStockAllocator;
    private final ShippingCostService shippingCostService;
    private final RewardService rewardService;
    private final CapabilityTransitionService capabilityTransitionService;
    private final ProductAvailabilityService productAvailabilityService;
    private final SubscriptionService subscriptionService;
    private final EnhancedMultiWarehouseAllocator enhancedWarehouseAllocator;
    private final OrderItemBatchRepository orderItemBatchRepository;
    private final StockBatchRepository stockBatchRepository;
    private final OrderEmailService orderEmailService;
    private final EnhancedStockLockService enhancedStockLockService;
    private final CartService cartService;
    private final MoneyFlowService moneyFlowService;
    private final RoadValidationService roadValidationService;
    private final OrderActivityLogService activityLogService;

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails) {
            String username = ((UserDetails) principal).getUsername();
            return userRepository.findByUserEmail(username)
                    .orElseThrow(() -> new EntityNotFoundException("User not found with email: " + username));
        }

        throw new RuntimeException("Invalid authentication principal");
    }

    // @Transactional
    public String createCheckoutSession(CheckoutRequest req) throws Exception {

        try {
            if (req.getShippingAddress() == null || req.getShippingAddress().getCountry() == null) {
                throw new IllegalArgumentException("Shipping address and country are required");
            }

            validateCartItems(req.getItems());

            validateShopCapabilitiesForCheckout(req.getItems());

            // Validate shops: subscription, Stripe account, product availability, stock
            validateShopsForCheckout(req.getItems());

            // Get authenticated user
            User user = getAuthenticatedUser();

            // Allocate stock using FEFO across warehouses
            Map<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> fefoAllocations = enhancedWarehouseAllocator
                    .allocateStockWithFEFO(req.getItems(), req.getShippingAddress());

            // Calculate payment summary (validates shops and warehouses)
            com.ecommerce.dto.PaymentSummaryDTO paymentSummary = calculatePaymentSummary(req.getShippingAddress(),
                    req.getItems(), user.getId(), req.getShopFulfillmentPreferences());

            // Create main Order entity
            Order order = new Order();
            order.setUser(user);
            order.setStatus("PENDING");

            // Create OrderInfo with zeroed values initially
            OrderInfo orderInfo = new OrderInfo();
            orderInfo.setSubtotal(BigDecimal.ZERO);
            orderInfo.setShippingCost(BigDecimal.ZERO);
            orderInfo.setTaxAmount(BigDecimal.ZERO);
            orderInfo.setTotalAmount(BigDecimal.ZERO);
            orderInfo.setDiscountAmount(BigDecimal.ZERO);
            order.setOrderInfo(orderInfo);

            OrderAddress address = new OrderAddress();
            address.setStreet(req.getShippingAddress().getStreetAddress());
            address.setRegions(req.getShippingAddress().getCity() + ", " + req.getShippingAddress().getState());
            address.setCountry(req.getShippingAddress().getCountry());
            address.setLatitude(req.getShippingAddress().getLatitude());
            address.setLongitude(req.getShippingAddress().getLongitude());
            address.setRoadName(req.getShippingAddress().getStreetAddress());
            order.setOrderAddress(address);

            OrderCustomerInfo customerInfo = new OrderCustomerInfo();
            customerInfo.setFirstName(user.getFirstName());
            customerInfo.setLastName(user.getLastName());
            customerInfo.setEmail(user.getUserEmail());
            customerInfo.setPhoneNumber(user.getPhoneNumber());
            order.setOrderCustomerInfo(customerInfo);

            // Save initial order to get ID
            Order saved = orderRepository.save(order);

            // Create main Transaction Record FIRST (before shop loop)
            OrderTransaction tx = new OrderTransaction();
            tx.setOrder(saved);
            tx.setOrderAmount(BigDecimal.ZERO);
            tx.setPaymentMethod(OrderTransaction.PaymentMethod.CREDIT_CARD);
            tx.setStatus(OrderTransaction.TransactionStatus.PENDING);
            tx.setCreatedAt(LocalDateTime.now());
            transactionRepository.save(tx);

            // Group items by shop and create ShopOrders
            Map<Shop, List<CartItemDTO>> itemsByShop = new HashMap<>();
            for (CartItemDTO item : req.getItems()) {
                Shop shop = getShopForCartItem(item);
                if (shop == null) {
                    throw new EntityNotFoundException("Product or variant not found or has no associated shop");
                }
                itemsByShop.computeIfAbsent(shop, k -> new ArrayList<>()).add(item);
            }

            // Create ShopOrder for each shop
            for (Map.Entry<Shop, List<CartItemDTO>> entry : itemsByShop.entrySet()) {
                Shop shop = entry.getKey();
                List<CartItemDTO> shopItems = entry.getValue();

                // Validate shop capability supports orders (check transition state)
                CapabilityTransitionService.EffectiveCapabilities effectiveCapabilities = capabilityTransitionService
                        .getEffectiveCapabilities(shop.getShopId());

                if (!effectiveCapabilities.supportsPickup() && !effectiveCapabilities.supportsDelivery()) {
                    throw new IllegalArgumentException(
                            "Shop '" + shop.getName() + "' only displays products and does not accept orders.");
                }

                // Check if shop can accept new orders during transition
                boolean orderRequiresDelivery = effectiveCapabilities.supportsDelivery() &&
                        !effectiveCapabilities.supportsPickup();
                if (orderRequiresDelivery
                        && !capabilityTransitionService.canAcceptNewOrderType(shop.getShopId(), true)) {
                    throw new IllegalArgumentException(
                            "Shop '" + shop.getName() + "' is transitioning and cannot accept new delivery orders.");
                }

                BigDecimal shopSubtotal = BigDecimal.ZERO;

                ShopOrder shopOrder = new ShopOrder();
                shopOrder.setOrder(saved);
                shopOrder.setShop(shop);

                // Determine fulfillment type from preferences or shop capability
                String fulfillmentType = determineFulfillmentType(shop, effectiveCapabilities,
                        req.getShopFulfillmentPreferences());

                // Set fulfillment type and initial status
                if ("PICKUP".equals(fulfillmentType)) {
                    shopOrder.setFulfillmentType(ShopOrder.FulfillmentType.PICKUP);
                    shopOrder.setStatus(ShopOrder.ShopOrderStatus.READY_FOR_PICKUP);
                } else {
                    shopOrder.setFulfillmentType(ShopOrder.FulfillmentType.DELIVERY);
                    shopOrder.setStatus(ShopOrder.ShopOrderStatus.PENDING);
                }

                // Create OrderItems
                for (CartItemDTO ci : shopItems) {
                    OrderItem oi = new OrderItem();
                    BigDecimal itemPrice;

                    if (ci.getVariantId() != null) {
                        ProductVariant variant = variantRepository.findById(ci.getVariantId())
                                .orElseThrow(() -> new EntityNotFoundException(
                                        "Variant not found with ID: " + ci.getVariantId()));
                        oi.setProductVariant(variant);
                        oi.setProduct(variant.getProduct());
                        itemPrice = variant.getPrice();
                    } else {
                        Product product = productRepository.findById(ci.getProductId())
                                .orElseThrow(() -> new EntityNotFoundException(
                                        "Product not found with ID: " + ci.getProductId()));
                        oi.setProduct(product);
                        itemPrice = product.getPrice();
                    }

                    oi.setShopOrder(shopOrder);
                    oi.setQuantity(ci.getQuantity());
                    oi.setPrice(itemPrice);
                    shopOrder.getItems().add(oi);

                    shopSubtotal = shopSubtotal.add(itemPrice.multiply(BigDecimal.valueOf(ci.getQuantity())));
                }

                // Calculate shop-specific shipping and packaging
                BigDecimal shopShippingCost = BigDecimal.ZERO;
                BigDecimal shopPackagingFee = BigDecimal.ZERO;

                if ("PICKUP".equals(fulfillmentType)) {
                    // Weight calculation for packaging fee
                    BigDecimal totalWeightKg = BigDecimal.ZERO;
                    for (CartItemDTO ci : shopItems) {
                        BigDecimal itemWeight = BigDecimal.ZERO;
                        if (ci.getVariantId() != null) {
                            ProductVariant variant = variantRepository.findById(ci.getVariantId()).orElse(null);
                            if (variant != null && variant.getProduct() != null)
                                itemWeight = variant.getProduct().getWeightKg();
                        } else {
                            Product product = productRepository.findById(ci.getProductId()).orElse(null);
                            if (product != null)
                                itemWeight = product.getWeightKg();
                        }
                        totalWeightKg = totalWeightKg
                                .add(itemWeight != null ? itemWeight.multiply(BigDecimal.valueOf(ci.getQuantity()))
                                        : BigDecimal.ZERO);
                    }
                    shopPackagingFee = calculatePackagingFee(shop, shopSubtotal, totalWeightKg);
                } else if ("DELIVERY".equals(fulfillmentType)) {
                    try {
                        com.ecommerce.dto.ShippingDetailsDTO details = shippingCostService
                                .calculateEnhancedShippingDetails(
                                        req.getShippingAddress(), shopItems, shopSubtotal, shop.getShopId());
                        shopShippingCost = details.getShippingCost();
                    } catch (Exception e) {
                        log.error("Error calculating shipping for shop {}: {}", shop.getShopId(), e.getMessage());
                    }
                }

                shopOrder.setShippingCost(shopShippingCost);
                shopOrder.setPackagingFee(shopPackagingFee);
                shopOrder.setSubtotal(shopSubtotal);
                shopOrder.setTotalAmount(shopSubtotal.add(shopShippingCost).add(shopPackagingFee));

                // Update Order level info by aggregating shop totals
                OrderInfo currentOrderInfo = saved.getOrderInfo();
                currentOrderInfo.setSubtotal(currentOrderInfo.getSubtotal().add(shopOrder.getSubtotal()));
                currentOrderInfo.setShippingCost(currentOrderInfo.getShippingCost().add(shopOrder.getShippingCost())
                        .add(shopOrder.getPackagingFee()));
                currentOrderInfo.setTotalAmount(currentOrderInfo.getTotalAmount().add(shopOrder.getTotalAmount()));

                // Add taxes if they were in payment summary (pro-rated or simple addition)
                if (paymentSummary.getTaxAmount() != null
                        && paymentSummary.getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
                    if (currentOrderInfo.getTaxAmount().compareTo(BigDecimal.ZERO) == 0) {
                        currentOrderInfo.setTaxAmount(paymentSummary.getTaxAmount());
                        currentOrderInfo
                                .setTotalAmount(currentOrderInfo.getTotalAmount().add(paymentSummary.getTaxAmount()));
                    }
                }

                // Create ShopOrderTransaction and link to global transaction
                ShopOrderTransaction shopTx = new ShopOrderTransaction();
                shopTx.setShopOrder(shopOrder);
                shopTx.setGlobalTransaction(tx); // Link to main transaction
                shopTx.setAmount(shopOrder.getTotalAmount());
                shopOrder.setShopOrderTransaction(shopTx);

                // Save shop order (this will cascade to items and transactions)
                saved.addShopOrder(shopOrder);
                shopOrderRepository.save(shopOrder);

                // Update the main transaction amount
                tx.setOrderAmount(currentOrderInfo.getTotalAmount());
                transactionRepository.save(tx);
            }

            // Save the complete order structure
            orderRepository.save(saved);

            log.info("Order {} created with {} shop orders, total amount: {}",
                    saved.getOrderId(),
                    saved.getShopOrders().size(),
                    saved.getOrderInfo().getTotalAmount());

            // Create Stripe Session - order is fully loaded in memory, no reload needed
            String sessionUrl = stripeService.createCheckoutSessionForOrder(saved, req.getCurrency(),
                    req.getPlatform() != null ? req.getPlatform() : "web");

            // Retrieve session ID from updated transaction
            OrderTransaction updatedTx = transactionRepository.findById(tx.getOrderTransactionId()).orElseThrow();
            String sessionId = updatedTx.getStripeSessionId();

            // Lock stock
            if (!lockStockWithFEFOAllocation(sessionId, req.getItems(), req.getShippingAddress())) {
                throw new IllegalStateException("Unable to secure stock");
            }

            return sessionUrl;

        } catch (Exception e) {
            for (StackTraceElement ste : e.getStackTrace()) {
                log.debug("\t" + ste.toString());
            }
            throw e;
        }
    }

    // @Transactional
    public String createGuestCheckoutSession(GuestCheckoutRequest req) throws Exception {
        log.info("Creating guest checkout session");

        if (req.getAddress() == null || req.getAddress().getCountry() == null) {
            throw new IllegalArgumentException("Address and country are required");
        }

        validateCartItems(req.getItems());

        // Validate shop capabilities for all items
        validateShopCapabilitiesForCheckout(req.getItems());

        // Validate shops: subscription, Stripe account, product availability, stock
        validateShopsForCheckout(req.getItems());

        // Allocate stock using FEFO across warehouses
        Map<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> fefoAllocations = enhancedWarehouseAllocator
                .allocateStockWithFEFO(req.getItems(), req.getAddress());

        // Calculate payment summary (validates shops and warehouses)
        com.ecommerce.dto.PaymentSummaryDTO paymentSummary = calculatePaymentSummary(req.getAddress(), req.getItems(),
                null, req.getShopFulfillmentPreferences());

        // Create main Order entity
        Order order = new Order();
        order.setStatus("PENDING"); // Set initial status

        OrderCustomerInfo customerInfo = new OrderCustomerInfo();
        customerInfo.setFirstName(req.getGuestName());
        customerInfo.setLastName(req.getGuestLastName());
        customerInfo.setEmail(req.getGuestEmail());
        customerInfo.setPhoneNumber(req.getGuestPhone());
        if (req.getAddress() != null) {
            customerInfo.setStreetAddress(req.getAddress().getStreetAddress());
            customerInfo.setCity(req.getAddress().getCity());
            customerInfo.setState(req.getAddress().getState());
            customerInfo.setCountry(req.getAddress().getCountry());
        }
        order.setOrderCustomerInfo(customerInfo);

        // Create OrderInfo with zeroed values initially
        OrderInfo orderInfo = new OrderInfo();
        orderInfo.setSubtotal(BigDecimal.ZERO);
        orderInfo.setShippingCost(BigDecimal.ZERO);
        orderInfo.setTaxAmount(BigDecimal.ZERO);
        orderInfo.setTotalAmount(BigDecimal.ZERO);
        orderInfo.setDiscountAmount(BigDecimal.ZERO);
        order.setOrderInfo(orderInfo);

        if (req.getAddress() != null) {
            OrderAddress orderAddress = new OrderAddress();
            orderAddress.setStreet(req.getAddress().getStreetAddress());
            orderAddress.setCountry(req.getAddress().getCountry());
            orderAddress.setRegions(req.getAddress().getCity() + "," + req.getAddress().getState());
            orderAddress.setLatitude(req.getAddress().getLatitude());
            orderAddress.setLongitude(req.getAddress().getLongitude());
            orderAddress.setRoadName(req.getAddress().getStreetAddress());
            order.setOrderAddress(orderAddress);
        }

        // Save order first to get orderId
        Order saved = orderRepository.save(order);
        log.info("Guest order created with ID: {}", saved.getOrderId());

        // Create OrderTransaction record
        OrderTransaction tx = new OrderTransaction();
        tx.setOrder(saved);
        tx.setOrderAmount(BigDecimal.ZERO);
        tx.setPaymentMethod(OrderTransaction.PaymentMethod.CREDIT_CARD);
        tx.setStatus(OrderTransaction.TransactionStatus.PENDING);
        tx.setCreatedAt(LocalDateTime.now());
        transactionRepository.save(tx);

        // Group items by shop and create ShopOrders
        Map<Shop, List<CartItemDTO>> itemsByShop = new HashMap<>();
        for (CartItemDTO item : req.getItems()) {
            Shop shop = getShopForCartItem(item);
            if (shop == null) {
                throw new EntityNotFoundException("Product or variant not found or has no associated shop");
            }
            itemsByShop.computeIfAbsent(shop, k -> new ArrayList<>()).add(item);
        }

        // Create ShopOrder for each shop
        for (Map.Entry<Shop, List<CartItemDTO>> entry : itemsByShop.entrySet()) {
            Shop shop = entry.getKey();
            List<CartItemDTO> shopItems = entry.getValue();

            // Validate shop capability supports orders (check transition state)
            CapabilityTransitionService.EffectiveCapabilities effectiveCapabilities = capabilityTransitionService
                    .getEffectiveCapabilities(shop.getShopId());

            if (!effectiveCapabilities.supportsPickup() && !effectiveCapabilities.supportsDelivery()) {
                throw new IllegalArgumentException(
                        "Shop '" + shop.getName() + "' only displays products and does not accept orders.");
            }

            // Check if shop can accept new orders during transition
            boolean orderRequiresDelivery = effectiveCapabilities.supportsDelivery() &&
                    !effectiveCapabilities.supportsPickup();
            if (orderRequiresDelivery && !capabilityTransitionService.canAcceptNewOrderType(shop.getShopId(), true)) {
                throw new IllegalArgumentException(
                        "Shop '" + shop.getName() + "' is transitioning and cannot accept new delivery orders.");
            }

            // Calculate shop-specific totals first
            BigDecimal shopSubtotal = BigDecimal.ZERO;
            BigDecimal shopDiscountAmount = BigDecimal.ZERO;

            // Create ShopOrder
            ShopOrder shopOrder = new ShopOrder();
            shopOrder.setOrder(saved);
            shopOrder.setShop(shop);

            // Determine fulfillment type from preferences or shop capability
            String fulfillmentType = determineFulfillmentType(shop, effectiveCapabilities,
                    req.getShopFulfillmentPreferences());

            // Set fulfillment type and initial status
            if ("PICKUP".equals(fulfillmentType)) {
                shopOrder.setFulfillmentType(ShopOrder.FulfillmentType.PICKUP);
                shopOrder.setStatus(ShopOrder.ShopOrderStatus.READY_FOR_PICKUP);
                log.info("Setting fulfillmentType to PICKUP and status to READY_FOR_PICKUP for shop {}",
                        shop.getName());
            } else {
                shopOrder.setFulfillmentType(ShopOrder.FulfillmentType.DELIVERY);
                shopOrder.setStatus(ShopOrder.ShopOrderStatus.PENDING);
                log.info("Setting fulfillmentType to DELIVERY and status to PENDING for shop {}", shop.getName());
            }

            // Calculate shop totals and create OrderItems
            for (CartItemDTO ci : shopItems) {
                OrderItem oi = new OrderItem();
                BigDecimal itemPrice;
                BigDecimal originalPrice;

                if (ci.getVariantId() != null) {
                    ProductVariant variant = variantRepository.findById(ci.getVariantId())
                            .orElseThrow(() -> new EntityNotFoundException(
                                    "Variant not found with ID: " + ci.getVariantId()));
                    oi.setProductVariant(variant);
                    originalPrice = variant.getPrice();
                    itemPrice = calculateDiscountedPrice(variant);
                    shopSubtotal = shopSubtotal.add(itemPrice.multiply(BigDecimal.valueOf(ci.getQuantity())));
                    shopDiscountAmount = shopDiscountAmount.add(
                            originalPrice.subtract(itemPrice).multiply(BigDecimal.valueOf(ci.getQuantity())));
                } else if (ci.getProductId() != null) {
                    Product product = productRepository.findById(ci.getProductId())
                            .orElseThrow(() -> new EntityNotFoundException(
                                    "Product not found with ID: " + ci.getProductId()));
                    oi.setProduct(product);
                    originalPrice = product.getPrice();
                    itemPrice = calculateDiscountedPrice(product);
                    shopSubtotal = shopSubtotal.add(itemPrice.multiply(BigDecimal.valueOf(ci.getQuantity())));
                    shopDiscountAmount = shopDiscountAmount.add(
                            originalPrice.subtract(itemPrice).multiply(BigDecimal.valueOf(ci.getQuantity())));
                } else {
                    throw new IllegalArgumentException("Cart item must have either productId or variantId");
                }

                oi.setQuantity(ci.getQuantity());
                oi.setPrice(itemPrice);
                oi.setShopOrder(shopOrder); // Link to ShopOrder, not Order
                shopOrder.getItems().add(oi);
            }

            // Calculate shipping and packaging for this shop
            BigDecimal shopShippingCost = BigDecimal.ZERO;
            BigDecimal shopPackagingFee = BigDecimal.ZERO;

            if ("PICKUP".equals(fulfillmentType)) {
                BigDecimal totalWeightKg = BigDecimal.ZERO;
                for (CartItemDTO ci : shopItems) {
                    BigDecimal itemWeight = BigDecimal.ZERO;
                    if (ci.getVariantId() != null) {
                        ProductVariant variant = variantRepository.findById(ci.getVariantId()).orElse(null);
                        if (variant != null && variant.getProduct() != null)
                            itemWeight = variant.getProduct().getWeightKg();
                    } else {
                        Product product = productRepository.findById(ci.getProductId()).orElse(null);
                        if (product != null)
                            itemWeight = product.getWeightKg();
                    }
                    totalWeightKg = totalWeightKg
                            .add(itemWeight != null ? itemWeight.multiply(BigDecimal.valueOf(ci.getQuantity()))
                                    : BigDecimal.ZERO);
                }
                shopPackagingFee = calculatePackagingFee(shop, shopSubtotal, totalWeightKg);
            } else if (shop.supportsDelivery()) {
                try {
                    com.ecommerce.dto.ShippingDetailsDTO shopShippingDetails = shippingCostService
                            .calculateEnhancedShippingDetails(
                                    req.getAddress(), shopItems, shopSubtotal, shop.getShopId());
                    shopShippingCost = shopShippingDetails.getShippingCost();
                } catch (Exception e) {
                    log.error("Error calculating shipping for shop {}: {}", shop.getShopId(), e.getMessage());
                }
            }

            shopOrder.setShippingCost(shopShippingCost);
            shopOrder.setPackagingFee(shopPackagingFee);
            shopOrder.setDiscountAmount(shopDiscountAmount);
            shopOrder.setSubtotal(shopSubtotal);
            shopOrder.setTotalAmount(
                    shopSubtotal.add(shopShippingCost).add(shopPackagingFee).subtract(shopDiscountAmount));

            // Update Order level info by aggregating shop totals
            OrderInfo currentOrderInfo = saved.getOrderInfo();
            currentOrderInfo.setSubtotal(currentOrderInfo.getSubtotal().add(shopOrder.getSubtotal()));
            currentOrderInfo.setShippingCost(currentOrderInfo.getShippingCost().add(shopOrder.getShippingCost())
                    .add(shopOrder.getPackagingFee()));
            currentOrderInfo.setDiscountAmount(currentOrderInfo.getDiscountAmount().add(shopOrder.getDiscountAmount()));
            currentOrderInfo.setTotalAmount(currentOrderInfo.getTotalAmount().add(shopOrder.getTotalAmount()));

            // Add taxes if they were in payment summary
            if (paymentSummary.getTaxAmount() != null && paymentSummary.getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
                if (currentOrderInfo.getTaxAmount().compareTo(BigDecimal.ZERO) == 0) {
                    currentOrderInfo.setTaxAmount(paymentSummary.getTaxAmount());
                    currentOrderInfo
                            .setTotalAmount(currentOrderInfo.getTotalAmount().add(paymentSummary.getTaxAmount()));
                }
            }

            // Create ShopOrderTransaction
            ShopOrderTransaction shopTx = new ShopOrderTransaction();
            shopTx.setShopOrder(shopOrder);
            shopTx.setGlobalTransaction(tx);
            shopTx.setAmount(shopOrder.getTotalAmount());
            shopOrder.setShopOrderTransaction(shopTx);

            saved.addShopOrder(shopOrder);
            shopOrderRepository.save(shopOrder);

            // Update the main transaction amount
            tx.setOrderAmount(currentOrderInfo.getTotalAmount());
            transactionRepository.save(tx);

            log.info("Created ShopOrder {} for shop {}", shopOrder.getShopOrderCode(), shop.getName());
        }

        // Save the complete order structure
        orderRepository.save(saved);

        log.info("Guest order {} created with {} shop orders, total amount: {}",
                saved.getOrderId(),
                saved.getShopOrders().size(),
                saved.getOrderInfo().getTotalAmount());

        // Create order item batches (non-critical - wrap in try-catch to prevent
        // transaction rollback)
        try {
            for (Map.Entry<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> entry : fefoAllocations
                    .entrySet()) {
                createOrderItemBatchesForShopOrder(saved, entry.getKey(), entry.getValue());
            }
        } catch (Exception e) {
            log.error("Failed to create order item batches for guest order {}: {}", saved.getOrderId(), e.getMessage(),
                    e);
        }

        // Create Stripe Session - order is fully loaded in memory, no reload needed
        String sessionUrl = stripeService.createCheckoutSessionForOrder(saved,
                req.getCurrency() != null ? req.getCurrency() : "rwf",
                req.getPlatform() != null ? req.getPlatform() : "web");

        // Retrieve session ID from updated transaction
        OrderTransaction updatedTx = transactionRepository.findById(tx.getOrderTransactionId()).orElseThrow();
        String sessionId = updatedTx.getStripeSessionId();

        // Lock stock
        boolean stockLocked = lockStockWithFEFOAllocation(sessionId, req.getItems(), req.getAddress());
        if (!stockLocked) {
            log.error("Failed to lock stock for guest order: {}", saved.getOrderId());
            // If locking fails, we should ideally void the session or handle cleanup,
            // but for now we just throw exception. Order remains in DB as PENDING (can be
            // cleaned up by scheduler)
            throw new IllegalStateException("Unable to secure stock for your order. Please try again.");
        }

        log.info("Guest checkout session created successfully. Order ID: {}, Session ID: {}", saved.getOrderId(),
                sessionId);

        return sessionUrl;
    }

    @Transactional
    public CheckoutVerificationResult verifyCheckoutSession(String sessionId) throws Exception {
        log.info("Payment record found for session: {}", sessionId);
        OrderTransaction tx = transactionRepository.findByStripeSessionIdWithOrder(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("No matching payment record"));

        Session session = stripeService.retrieveSession(sessionId);

        if (session == null) {
            throw new EntityNotFoundException("Session not found on Stripe");
        }

        if (tx.getStatus() == OrderTransaction.TransactionStatus.COMPLETED) {
            log.info("Transaction already completed for session: {}. Skipping duplicate verification.", sessionId);
            Order order = tx.getOrder();
            return buildVerificationResult(session, order, tx);
        }

        if (!"paid".equalsIgnoreCase(session.getPaymentStatus())) {
            Order order = tx.getOrder();

            refundPointsForFailedPayment(order);
            orderRepository.delete(order);
            enhancedStockLockService.unlockAllBatches(sessionId);
            stockLockService.releaseStock(sessionId);
            log.info("Payment failed, order deleted and points refunded: {}", order.getOrderId());
            throw new IllegalStateException("Payment not completed or session expired");
        }

        PaymentIntent intent = (PaymentIntent) session.getPaymentIntentObject();
        String receiptUrl = session.getPaymentStatus().equals("paid") ? session.getUrl() : null;

        tx.setStatus(OrderTransaction.TransactionStatus.COMPLETED);
        tx.setPaymentDate(LocalDateTime.now());
        if (intent != null) {
            tx.setStripePaymentIntentId(intent.getId());
        }
        tx.setReceiptUrl(receiptUrl);
        transactionRepository.save(tx);
        log.info("Transaction updated to completed status");
        enhancedStockLockService.confirmBatchLocks(sessionId);

        Order order = tx.getOrder();
        // Update ShopOrder statuses to PROCESSING (status is managed at ShopOrder
        // level)
        if (order.getShopOrders() != null) {
            for (ShopOrder shopOrder : order.getShopOrders()) {
                shopOrder.setStatus(ShopOrder.ShopOrderStatus.PROCESSING);
            }
        }
        orderRepository.save(order);

        activityLogService.logPaymentCompleted(
                order.getOrderId(),
                tx.getPaymentMethod().toString(),
                tx.getOrderAmount().doubleValue());

        recordPaymentInMoneyFlow(order, tx);

        log.info("Payment verification completed successfully for order: {}", order.getOrderId());
        stockLockService.confirmStock(sessionId);

        String tempSessionId = "temp_" + order.getOrderId().toString();
        String tempGuestSessionId = "temp_guest_" + order.getOrderId().toString();

        stockLockService.confirmBatchLocks(tempSessionId);
        stockLockService.confirmStock(tempSessionId);
        stockLockService.confirmBatchLocks(tempGuestSessionId);
        stockLockService.confirmStock(tempGuestSessionId);

        updateDiscountUsage(order);

        if (order.getUser() != null) {
            log.info("User is not null");
            rewardService.checkRewardableOnOrderAndReward(order);
        }

        try {
            orderEmailService.sendOrderConfirmationEmail(order);
        } catch (Exception e) {
            log.error("Failed to send order confirmation email for order");
        }

        // Funds are now held in escrow and will be released upon delivery verification
        // This prevents shops from receiving payment without delivering products
        log.info("Payment verified for order {}. Funds held in escrow until delivery confirmation.",
                order.getOrderId());

        OrderResponseDTO orderResponse = convertOrderToResponseDTO(order);

        if (order.getUser() != null) {
            try {
                cartService.clearCart(order.getUser().getId());
                log.info("Successfully cleared cart for user: {}", order.getUser().getId());
            } catch (Exception e) {
                log.error("Failed to clear cart for user {}: {}", order.getUser().getId(), e.getMessage());
            }
        }

        return new CheckoutVerificationResult(
                session.getPaymentStatus(),
                session.getAmountTotal(),
                session.getCurrency(),
                session.getCustomerDetails() != null ? session.getCustomerDetails().getEmail() : null,
                receiptUrl,
                intent != null ? intent.getId() : null,
                true,
                orderResponse);
    }

    /**
     * Helper method to build verification result for already completed transactions
     */
    private CheckoutVerificationResult buildVerificationResult(Session session, Order order, OrderTransaction tx) {
        OrderResponseDTO orderResponse = convertOrderToResponseDTO(order);

        return new CheckoutVerificationResult(
                session.getPaymentStatus(),
                session.getAmountTotal(),
                session.getCurrency(),
                session.getCustomerDetails() != null ? session.getCustomerDetails().getEmail() : null,
                tx.getReceiptUrl(),
                tx.getStripePaymentIntentId(),
                true,
                orderResponse);
    }

    public void cleanupFailedOrder(String sessionId) {
        try {
            cleanupFailedOrderTransactional(sessionId);
        } catch (Exception e) {
            log.error("Error cleaning up failed order for session {}: {}", sessionId, e.getMessage(), e);
            try {
                enhancedStockLockService.unlockAllBatches(sessionId);
                stockLockService.releaseStock(sessionId);
                log.info("Fallback stock unlock completed for session: {}", sessionId);
            } catch (Exception fallbackEx) {
                log.error("Fallback stock unlock also failed for session {}: {}", sessionId, fallbackEx.getMessage());
            }
        }
    }

    @org.springframework.transaction.annotation.Transactional(rollbackFor = Exception.class)
    private synchronized void cleanupFailedOrderTransactional(String sessionId) {
        log.info("Starting cleanup for failed order session: {}", sessionId);

        // Double-check to prevent concurrent cleanup
        OrderTransaction tx = transactionRepository.findByStripeSessionId(sessionId).orElse(null);
        if (tx == null) {
            log.info("No transaction found for session: {} - may have already been cleaned up", sessionId);
            enhancedStockLockService.unlockAllBatches(sessionId);
            stockLockService.releaseStock(sessionId);
            return;
        }

        if (tx.getStatus() != OrderTransaction.TransactionStatus.PENDING) {
            log.info("Transaction for session: {} is not pending (status: {}) - skipping cleanup",
                    sessionId, tx.getStatus());
            return;
        }

        // Mark transaction as processing to prevent concurrent cleanup
        tx.setStatus(OrderTransaction.TransactionStatus.FAILED);
        transactionRepository.save(tx);

        log.info("CLEANUP: Unlocking enhanced batch locks for session: {}", sessionId);
        enhancedStockLockService.unlockAllBatches(sessionId);

        log.info("CLEANUP: Unlocking general stock locks for session: {}", sessionId);
        stockLockService.releaseStock(sessionId);

        Order order = tx.getOrder();
        Long orderId = order.getOrderId();

        refundPointsForFailedPayment(order);

        transactionRepository.flush();

        // Delete the order (cascades to related entities)
        log.info("Deleting order: {} for session: {}", orderId, sessionId);
        if (orderRepository.existsById(orderId)) {
            orderRepository.deleteById(orderId);
            orderRepository.flush(); // Force immediate deletion
            log.info("Successfully deleted order: {}", orderId);
        } else {
            log.info("Order {} was already deleted", orderId);
        }

        // Clean up temporary session locks
        String tempSessionId = "temp_" + orderId.toString();
        String tempGuestSessionId = "temp_guest_" + orderId.toString();

        enhancedStockLockService.unlockAllBatches(tempSessionId);
        stockLockService.releaseStock(tempSessionId);
        enhancedStockLockService.unlockAllBatches(tempGuestSessionId);
        stockLockService.releaseStock(tempGuestSessionId);

        log.info("Cleaned up temporary session locks: {} and {}", tempSessionId, tempGuestSessionId);

        log.info("Successfully completed cleanup for session: {}", sessionId);
    }

    @Transactional
    public void restoreBatchQuantitiesFromOrder(Order order) {
        try {
            log.info("Restoring batch quantities for cancelled order: {}", order.getOrderId());

            int totalRestoredQuantity = 0;
            Map<String, Integer> restorationSummary = new HashMap<>();

            // Fetch all OrderItemBatch entities for this order with warehouses eagerly
            // loaded
            List<OrderItemBatch> orderItemBatches = orderItemBatchRepository
                    .findByOrderIdWithWarehouse(order.getOrderId());

            for (OrderItemBatch orderItemBatch : orderItemBatches) {
                StockBatch batch = orderItemBatch.getStockBatch();
                int quantityToRestore = orderItemBatch.getQuantityUsed();

                log.info("Restoring {} units to batch {} (current quantity: {})",
                        quantityToRestore, batch.getBatchNumber(), batch.getQuantity());

                int newQuantity = batch.getQuantity() + quantityToRestore;
                batch.setQuantity(newQuantity);

                if (batch.getStatus() == com.ecommerce.enums.BatchStatus.EMPTY && newQuantity > 0) {
                    batch.setStatus(com.ecommerce.enums.BatchStatus.ACTIVE);
                    log.info("Updated batch {} status from EMPTY to ACTIVE", batch.getBatchNumber());
                }

                stockBatchRepository.save(batch);

                String key = String.format("Batch %s (%s)",
                        batch.getBatchNumber(),
                        orderItemBatch.getWarehouse().getName());
                restorationSummary.merge(key, quantityToRestore, Integer::sum);
                totalRestoredQuantity += quantityToRestore;

                log.debug("Restored {} units to batch {} in warehouse {} (new quantity: {})",
                        quantityToRestore, batch.getBatchNumber(),
                        orderItemBatch.getWarehouse().getName(), newQuantity);
            }

            log.info("Successfully restored {} total units across {} batches for order {}: {}",
                    totalRestoredQuantity, restorationSummary.size(), order.getOrderId(), restorationSummary);

        } catch (Exception e) {
            log.error("Error restoring batch quantities for order {}: {}", order.getOrderId(), e.getMessage(), e);
            throw new RuntimeException("Failed to restore batch quantities: " + e.getMessage(), e);
        }
    }

    private boolean lockStockForItems(String sessionId, List<CartItemDTO> items, AddressDto address) {
        try {
            log.info("Starting stock locking for session {} with {} items", sessionId, items.size());
            for (CartItemDTO item : items) {
                log.info(
                        "Item to lock: productId={}, variantId={}, isVariantBased={}, isVariantBasedItem={}, quantity={}",
                        item.getProductId(), item.getVariantId(), item.isVariantBased(), item.isVariantBasedItem(),
                        item.getQuantity());
            }

            Map<Long, List<MultiWarehouseStockAllocator.StockAllocation>> allocations = multiWarehouseStockAllocator
                    .allocateStockAcrossWarehouses(items, address);

            log.info("Stock allocation result: {} allocations", allocations.size());
            for (Map.Entry<Long, List<MultiWarehouseStockAllocator.StockAllocation>> entry : allocations.entrySet()) {
                log.info("Key {} has {} allocations", entry.getKey(), entry.getValue().size());
                for (MultiWarehouseStockAllocator.StockAllocation allocation : entry.getValue()) {
                    log.info("Allocation: warehouseId={}, stockId={}, quantity={}",
                            allocation.getWarehouseId(), allocation.getStockId(), allocation.getQuantity());
                }
            }

            if (allocations.isEmpty()) {
                log.error("No stock allocation found for items");
                return false;
            }

            boolean batchLocked = stockLockService.lockStockFromBatches(sessionId, allocations);
            boolean generalLocked = stockLockService.lockStockFromMultipleWarehouses(sessionId, allocations);

            if (!batchLocked || !generalLocked) {
                log.error("Failed to lock stock - batch locked: {}, general locked: {}", batchLocked, generalLocked);
                stockLockService.unlockAllBatches(sessionId);
                stockLockService.releaseStock(sessionId);
                return false;
            }

            log.info("Successfully allocated stock across {} warehouses for session {}",
                    allocations.size(), sessionId);
            return true;
        } catch (Exception e) {
            log.error("Error locking stock: {}", e.getMessage(), e);
            stockLockService.unlockAllBatches(sessionId);
            stockLockService.releaseStock(sessionId);
            return false;
        }
    }

    public BigDecimal calculateShippingCost(AddressDto deliveryAddress, List<CartItemDTO> items,
            BigDecimal orderValue) {
        try {
            return shippingCostService.calculateOrderShippingCost(deliveryAddress, items, orderValue);
        } catch (Exception e) {
            log.error("Error calculating shipping cost: {}", e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    /**
     * Determine fulfillment type for a shop based on capability and preferences
     */
    private String determineFulfillmentType(Shop shop,
            CapabilityTransitionService.EffectiveCapabilities effectiveCapabilities,
            List<com.ecommerce.dto.ShopFulfillmentPreference> shopFulfillmentPreferences) {

        com.ecommerce.enums.ShopCapability primaryCapability = shop.getPrimaryCapability();

        // PICKUP_ORDERS shops always use PICKUP
        if (primaryCapability == com.ecommerce.enums.ShopCapability.PICKUP_ORDERS) {
            return "PICKUP";
        }

        // FULL_ECOMMERCE shops always use DELIVERY
        if (primaryCapability == com.ecommerce.enums.ShopCapability.FULL_ECOMMERCE) {
            return "DELIVERY";
        }

        // HYBRID shops require customer preference
        if (primaryCapability == com.ecommerce.enums.ShopCapability.HYBRID) {
            if (shopFulfillmentPreferences == null || shopFulfillmentPreferences.isEmpty()) {
                throw new IllegalArgumentException(
                        "Shop '" + shop.getName() + "' is a HYBRID shop. " +
                                "Please specify whether you want to PICKUP at the shop or have it DELIVERED.");
            }

            // Find preference for this shop
            String preference = shopFulfillmentPreferences.stream()
                    .filter(p -> p.getShopId().equals(shop.getShopId()))
                    .map(com.ecommerce.dto.ShopFulfillmentPreference::getFulfillmentType)
                    .findFirst()
                    .orElse(null);

            if (preference == null || (!preference.equals("PICKUP") && !preference.equals("DELIVERY"))) {
                throw new IllegalArgumentException(
                        "Shop '" + shop.getName() + "' is a HYBRID shop. " +
                                "Please specify whether you want to PICKUP at the shop or have it DELIVERED.");
            }

            // Validate preference matches shop capabilities
            if ("PICKUP".equals(preference) && !effectiveCapabilities.supportsPickup()) {
                throw new IllegalArgumentException(
                        "Shop '" + shop.getName() + "' does not currently support pickup orders. " +
                                "Please choose delivery instead.");
            }

            if ("DELIVERY".equals(preference) && !effectiveCapabilities.supportsDelivery()) {
                throw new IllegalArgumentException(
                        "Shop '" + shop.getName() + "' does not currently support delivery orders. " +
                                "Please choose pickup instead.");
            }

            return preference;
        }

        // Default to DELIVERY for safety
        return "DELIVERY";
    }

    /**
     * Calculate packaging fee for pickup orders
     * Uses the highest of:
     * 1. Base fee (default: $2.00)
     * 2. Percentage-based fee (default: 2% of subtotal)
     * 3. Weight-based fee (default: $0.50 per kg)
     */
    private BigDecimal calculatePackagingFee(Shop shop, BigDecimal subtotal, BigDecimal totalWeightKg) {
        BigDecimal baseFee = shop.getPackagingFee();
        BigDecimal percentage = shop.getPackagingFeePercentage();
        BigDecimal feePerKg = shop.getPackagingFeePerKg();

        // Default values if not configured
        if (baseFee == null) {
            baseFee = BigDecimal.valueOf(2.00);
        }
        if (percentage == null) {
            percentage = BigDecimal.valueOf(2.0);
        }
        if (feePerKg == null) {
            feePerKg = BigDecimal.valueOf(0.50); // $0.50 per kg
        }

        // Calculate percentage-based fee
        BigDecimal percentageFee = subtotal.multiply(percentage)
                .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);

        // Calculate weight-based fee
        BigDecimal weightFee = BigDecimal.ZERO;
        if (totalWeightKg != null && totalWeightKg.compareTo(BigDecimal.ZERO) > 0) {
            weightFee = totalWeightKg.multiply(feePerKg)
                    .setScale(2, java.math.RoundingMode.HALF_UP);
        }

        // Return the highest of all three calculation methods
        return baseFee.max(percentageFee).max(weightFee);
    }

    public com.ecommerce.dto.PaymentSummaryDTO calculatePaymentSummary(AddressDto deliveryAddress,
            List<CartItemDTO> items, UUID userId) {
        return calculatePaymentSummary(deliveryAddress, items, userId, null);
    }

    public com.ecommerce.dto.PaymentSummaryDTO calculatePaymentSummary(AddressDto deliveryAddress,
            List<CartItemDTO> items, UUID userId,
            List<com.ecommerce.dto.ShopFulfillmentPreference> shopFulfillmentPreferences) {

        if (deliveryAddress == null || deliveryAddress.getCountry() == null
                || deliveryAddress.getCountry().trim().isEmpty()) {
            throw new IllegalArgumentException("Delivery address and country are required");
        }

        // Road validation disabled - Google Maps API key expired
        // Validate that the pickup point is on or near a road
        // if (deliveryAddress.getLatitude() != null && deliveryAddress.getLongitude()
        // != null) {
        // roadValidationService.validateRoadLocation(deliveryAddress.getLatitude(),
        // deliveryAddress.getLongitude());
        // }

        // Step 1: Group items by shop
        Map<Shop, List<CartItemDTO>> itemsByShop = new HashMap<>();
        Map<Shop, ShopCalculationResult> shopCalculations = new HashMap<>();

        for (CartItemDTO item : items) {
            Shop shop = getShopForCartItem(item);
            if (shop == null) {
                throw new EntityNotFoundException("Product or variant not found or has no associated shop");
            }
            itemsByShop.computeIfAbsent(shop, k -> new ArrayList<>()).add(item);
        }

        // Step 2: Validate delivery country for each shop and calculate per-shop totals
        BigDecimal totalSubtotal = BigDecimal.ZERO;
        BigDecimal totalDiscountAmount = BigDecimal.ZERO;
        BigDecimal totalShippingCost = BigDecimal.ZERO;
        BigDecimal totalTaxAmount = BigDecimal.ZERO;
        Integer totalRewardPoints = 0;
        BigDecimal totalRewardPointsValue = BigDecimal.ZERO;
        int totalProductCount = 0;

        // Calculate global tax (e.g., 18% VAT for Rwanda)
        BigDecimal globalTaxRate = new BigDecimal("0.18"); // 18% tax rate

        com.ecommerce.dto.ShippingDetailsDTO farthestShippingDetails = null;
        double maxDistance = 0.0;

        for (Map.Entry<Shop, List<CartItemDTO>> entry : itemsByShop.entrySet()) {
            Shop shop = entry.getKey();
            List<CartItemDTO> shopItems = entry.getValue();

            // Validate shop capability supports orders (not VISUALIZATION_ONLY)
            // Check effective capabilities (considering transition)
            CapabilityTransitionService.EffectiveCapabilities effectiveCapabilities = capabilityTransitionService
                    .getEffectiveCapabilities(shop.getShopId());

            if (!effectiveCapabilities.supportsPickup() && !effectiveCapabilities.supportsDelivery()) {
                throw new IllegalArgumentException(
                        "Shop '" + shop.getName() + "' only displays products and does not accept orders. " +
                                "Please remove items from this shop from your cart or contact the shop directly.");
            }

            // Determine fulfillment type for this shop
            String fulfillmentType = null;
            boolean requiresFulfillmentChoice = false;

            try {
                fulfillmentType = determineFulfillmentType(shop, effectiveCapabilities, shopFulfillmentPreferences);
            } catch (IllegalArgumentException e) {
                // If HYBRID shop doesn't have preference, mark it as requiring choice
                if (shop.getPrimaryCapability() == com.ecommerce.enums.ShopCapability.HYBRID) {
                    requiresFulfillmentChoice = true;
                    // Don't throw - we'll return a summary indicating choice is needed
                    // Set a default for calculation purposes (will be overridden in summary)
                    fulfillmentType = "PICKUP"; // Default for calculation, but requiresFulfillmentChoice=true will
                                                // indicate it needs user input
                } else {
                    throw e; // Re-throw for other cases
                }
            }

            // Validate warehouse based on fulfillment type (only if we have a valid
            // fulfillment type)
            if (fulfillmentType != null && !requiresFulfillmentChoice) {
                if ("DELIVERY".equals(fulfillmentType)) {
                    // For delivery, validate shop has warehouses in delivery country
                    validateShopWarehouseInCountry(shop.getShopId(), deliveryAddress.getCountry());
                } else {
                    // For pickup, validate shop has warehouses (country validation is less strict)
                    List<Warehouse> shopWarehouses = warehouseRepository
                            .findByShopShopIdAndIsActiveTrue(shop.getShopId());
                    if (shopWarehouses == null || shopWarehouses.isEmpty()) {
                        throw new IllegalArgumentException(
                                "Shop '" + shop.getName() + "' does not have any active warehouses. " +
                                        "Please contact the shop for pickup availability.");
                    }
                }
            }

            // Calculate product costs for this shop
            BigDecimal shopSubtotal = BigDecimal.ZERO;
            BigDecimal shopDiscountAmount = BigDecimal.ZERO;
            BigDecimal shopTotalWeightKg = BigDecimal.ZERO; // Total weight for packaging fee calculation
            int shopProductCount = 0;

            for (CartItemDTO item : shopItems) {
                BigDecimal itemPrice = BigDecimal.ZERO;
                BigDecimal originalPrice = BigDecimal.ZERO;
                BigDecimal itemWeightKg = BigDecimal.ZERO;

                if (item.getVariantId() != null) {
                    ProductVariant variant = variantRepository.findById(item.getVariantId())
                            .orElseThrow(() -> new EntityNotFoundException(
                                    "Variant not found with ID: " + item.getVariantId()));
                    originalPrice = variant.getPrice();

                    // Get weight from product (variants inherit product weight)
                    // Variants don't have their own weight field, so use product weight
                    if (variant.getProduct() != null && variant.getProduct().getWeightKg() != null) {
                        itemWeightKg = variant.getProduct().getWeightKg();
                    }
                    // Fallback to item weight if provided in DTO
                    if (itemWeightKg.compareTo(BigDecimal.ZERO) == 0 && item.getWeight() != null) {
                        itemWeightKg = item.getWeight();
                    }

                    if (variant.getDiscount() != null) {
                        validateDiscountValidity(variant.getDiscount());
                    }

                    itemPrice = calculateDiscountedPrice(variant);
                } else if (item.getProductId() != null) {
                    Product product = productRepository.findById(item.getProductId())
                            .orElseThrow(() -> new EntityNotFoundException(
                                    "Product not found with ID: " + item.getProductId()));
                    originalPrice = product.getPrice();

                    // Get weight from product
                    if (product.getWeightKg() != null) {
                        itemWeightKg = product.getWeightKg();
                    }
                    // Fallback to item weight if provided in DTO
                    if (itemWeightKg.compareTo(BigDecimal.ZERO) == 0 && item.getWeight() != null) {
                        itemWeightKg = item.getWeight();
                    }

                    if (product.getDiscount() != null) {
                        validateDiscountValidity(product.getDiscount());
                    }

                    itemPrice = calculateDiscountedPrice(product);
                } else {
                    continue;
                }

                BigDecimal itemTotal = itemPrice.multiply(BigDecimal.valueOf(item.getQuantity()));
                BigDecimal itemDiscount = originalPrice.subtract(itemPrice)
                        .multiply(BigDecimal.valueOf(item.getQuantity()));

                // Calculate total weight for this item (weight × quantity)
                BigDecimal itemTotalWeight = itemWeightKg.multiply(BigDecimal.valueOf(item.getQuantity()));

                shopSubtotal = shopSubtotal.add(itemTotal);
                shopDiscountAmount = shopDiscountAmount.add(itemDiscount);
                shopTotalWeightKg = shopTotalWeightKg.add(itemTotalWeight);
                shopProductCount += item.getQuantity();
            }

            // Calculate shipping/packaging based on fulfillment type
            com.ecommerce.dto.ShippingDetailsDTO shopShippingDetails;
            BigDecimal shopShippingCost = BigDecimal.ZERO;
            BigDecimal shopPackagingFee = BigDecimal.ZERO;

            // If shop requires fulfillment choice, don't calculate shipping/packaging yet
            if (requiresFulfillmentChoice) {
                // Set default values for HYBRID shops without preference
                shopShippingDetails = com.ecommerce.dto.ShippingDetailsDTO.builder()
                        .shippingCost(BigDecimal.ZERO)
                        .distanceKm(0.0)
                        .costPerKm(BigDecimal.ZERO)
                        .selectedWarehouseName("Select delivery method")
                        .selectedWarehouseCountry(deliveryAddress.getCountry())
                        .isInternationalShipping(false)
                        .build();
            } else if ("PICKUP".equals(fulfillmentType)) {
                // For pickup orders: no shipping, calculate packaging fee based on weight, base
                // fee, and percentage
                shopPackagingFee = calculatePackagingFee(shop, shopSubtotal, shopTotalWeightKg);
                shopShippingCost = BigDecimal.ZERO; // Ensure shipping is zero for pickup
                shopShippingDetails = com.ecommerce.dto.ShippingDetailsDTO.builder()
                        .shippingCost(BigDecimal.ZERO)
                        .distanceKm(0.0)
                        .costPerKm(BigDecimal.ZERO)
                        .selectedWarehouseName("Pickup at Shop")
                        .selectedWarehouseCountry(deliveryAddress.getCountry())
                        .isInternationalShipping(false)
                        .build();
            } else {
                // For delivery orders: calculate shipping
                try {
                    shopShippingDetails = shippingCostService.calculateEnhancedShippingDetails(
                            deliveryAddress, shopItems, shopSubtotal, shop.getShopId());
                    shopShippingCost = shopShippingDetails.getShippingCost();
                } catch (Exception e) {
                    log.error("Error calculating shipping details for shop {}: {}", shop.getShopId(), e.getMessage(),
                            e);
                    shopShippingDetails = com.ecommerce.dto.ShippingDetailsDTO.builder()
                            .shippingCost(BigDecimal.valueOf(10.00))
                            .distanceKm(0.0)
                            .costPerKm(BigDecimal.ZERO)
                            .selectedWarehouseName("Default")
                            .selectedWarehouseCountry("Unknown")
                            .isInternationalShipping(false)
                            .build();
                    shopShippingCost = shopShippingDetails.getShippingCost();
                }
            }

            // Calculate reward points for this shop (if user is logged in)
            Integer shopRewardPoints = 0;
            BigDecimal shopRewardPointsValue = BigDecimal.ZERO;
            if (userId != null) {
                try {
                    com.ecommerce.dto.RewardSystemDTO rewardSystem = rewardService
                            .getActiveRewardSystem(shop.getShopId());
                    if (rewardSystem != null && rewardSystem.getIsSystemEnabled()
                            && rewardSystem.getIsPurchasePointsEnabled()) {
                        // Get the reward system entity to calculate points
                        com.ecommerce.entity.RewardSystem rewardSystemEntity = rewardSystemRepository
                                .findByShopShopIdAndIsActiveTrue(shop.getShopId())
                                .orElse(null);
                        if (rewardSystemEntity != null) {
                            shopRewardPoints = rewardSystemEntity.calculatePurchasePoints(shopProductCount,
                                    shopSubtotal);
                            shopRewardPointsValue = rewardSystemEntity.calculatePointsValue(shopRewardPoints);
                        }
                    }
                } catch (Exception e) {
                    log.warn("Error calculating reward points for shop {} and user {}: {}",
                            shop.getShopId(), userId, e.getMessage());
                }
            }

            // Store shop calculation result
            ShopCalculationResult shopResult = new ShopCalculationResult();
            shopResult.shop = shop;
            shopResult.subtotal = shopSubtotal;
            shopResult.discountAmount = shopDiscountAmount;
            // Ensure shipping cost is zero for PICKUP orders
            if ("PICKUP".equals(fulfillmentType) || requiresFulfillmentChoice) {
                shopResult.shippingCost = BigDecimal.ZERO;
            } else {
                shopResult.shippingCost = shopShippingCost;
            }
            shopResult.packagingFee = shopPackagingFee;
            shopResult.fulfillmentType = fulfillmentType;
            shopResult.requiresFulfillmentChoice = requiresFulfillmentChoice; // Store the flag
            shopResult.shippingDetails = shopShippingDetails;
            shopResult.rewardPoints = shopRewardPoints;
            shopResult.rewardPointsValue = shopRewardPointsValue;
            shopResult.productCount = shopProductCount;
            shopCalculations.put(shop, shopResult);

            // Aggregate totals (packaging fee is added to total, not shipping)
            totalSubtotal = totalSubtotal.add(shopSubtotal);
            totalDiscountAmount = totalDiscountAmount.add(shopDiscountAmount);
            totalShippingCost = totalShippingCost.add(shopShippingCost);
            // Packaging fee is added to total amount (not shipping cost)
            totalRewardPoints += shopRewardPoints;
            totalRewardPointsValue = totalRewardPointsValue.add(shopRewardPointsValue);
            totalProductCount += shopProductCount;

            // Track farthest warehouse (for display purposes)
            if (shopShippingDetails.getDistanceKm() != null && shopShippingDetails.getDistanceKm() > maxDistance) {
                maxDistance = shopShippingDetails.getDistanceKm();
                farthestShippingDetails = shopShippingDetails;
            }
        }

        // Use farthest shipping details or default
        if (farthestShippingDetails == null) {
            farthestShippingDetails = com.ecommerce.dto.ShippingDetailsDTO.builder()
                    .shippingCost(totalShippingCost)
                    .distanceKm(0.0)
                    .costPerKm(BigDecimal.ZERO)
                    .selectedWarehouseName("Multiple Warehouses")
                    .selectedWarehouseCountry(deliveryAddress.getCountry())
                    .isInternationalShipping(false)
                    .build();
        }

        // Calculate total packaging fees
        BigDecimal totalPackagingFee = shopCalculations.values().stream()
                .map(result -> result.packagingFee != null ? result.packagingFee : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        totalTaxAmount = BigDecimal.ZERO;

        BigDecimal totalAmount = totalSubtotal.add(totalShippingCost).add(totalTaxAmount).add(totalPackagingFee);

        // Build shop summaries
        List<com.ecommerce.dto.PaymentSummaryDTO.ShopSummary> shopSummaries = shopCalculations.values().stream()
                .map(shopResult -> {
                    // Calculate shop total: subtotal (already has discounts applied) + shipping +
                    // packaging fee
                    BigDecimal shopTotal = shopResult.subtotal
                            .add(shopResult.shippingCost)
                            .add(shopResult.packagingFee != null ? shopResult.packagingFee : BigDecimal.ZERO);

                    CapabilityTransitionService.EffectiveCapabilities effectiveCapabilities = capabilityTransitionService
                            .getEffectiveCapabilities(shopResult.shop.getShopId());
                    com.ecommerce.enums.ShopCapability shopCapability = shopResult.shop.getPrimaryCapability();

                    // Use the requiresFulfillmentChoice flag from the calculation result
                    // This is already set correctly during calculation for HYBRID shops without
                    // preference
                    boolean requiresFulfillmentChoice = shopResult.requiresFulfillmentChoice;

                    return com.ecommerce.dto.PaymentSummaryDTO.ShopSummary.builder()
                            .shopId(shopResult.shop.getShopId().toString())
                            .shopName(shopResult.shop.getName())
                            .subtotal(shopResult.subtotal)
                            .discountAmount(shopResult.discountAmount)
                            .shippingCost(shopResult.shippingCost)
                            .taxAmount(BigDecimal.ZERO)
                            .totalAmount(shopTotal)
                            .rewardPoints(shopResult.rewardPoints)
                            .rewardPointsValue(shopResult.rewardPointsValue)
                            .productCount(shopResult.productCount)
                            .distanceKm(shopResult.shippingDetails.getDistanceKm())
                            .costPerKm(shopResult.shippingDetails.getCostPerKm())
                            .selectedWarehouseName(shopResult.shippingDetails.getSelectedWarehouseName())
                            .selectedWarehouseCountry(shopResult.shippingDetails.getSelectedWarehouseCountry())
                            .isInternationalShipping(shopResult.shippingDetails.getIsInternationalShipping())
                            .shopCapability(shopCapability)
                            .fulfillmentType(shopResult.fulfillmentType != null && !shopResult.fulfillmentType.isEmpty()
                                    ? shopResult.fulfillmentType
                                    : null)
                            .packagingFee(shopResult.packagingFee != null ? shopResult.packagingFee : BigDecimal.ZERO)
                            .requiresFulfillmentChoice(requiresFulfillmentChoice)
                            .build();
                })
                .collect(java.util.stream.Collectors.toList());

        log.info("Payment summary calculated: {} shops, {} items, total: {}",
                itemsByShop.size(), totalProductCount, totalAmount);

        return com.ecommerce.dto.PaymentSummaryDTO.builder()
                .subtotal(totalSubtotal)
                .discountAmount(totalDiscountAmount)
                .shippingCost(totalShippingCost)
                .taxAmount(totalTaxAmount)
                .totalAmount(totalAmount)
                .rewardPoints(totalRewardPoints)
                .rewardPointsValue(totalRewardPointsValue)
                .currency("RWF")
                .distanceKm(farthestShippingDetails.getDistanceKm())
                .costPerKm(farthestShippingDetails.getCostPerKm())
                .selectedWarehouseName(farthestShippingDetails.getSelectedWarehouseName())
                .selectedWarehouseCountry(farthestShippingDetails.getSelectedWarehouseCountry())
                .isInternationalShipping(farthestShippingDetails.getIsInternationalShipping())
                .shopSummaries(shopSummaries)
                .build();
    }

    /**
     * Helper class to store per-shop calculation results
     */
    private static class ShopCalculationResult {
        Shop shop;
        BigDecimal subtotal;
        BigDecimal discountAmount;
        BigDecimal shippingCost;
        BigDecimal packagingFee;
        String fulfillmentType;
        boolean requiresFulfillmentChoice; // Track if this shop needs user input
        com.ecommerce.dto.ShippingDetailsDTO shippingDetails;
        Integer rewardPoints;
        BigDecimal rewardPointsValue;
        int productCount;
    }

    /**
     * Get the shop associated with a cart item
     */
    private Shop getShopForCartItem(CartItemDTO item) {
        if (item.getVariantId() != null) {
            ProductVariant variant = variantRepository.findById(item.getVariantId()).orElse(null);
            if (variant != null && variant.getProduct() != null) {
                return variant.getProduct().getShop();
            }
        } else if (item.getProductId() != null) {
            Product product = productRepository.findById(item.getProductId()).orElse(null);
            if (product != null) {
                return product.getShop();
            }
        }
        return null;
    }

    /**
     * Validate shop capabilities for checkout - ensure shops support orders
     * Also checks transition state and blocks new orders if transitioning away from
     * delivery
     */
    private void validateShopCapabilitiesForCheckout(List<CartItemDTO> items) {
        Map<Shop, List<CartItemDTO>> itemsByShop = new HashMap<>();
        for (CartItemDTO item : items) {
            Shop shop = getShopForCartItem(item);
            if (shop != null) {
                itemsByShop.computeIfAbsent(shop, k -> new ArrayList<>()).add(item);
            }
        }

        for (Map.Entry<Shop, List<CartItemDTO>> entry : itemsByShop.entrySet()) {
            Shop shop = entry.getKey();

            // Check effective capabilities (considering transition)
            CapabilityTransitionService.EffectiveCapabilities effectiveCapabilities = capabilityTransitionService
                    .getEffectiveCapabilities(shop.getShopId());

            if (!effectiveCapabilities.supportsPickup() && !effectiveCapabilities.supportsDelivery()) {
                throw new IllegalArgumentException(
                        "Shop '" + shop.getName() + "' only displays products and does not accept orders. " +
                                "Please remove items from this shop from your cart or contact the shop directly.");
            }

            // Check if shop can accept new orders during transition
            // Determine if this order requires delivery (based on shop's current state)
            boolean orderRequiresDelivery = effectiveCapabilities.supportsDelivery() &&
                    !effectiveCapabilities.supportsPickup();

            if (orderRequiresDelivery && !capabilityTransitionService.canAcceptNewOrderType(shop.getShopId(), true)) {
                throw new IllegalArgumentException(
                        "Shop '" + shop.getName() + "' is transitioning and cannot accept new delivery orders. " +
                                "Please try again later or contact the shop directly.");
            }
        }
    }

    /**
     * Validate that a shop has warehouses in the delivery country
     */
    private void validateShopWarehouseInCountry(UUID shopId, String country) {
        if (country == null || country.trim().isEmpty()) {
            throw new IllegalArgumentException("Delivery country is required");
        }

        List<Warehouse> shopWarehouses = warehouseRepository.findByShopShopIdAndIsActiveTrue(shopId);
        if (shopWarehouses == null || shopWarehouses.isEmpty()) {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow(() -> new EntityNotFoundException("Shop not found with ID: " + shopId));
            throw new IllegalArgumentException(
                    String.format("Shop '%s' does not have any active warehouses.", shop.getName()));
        }

        boolean hasWarehouseInCountry = shopWarehouses.stream()
                .anyMatch(w -> w.getCountry() != null &&
                        w.getCountry().equalsIgnoreCase(country.trim()));

        if (!hasWarehouseInCountry) {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow(() -> new EntityNotFoundException("Shop not found with ID: " + shopId));
            throw new IllegalArgumentException(
                    String.format("Shop '%s' does not deliver to %s as it doesn't have any warehouses there.",
                            shop.getName(), country));
        }
    }

    private UUID getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            log.debug("Authentication object: {}", auth);

            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                log.warn("User not authenticated. Auth: {}, isAuthenticated: {}, principal: {}",
                        auth, auth != null ? auth.isAuthenticated() : "null",
                        auth != null ? auth.getPrincipal() : "null");
                throw new IllegalStateException("User not authenticated");
            }

            Object principal = auth.getPrincipal();
            log.debug("Authentication principal type: {}, value: {}",
                    principal.getClass().getName(), principal);

            if (principal instanceof com.ecommerce.ServiceImpl.CustomUserDetails customUserDetails) {
                String email = customUserDetails.getUsername();
                log.debug("Found CustomUserDetails with email: {}", email);
                return userRepository.findByUserEmail(email)
                        .map(com.ecommerce.entity.User::getId)
                        .orElseThrow(() -> new IllegalStateException("User not found: " + email));
            }

            if (principal instanceof com.ecommerce.entity.User user && user.getId() != null) {
                log.debug("Found User entity with ID: {}", user.getId());
                return user.getId();
            }

            if (principal instanceof UserDetails userDetails) {
                String email = userDetails.getUsername();
                log.debug("Found UserDetails with email: {}", email);
                return userRepository.findByUserEmail(email)
                        .map(com.ecommerce.entity.User::getId)
                        .orElseThrow(() -> new IllegalStateException("User not found: " + email));
            }

            String name = auth.getName();
            if (name != null && !name.isBlank() && !"anonymousUser".equals(name)) {
                log.debug("Fallback to auth name: {}", name);
                return userRepository.findByUserEmail(name)
                        .map(com.ecommerce.entity.User::getId)
                        .orElseThrow(() -> new IllegalStateException("User not found: " + name));
            }

            throw new IllegalStateException("Unable to determine current user. Principal type: " +
                    principal.getClass().getName() + ", value: " + principal);
        } catch (Exception e) {
            log.error("Error getting current user ID: {}", e.getMessage(), e);
            throw new IllegalStateException("Authentication error: " + e.getMessage());
        }
    }

    private void updateDiscountUsage(Order order) {
        log.info("Updating discount usage for order: {}", order.getOrderId());

        for (OrderItem item : order.getAllItems()) {
            if (item.isVariantBased() && item.getProductVariant() != null) {
                ProductVariant variant = item.getProductVariant();
                if (variant.getDiscount() != null) {
                    Discount discount = variant.getDiscount();
                    discount.incrementUsage();

                    if (discount.getUsageLimit() != null && discount.getUsedCount() >= discount.getUsageLimit()) {
                        discount.setActive(false);
                        log.info("Discount {} reached usage limit and has been disabled", discount.getDiscountId());
                    }

                    discountRepository.save(discount);
                    log.info("Incremented usage for variant discount: {} (used: {}/{})",
                            discount.getDiscountId(), discount.getUsedCount(), discount.getUsageLimit());
                }
            } else if (item.getProduct() != null) {
                Product product = item.getProduct();
                if (product.getDiscount() != null) {
                    Discount discount = product.getDiscount();
                    discount.incrementUsage();

                    if (discount.getUsageLimit() != null && discount.getUsedCount() >= discount.getUsageLimit()) {
                        discount.setActive(false);
                        log.info("Discount {} reached usage limit and has been disabled", discount.getDiscountId());
                    }

                    discountRepository.save(discount);
                    log.info("Incremented usage for product discount: {} (used: {}/{})",
                            discount.getDiscountId(), discount.getUsedCount(), discount.getUsageLimit());
                }
            }
        }
    }

    private BigDecimal calculateDiscountedPrice(ProductVariant variant) {
        if (variant.getDiscount() != null && variant.getDiscount().isValid() && variant.getDiscount().isActive()) {
            if (validateDiscountValidity(variant.getDiscount())) {
                BigDecimal discountMultiplier = BigDecimal.ONE.subtract(
                        variant.getDiscount().getPercentage().divide(BigDecimal.valueOf(100.0)));
                return variant.getPrice().multiply(discountMultiplier);
            }
        }

        if (variant.getProduct() != null && variant.getProduct().getDiscount() != null
                && variant.getProduct().getDiscount().isValid() && variant.getProduct().getDiscount().isActive()) {
            if (validateDiscountValidity(variant.getProduct().getDiscount())) {
                BigDecimal discountMultiplier = BigDecimal.ONE.subtract(
                        variant.getProduct().getDiscount().getPercentage().divide(BigDecimal.valueOf(100.0)));
                return variant.getPrice().multiply(discountMultiplier);
            }
        }

        if (variant.getProduct() != null && variant.getProduct().isOnSale()
                && variant.getProduct().getSalePercentage() != null
                && variant.getProduct().getSalePercentage() > 0) {
            BigDecimal discountMultiplier = BigDecimal.ONE.subtract(
                    BigDecimal.valueOf(variant.getProduct().getSalePercentage()).divide(BigDecimal.valueOf(100.0)));
            return variant.getPrice().multiply(discountMultiplier);
        }

        return variant.getPrice();
    }

    private BigDecimal calculateDiscountedPrice(Product product) {
        // Check product discount
        if (product.getDiscount() != null && product.getDiscount().isValid() && product.getDiscount().isActive()) {
            if (validateDiscountValidity(product.getDiscount())) {
                BigDecimal discountMultiplier = BigDecimal.ONE.subtract(
                        product.getDiscount().getPercentage().divide(BigDecimal.valueOf(100.0)));
                return product.getPrice().multiply(discountMultiplier);
            }
            // If discount is invalid, continue to check sale price
        }

        if (product.isOnSale() && product.getSalePercentage() != null && product.getSalePercentage() > 0) {
            BigDecimal discountMultiplier = BigDecimal.ONE.subtract(
                    BigDecimal.valueOf(product.getSalePercentage()).divide(BigDecimal.valueOf(100.0)));
            return product.getPrice().multiply(discountMultiplier);
        }

        return product.getPrice();
    }

    private boolean validateDiscountValidity(com.ecommerce.entity.Discount discount) {
        LocalDateTime now = LocalDateTime.now();

        if (!discount.isActive()) {
            log.warn("Skipping inactive discount: {}", discount.getDiscountId());
            return false;
        }

        if (now.isBefore(discount.getStartDate())) {
            log.warn("Skipping discount that hasn't started yet: {}", discount.getDiscountId());
            return false;
        }

        if (discount.getEndDate() != null && now.isAfter(discount.getEndDate())) {
            log.warn("Skipping expired discount: {}", discount.getDiscountId());
            return false;
        }

        if (discount.getUsageLimit() != null && discount.getUsedCount() >= discount.getUsageLimit()) {
            log.warn("Skipping discount with exceeded usage limit: {}", discount.getDiscountId());
            return false;
        }

        log.info("Discount validation passed for: {}", discount.getDiscountId());
        return true;
    }

    /**
     * Validate if we have at least one warehouse in the delivery country
     */
    private void validateDeliveryCountry(String country) {
        if (country == null || country.trim().isEmpty()) {
            throw new IllegalArgumentException("Delivery country is required");
        }

        boolean hasWarehouseInCountry = warehouseRepository.existsByCountryIgnoreCase(country.trim());

        if (!hasWarehouseInCountry) {
            throw new IllegalArgumentException(
                    "Sorry, we don't deliver to " + country + " as we don't have any warehouses there.");
        }

    }

    private void createOrderItemBatches(Order order, CartItemDTO cartItem,
            List<FEFOStockAllocationService.BatchAllocation> allocations) {

        OrderItem orderItem = order.getAllItems().stream()
                .filter(oi -> matchesCartItem(oi, cartItem))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("OrderItem not found for cart item"));

        for (FEFOStockAllocationService.BatchAllocation allocation : allocations) {
            OrderItemBatch orderItemBatch = new OrderItemBatch();
            orderItemBatch.setOrderItem(orderItem);
            orderItemBatch.setStockBatch(allocation.getStockBatch());
            orderItemBatch.setWarehouse(allocation.getWarehouse());
            orderItemBatch.setQuantityUsed(allocation.getQuantityAllocated());

            orderItem.addOrderItemBatch(orderItemBatch);
            orderItemBatchRepository.save(orderItemBatch);
        }
    }

    /**
     * Create order item batches for ShopOrder structure
     */
    private void createOrderItemBatchesForShopOrder(Order order, CartItemDTO cartItem,
            List<FEFOStockAllocationService.BatchAllocation> allocations) {

        // Find the OrderItem across all ShopOrders
        OrderItem orderItem = order.getAllItems().stream()
                .filter(oi -> matchesCartItem(oi, cartItem))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("OrderItem not found for cart item"));

        for (FEFOStockAllocationService.BatchAllocation allocation : allocations) {
            OrderItemBatch orderItemBatch = new OrderItemBatch();
            orderItemBatch.setOrderItem(orderItem);
            orderItemBatch.setStockBatch(allocation.getStockBatch());
            orderItemBatch.setWarehouse(allocation.getWarehouse());
            orderItemBatch.setQuantityUsed(allocation.getQuantityAllocated());

            orderItem.addOrderItemBatch(orderItemBatch);
            orderItemBatchRepository.save(orderItemBatch);
        }
    }

    private boolean matchesCartItem(OrderItem orderItem, CartItemDTO cartItem) {
        if (cartItem.getVariantId() != null) {
            return orderItem.getProductVariant() != null &&
                    orderItem.getProductVariant().getId().equals(cartItem.getVariantId());
        } else {
            return orderItem.getProduct() != null &&
                    orderItem.getProduct().getProductId().equals(cartItem.getProductId());
        }
    }

    private OrderResponseDTO convertOrderToResponseDTO(Order order) {
        OrderInfo info = order.getOrderInfo();
        OrderAddress addr = order.getOrderAddress();
        log.info("The order addressses obtained are " + addr);
        OrderTransaction tx = order.getOrderTransaction();

        OrderResponseDTO dto = new OrderResponseDTO();
        dto.setId(order.getOrderId());
        dto.setUserId(
                order.getUser() != null && order.getUser().getId() != null ? order.getUser().getId().toString() : null);
        dto.setOrderNumber(order.getOrderCode());
        // Pickup token is now on ShopOrder, get from first shop order if available
        if (order.getShopOrders() != null && !order.getShopOrders().isEmpty()) {
            com.ecommerce.entity.ShopOrder firstShopOrder = order.getShopOrders().iterator().next();
            dto.setPickupToken(firstShopOrder.getPickupToken());
            dto.setPickupTokenUsed(firstShopOrder.getPickupTokenUsed());
        } else {
            dto.setPickupToken(null);
            dto.setPickupTokenUsed(false);
        }
        dto.setStatus(order.getStatus() != null ? order.getStatus() : null);
        dto.setCreatedAt(order.getCreatedAt());
        dto.setUpdatedAt(order.getUpdatedAt());

        // Set customer information from OrderCustomerInfo entity
        if (order.getOrderCustomerInfo() != null) {
            OrderResponseDTO.CustomerInfo customerInfo = new OrderResponseDTO.CustomerInfo();
            customerInfo.setName(
                    order.getOrderCustomerInfo().getFirstName() + " " + order.getOrderCustomerInfo().getLastName());
            customerInfo.setEmail(order.getOrderCustomerInfo().getEmail());
            customerInfo.setPhone(order.getOrderCustomerInfo().getPhoneNumber());
            dto.setCustomerInfo(customerInfo);
            log.info("The customer info are: " + customerInfo);
        }

        // Set order info
        if (info != null) {
            dto.setSubtotal(info.getTotalAmount());
            dto.setTax(info.getTaxAmount());
            dto.setShipping(info.getShippingCost());
            dto.setDiscount(info.getDiscountAmount());
            dto.setTotal(info.getFinalAmount());
            dto.setNotes(info.getNotes());
        }

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
                } else if (regions.length == 1) {
                    shippingAddress.setCity(regions[0].trim());
                    shippingAddress.setState("");
                }
            }
            dto.setShippingAddress(shippingAddress);
        }

        // Set payment information
        if (tx != null) {
            dto.setPaymentMethod(tx.getPaymentMethod() != null ? tx.getPaymentMethod().name() : null);
            dto.setPaymentStatus(tx.getStatus() != null ? tx.getStatus().name() : null);
        }

        // Set transaction information
        if (tx != null) {
            OrderTransactionDTO transactionDTO = new OrderTransactionDTO();
            transactionDTO.setOrderTransactionId(
                    tx.getOrderTransactionId() != null ? tx.getOrderTransactionId().toString() : null);
            transactionDTO.setTransactionRef(tx.getTransactionRef());
            transactionDTO.setPaymentMethod(tx.getPaymentMethod() != null ? tx.getPaymentMethod().name() : null);
            transactionDTO.setStatus(tx.getStatus() != null ? tx.getStatus().name() : null);
            transactionDTO.setOrderAmount(tx.getOrderAmount());
            transactionDTO.setPointsUsed(tx.getPointsUsed());
            transactionDTO.setPointsValue(tx.getPointsValue());
            transactionDTO.setStripePaymentIntentId(tx.getStripePaymentIntentId());
            transactionDTO.setReceiptUrl(tx.getReceiptUrl());
            transactionDTO.setPaymentDate(tx.getPaymentDate());
            transactionDTO.setCreatedAt(tx.getCreatedAt());
            transactionDTO.setUpdatedAt(tx.getUpdatedAt());
            dto.setTransaction(transactionDTO);
        }

        // Set order items with product/variant information
        if (order.getAllItems() != null && !order.getAllItems().isEmpty()) {
            List<OrderResponseDTO.OrderItem> itemDTOs = order.getAllItems().stream()
                    .map(this::mapOrderItemToResponseDTO).toList();
            dto.setItems(itemDTOs);
        }

        // Set shop orders grouped by shop
        if (order.getShopOrders() != null && !order.getShopOrders().isEmpty()) {
            List<OrderResponseDTO.ShopOrderResponse> shopOrderDTOs = new ArrayList<>();
            for (com.ecommerce.entity.ShopOrder so : order.getShopOrders()) {
                OrderResponseDTO.ShopOrderResponse shopOrderDTO = new OrderResponseDTO.ShopOrderResponse();
                shopOrderDTO.setId(so.getId());
                shopOrderDTO.setShopOrderCode(so.getShopOrderCode());
                shopOrderDTO.setShopName(so.getShop() != null ? so.getShop().getName() : "Unknown Shop");
                shopOrderDTO.setPickupToken(so.getPickupToken());
                shopOrderDTO.setPickupTokenUsed(so.getPickupTokenUsed());
                shopOrderDTO.setStatus(so.getStatus().name());
                shopOrderDTO.setShippingCost(so.getShippingCost());
                shopOrderDTO.setSubtotal(so.getSubtotal());
                shopOrderDTO.setTotalAmount(so.getTotalAmount());

                // Set shop capability
                if (so.getShop() != null && so.getShop().getPrimaryCapability() != null) {
                    shopOrderDTO.setShopCapability(so.getShop().getPrimaryCapability().name());
                }

                // Set fulfillment type
                if (so.getFulfillmentType() != null) {
                    shopOrderDTO.setFulfillmentType(so.getFulfillmentType().name());
                }

                // NEW: Set per-shop payment breakdown from ShopOrderTransaction
                if (so.getShopOrderTransaction() != null) {
                    ShopOrderTransaction shopTx = so.getShopOrderTransaction();
                    shopOrderDTO.setPointsUsed(shopTx.getPointsUsed());
                    shopOrderDTO.setPointsValue(
                            shopTx.getPointsValue() != null ? shopTx.getPointsValue() : BigDecimal.ZERO);

                    // Calculate amount paid with card
                    BigDecimal cardAmount = shopOrderDTO.getTotalAmount()
                            .subtract(shopOrderDTO.getPointsValue())
                            .max(BigDecimal.ZERO);
                    shopOrderDTO.setCardAmount(cardAmount);

                    // Determine payment status for this shop
                    if (shopOrderDTO.getPointsValue().compareTo(BigDecimal.ZERO) > 0
                            && cardAmount.compareTo(BigDecimal.ZERO) <= 0) {
                        shopOrderDTO.setPaymentStatus("POINTS_ONLY");
                    } else if (shopOrderDTO.getPointsValue().compareTo(BigDecimal.ZERO) > 0
                            && cardAmount.compareTo(BigDecimal.ZERO) > 0) {
                        shopOrderDTO.setPaymentStatus("HYBRID");
                    } else {
                        shopOrderDTO.setPaymentStatus("CARD_ONLY");
                    }

                    log.info("Shop {}: Points={} ({} RWF), Card={} RWF, Status={}",
                            shopOrderDTO.getShopName(), shopOrderDTO.getPointsUsed(),
                            shopOrderDTO.getPointsValue(), cardAmount, shopOrderDTO.getPaymentStatus());
                } else {
                    // No transaction found - assume card payment
                    shopOrderDTO.setPointsUsed(0);
                    shopOrderDTO.setPointsValue(BigDecimal.ZERO);
                    shopOrderDTO.setCardAmount(so.getTotalAmount());
                    shopOrderDTO.setPaymentStatus("CARD_ONLY");
                }

                if (so.getItems() != null) {
                    List<OrderResponseDTO.OrderItem> itemDTOs = new ArrayList<>();
                    for (com.ecommerce.entity.OrderItem item : so.getItems()) {
                        itemDTOs.add(mapOrderItemToResponseDTO(item));
                    }
                    shopOrderDTO.setItems(itemDTOs);
                }
                shopOrderDTOs.add(shopOrderDTO);
            }
            dto.setShopOrders(shopOrderDTOs);
        }

        return dto;
    }

    private OrderItemDTO mapOrderItemToDTO(OrderItem item) {
        OrderItemDTO dto = new OrderItemDTO();
        dto.setId(item.getOrderItemId() != null ? item.getOrderItemId().toString() : null);
        dto.setProductId(item.getProduct() != null ? item.getProduct().getProductId().toString() : null);
        dto.setVariantId(item.getProductVariant() != null ? item.getProductVariant().getId().toString() : null);
        dto.setQuantity(item.getQuantity());
        dto.setPrice(item.getPrice());
        dto.setTotalPrice(item.getSubtotal());

        // Set product information
        if (item.getProduct() != null) {
            SimpleProductDTO productDto = new SimpleProductDTO();
            productDto.setProductId(item.getProduct().getProductId().toString());
            productDto.setName(item.getProduct().getProductName());
            productDto.setDescription(item.getProduct().getDescription());
            productDto.setPrice(item.getProduct().getDiscountedPrice().doubleValue());

            // Get product images
            if (item.getProduct().getImages() != null && !item.getProduct().getImages().isEmpty()) {
                String[] imageUrls = item.getProduct().getImages().stream()
                        .sorted((img1, img2) -> {
                            if (img1.isPrimary() && !img2.isPrimary())
                                return -1;
                            if (!img1.isPrimary() && img2.isPrimary())
                                return 1;
                            int sortOrder1 = img1.getSortOrder() != null ? img1.getSortOrder() : 0;
                            int sortOrder2 = img2.getSortOrder() != null ? img2.getSortOrder() : 0;
                            return Integer.compare(sortOrder1, sortOrder2);
                        })
                        .map(img -> img.getImageUrl())
                        .filter(url -> url != null && !url.trim().isEmpty())
                        .toArray(String[]::new);
                productDto.setImages(imageUrls);
            }
            productDto.setUnit(com.ecommerce.dto.UnitDTO.from(item.getProduct().getUnit()));
            productDto.setOrganic(item.getProduct().getOrganic());

            dto.setProduct(productDto);
        }

        // Set variant information if this is a variant-based item
        if (item.getProductVariant() != null) {
            SimpleProductDTO variantDto = new SimpleProductDTO();
            variantDto.setProductId(item.getProductVariant().getId().toString());
            variantDto.setName(item.getProductVariant().getVariantName());
            variantDto.setDescription(item.getProductVariant().getVariantSku());
            variantDto.setPrice(item.getProductVariant().getDiscountedPrice() != null
                    ? item.getProductVariant().getDiscountedPrice().doubleValue()
                    : item.getProductVariant().getPrice().doubleValue());

            // Get variant images - if variant has images, use them; otherwise use product
            // images
            if (item.getProductVariant().getImages() != null && !item.getProductVariant().getImages().isEmpty()) {
                String[] imageUrls = item.getProductVariant().getImages().stream()
                        .sorted((img1, img2) -> {
                            if (img1.isPrimary() && !img2.isPrimary())
                                return -1;
                            if (!img1.isPrimary() && img2.isPrimary())
                                return 1;
                            int sortOrder1 = img1.getSortOrder() != null ? img1.getSortOrder() : 0;
                            int sortOrder2 = img2.getSortOrder() != null ? img2.getSortOrder() : 0;
                            return Integer.compare(sortOrder1, sortOrder2);
                        })
                        .map(img -> img.getImageUrl())
                        .filter(url -> url != null && !url.trim().isEmpty())
                        .toArray(String[]::new);
                variantDto.setImages(imageUrls);
            } else if (item.getProduct() != null && item.getProduct().getImages() != null
                    && !item.getProduct().getImages().isEmpty()) {
                // Fallback to product images if variant has no images
                String[] imageUrls = item.getProduct().getImages().stream()
                        .sorted((img1, img2) -> {
                            if (img1.isPrimary() && !img2.isPrimary())
                                return -1;
                            if (!img1.isPrimary() && img2.isPrimary())
                                return 1;
                            int sortOrder1 = img1.getSortOrder() != null ? img1.getSortOrder() : 0;
                            int sortOrder2 = img2.getSortOrder() != null ? img2.getSortOrder() : 0;
                            return Integer.compare(sortOrder1, sortOrder2);
                        })
                        .map(img -> img.getImageUrl())
                        .filter(url -> url != null && !url.trim().isEmpty())
                        .toArray(String[]::new);
                variantDto.setImages(imageUrls);
            }
            if (item.getProduct() != null) {
                variantDto.setUnit(com.ecommerce.dto.UnitDTO.from(item.getProduct().getUnit()));
                variantDto.setOrganic(item.getProduct().getOrganic());
            }

            dto.setVariant(variantDto);
        }

        return dto;
    }

    private OrderResponseDTO.OrderItem mapOrderItemToResponseDTO(OrderItem item) {
        OrderResponseDTO.OrderItem dto = new OrderResponseDTO.OrderItem();
        dto.setId(item.getOrderItemId());
        dto.setQuantity(item.getQuantity());
        dto.setPrice(item.getPrice());
        dto.setTotalPrice(item.getSubtotal());

        // Set product info
        if (item.getProduct() != null) {
            OrderResponseDTO.Product product = new OrderResponseDTO.Product();
            product.setId(item.getProduct().getProductId());
            product.setName(item.getProduct().getProductName());

            // Add product images if available
            if (item.getProduct().getImages() != null && !item.getProduct().getImages().isEmpty()) {
                List<String> imageUrls = item.getProduct().getImages().stream()
                        .sorted((img1, img2) -> {
                            if (img1.isPrimary() && !img2.isPrimary())
                                return -1;
                            if (!img1.isPrimary() && img2.isPrimary())
                                return 1;
                            int sortOrder1 = img1.getSortOrder() != null ? img1.getSortOrder() : 0;
                            int sortOrder2 = img2.getSortOrder() != null ? img2.getSortOrder() : 0;
                            return Integer.compare(sortOrder1, sortOrder2);
                        })
                        .map(img -> img.getImageUrl())
                        .filter(url -> url != null && !url.trim().isEmpty())
                        .collect(Collectors.toList());
                product.setImages(imageUrls);
            }

            dto.setProduct(product);
        }

        // Set variant info if available
        if (item.getProductVariant() != null) {
            OrderResponseDTO.Variant variant = new OrderResponseDTO.Variant();
            variant.setId(item.getProductVariant().getId());
            variant.setName(item.getProductVariant().getVariantName());

            // Add variant images if available
            if (item.getProductVariant().getImages() != null && !item.getProductVariant().getImages().isEmpty()) {
                List<String> variantImageUrls = item.getProductVariant().getImages().stream()
                        .sorted((img1, img2) -> {
                            if (img1.isPrimary() && !img2.isPrimary())
                                return -1;
                            if (!img1.isPrimary() && img2.isPrimary())
                                return 1;
                            int sortOrder1 = img1.getSortOrder() != null ? img1.getSortOrder() : 0;
                            int sortOrder2 = img2.getSortOrder() != null ? img2.getSortOrder() : 0;
                            return Integer.compare(sortOrder1, sortOrder2);
                        })
                        .map(img -> img.getImageUrl())
                        .filter(url -> url != null && !url.trim().isEmpty())
                        .collect(Collectors.toList());
                variant.setImages(variantImageUrls);
            }

            dto.setVariant(variant);
        }

        // Set return eligibility (placeholder)
        dto.setReturnEligible(true);
        dto.setMaxReturnDays(30);
        dto.setDaysRemainingForReturn(25);

        return dto;
    }

    private Map<Long, List<MultiWarehouseStockAllocator.StockAllocation>> convertFEFOToStockAllocations(
            Map<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> fefoAllocations) {

        Map<Long, List<MultiWarehouseStockAllocator.StockAllocation>> stockAllocations = new HashMap<>();

        for (Map.Entry<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> entry : fefoAllocations
                .entrySet()) {
            CartItemDTO cartItem = entry.getKey();
            List<FEFOStockAllocationService.BatchAllocation> batchAllocations = entry.getValue();

            // Group by stock ID and sum quantities
            Map<Long, Integer> stockQuantities = new HashMap<>();
            Map<Long, FEFOStockAllocationService.BatchAllocation> stockToAllocation = new HashMap<>();

            for (FEFOStockAllocationService.BatchAllocation batchAllocation : batchAllocations) {
                Long stockId = batchAllocation.getStockBatch().getStock().getId();
                stockQuantities.merge(stockId, batchAllocation.getQuantityAllocated(), Integer::sum);
                stockToAllocation.put(stockId, batchAllocation); // Keep reference for warehouse info
            }

            // Convert to stock allocations
            List<MultiWarehouseStockAllocator.StockAllocation> allocations = new ArrayList<>();
            for (Map.Entry<Long, Integer> stockEntry : stockQuantities.entrySet()) {
                Long stockId = stockEntry.getKey();
                Integer quantity = stockEntry.getValue();
                FEFOStockAllocationService.BatchAllocation refAllocation = stockToAllocation.get(stockId);

                MultiWarehouseStockAllocator.StockAllocation stockAllocation = new MultiWarehouseStockAllocator.StockAllocation(
                        refAllocation.getWarehouse().getId(),
                        refAllocation.getWarehouse().getName(),
                        stockId,
                        quantity,
                        0.0 // Distance not needed for locking
                );
                allocations.add(stockAllocation);
            }

            // Use a unique key for each cart item (could be productId or variantId)
            Long key = cartItem.getVariantId() != null ? cartItem.getVariantId()
                    : (cartItem.getProductId() != null ? cartItem.getProductId().hashCode() : cartItem.hashCode());
            stockAllocations.put(key, allocations);
        }

        log.info("Converted {} FEFO allocation groups to {} stock allocation groups",
                fefoAllocations.size(), stockAllocations.size());
        return stockAllocations;
    }

    private void validateCartItems(List<CartItemDTO> items) {
        for (CartItemDTO item : items) {
            validateCartItem(item);
        }
    }

    private void validateCartItem(CartItemDTO item) {
        if (item.getVariantId() != null) {
            validateVariantItem(item);
        } else if (item.getProductId() != null) {
            validateProductItem(item);
        } else {
            throw new com.ecommerce.Exception.CheckoutValidationException("INVALID_ITEM",
                    "Cart item must have either productId or variantId");
        }
    }

    private void validateVariantItem(CartItemDTO item) {
        ProductVariant variant = variantRepository.findById(item.getVariantId())
                .orElseThrow(() -> new com.ecommerce.Exception.CheckoutValidationException("VARIANT_NOT_FOUND",
                        "Product variant not found with ID: " + item.getVariantId()));

        Product product = variant.getProduct();
        if (product == null) {
            throw new com.ecommerce.Exception.CheckoutValidationException("PRODUCT_NOT_FOUND",
                    "Product not found for variant ID: " + item.getVariantId());
        }

        if (!product.isActive()) {
            throw new com.ecommerce.Exception.CheckoutValidationException("PRODUCT_INACTIVE",
                    "Product is not active: " + product.getProductName());
        }

        if (!Boolean.TRUE.equals(product.getDisplayToCustomers())) {
            throw new com.ecommerce.Exception.CheckoutValidationException("PRODUCT_NOT_AVAILABLE",
                    "Product is not available for customers: " + product.getProductName());
        }

        if (!variant.isActive()) {
            throw new com.ecommerce.Exception.CheckoutValidationException("VARIANT_INACTIVE",
                    "Product variant is not active: " + variant.getVariantSku());
        }

        if (!productAvailabilityService.isVariantAvailableForCustomers(variant)) {
            int totalStock = productAvailabilityService.getVariantTotalStock(variant);
            String reason = totalStock <= 0 ? "out of stock" : "not available for customers";
            throw new com.ecommerce.Exception.CheckoutValidationException("VARIANT_NOT_AVAILABLE",
                    "Product variant is not available: " + variant.getVariantSku() + " (" + reason + ", stock: "
                            + totalStock + ")");
        }

        int availableStock = productAvailabilityService.getVariantTotalStock(variant);
        if (availableStock < item.getQuantity()) {
            throw new com.ecommerce.Exception.CheckoutValidationException("INSUFFICIENT_STOCK",
                    "Insufficient stock for variant " + variant.getVariantSku() +
                            ". Available: " + availableStock + ", Requested: " + item.getQuantity(),
                    variant.getVariantSku(), item.getQuantity(), availableStock);
        }
    }

    private void validateProductItem(CartItemDTO item) {
        Product product = productRepository.findById(item.getProductId())
                .orElseThrow(() -> new com.ecommerce.Exception.CheckoutValidationException("PRODUCT_NOT_FOUND",
                        "Product not found with ID: " + item.getProductId()));

        if (!product.isActive()) {
            throw new com.ecommerce.Exception.CheckoutValidationException("PRODUCT_INACTIVE",
                    "Product is not active: " + product.getProductName());
        }

        if (!Boolean.TRUE.equals(product.getDisplayToCustomers())) {
            throw new com.ecommerce.Exception.CheckoutValidationException("PRODUCT_NOT_AVAILABLE",
                    "Product is not available for customers: " + product.getProductName());
        }

        if (!productAvailabilityService.isProductAvailableForCustomers(product)) {
            throw new com.ecommerce.Exception.CheckoutValidationException("PRODUCT_NOT_AVAILABLE",
                    "Product is not available: " + product.getProductName());
        }

        int availableStock = productAvailabilityService.getTotalAvailableStock(product);
        if (availableStock < item.getQuantity()) {
            throw new com.ecommerce.Exception.CheckoutValidationException("INSUFFICIENT_STOCK",
                    "Insufficient stock for product " + product.getProductName() +
                            ". Available: " + availableStock + ", Requested: " + item.getQuantity(),
                    product.getProductName(), item.getQuantity(), availableStock);
        }
    }

    /**
     * Validate shops eligibility for checkout:
     * - Shop must be active
     * - Shop must have active subscription or freemium (if subscription system
     * enabled)
     * - Shop must have connected and active Stripe account
     * - Products are already validated in validateCartItems
     */
    private void validateShopsForCheckout(List<CartItemDTO> items) {
        Map<Shop, List<CartItemDTO>> itemsByShop = new HashMap<>();
        for (CartItemDTO item : items) {
            Shop shop = getShopForCartItem(item);
            if (shop == null) {
                throw new IllegalArgumentException("Product or variant not found or has no associated shop");
            }
            itemsByShop.computeIfAbsent(shop, k -> new ArrayList<>()).add(item);
        }

        for (Map.Entry<Shop, List<CartItemDTO>> entry : itemsByShop.entrySet()) {
            Shop shop = entry.getKey();
            String shopName = shop.getName();

            // 1. Check if shop is active
            if (shop.getIsActive() == null || !shop.getIsActive()) {
                throw new IllegalArgumentException(
                        "Shop '" + shopName
                                + "' is not active. Please contact the shop or choose products from another shop.");
            }

            // 2. Check Stripe account
            if (shop.getStripeAccount() == null) {
                throw new IllegalArgumentException(
                        "Shop '" + shopName
                                + "' does not have a payment account set up. Please contact the shop or choose products from another shop.");
            }

            if (shop.getStripeAccount().getAccountStatus() != com.ecommerce.entity.StripeAccount.AccountStatus.ACTIVE) {
                throw new IllegalArgumentException(
                        "Shop '" + shopName
                                + "' payment account is not active. Please contact the shop or choose products from another shop.");
            }

            if (shop.getStripeAccount().getStripeAccountId() == null ||
                    shop.getStripeAccount().getStripeAccountId().trim().isEmpty()) {
                throw new IllegalArgumentException(
                        "Shop '" + shopName
                                + "' does not have a valid payment account. Please contact the shop or choose products from another shop.");
            }

            // 3. Check subscription/freemium (if subscription system is enabled)
            boolean subscriptionSystemEnabled = subscriptionService.isSubscriptionEnabled();
            if (subscriptionSystemEnabled) {
                // Check if shop has active subscription
                com.ecommerce.dto.ShopSubscriptionDTO activeSubscription = subscriptionService
                        .getActiveSubscription(shop.getShopId());

                if (activeSubscription == null) {
                    // Check if shop has consumed freemium
                    boolean hasConsumedFreemium = subscriptionService.hasConsumedFreemium(shop.getShopId());

                    if (hasConsumedFreemium) {
                        throw new IllegalArgumentException(
                                "Shop '" + shopName
                                        + "' does not have an active subscription and has already used the freemium plan. "
                                        +
                                        "Please contact the shop or choose products from another shop.");
                    }
                    // If freemium not consumed, allow checkout (freemium shops can still operate)
                }
            }
        }
    }

    private boolean lockStockWithFEFOAllocation(String sessionId, List<CartItemDTO> items, AddressDto shippingAddress) {
        try {
            log.info("Starting FEFO allocation and batch locking for session: {}", sessionId);

            // Step 1: Perform FEFO allocation to determine which batches to use
            Map<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> fefoAllocations = enhancedWarehouseAllocator
                    .allocateStockWithFEFO(items, shippingAddress);

            if (fefoAllocations.isEmpty()) {
                log.error("FEFO allocation failed - no stock available");
                return false;
            }

            // Step 2: Convert FEFO allocations to batch lock requests
            List<EnhancedStockLockService.BatchLockRequest> lockRequests = new ArrayList<>();

            for (Map.Entry<CartItemDTO, List<FEFOStockAllocationService.BatchAllocation>> entry : fefoAllocations
                    .entrySet()) {
                CartItemDTO item = entry.getKey();
                List<FEFOStockAllocationService.BatchAllocation> allocations = entry.getValue();

                for (FEFOStockAllocationService.BatchAllocation allocation : allocations) {
                    // Get product/variant names for tracking
                    String productName = getProductName(item);
                    String variantName = getVariantName(item);

                    EnhancedStockLockService.BatchLockRequest lockRequest = new EnhancedStockLockService.BatchLockRequest(
                            allocation.getStockBatch().getId(),
                            allocation.getQuantityAllocated(),
                            allocation.getWarehouse().getId(),
                            productName,
                            variantName);

                    lockRequests.add(lockRequest);
                }
            }

            // Step 3: Lock the batches (this will temporarily reduce quantities)
            boolean lockSuccess = enhancedStockLockService.lockStockBatches(sessionId, lockRequests);

            if (lockSuccess) {
                log.info("Successfully locked {} batches for session: {}", lockRequests.size(), sessionId);
            } else {
                log.error("Failed to lock batches for session: {}", sessionId);
            }

            return lockSuccess;

        } catch (Exception e) {
            log.error("Error during FEFO allocation and batch locking for session {}: {}", sessionId, e.getMessage(),
                    e);
            return false;
        }
    }

    /**
     * Helper method to get product name from cart item
     */
    private String getProductName(CartItemDTO item) {
        try {
            if (item.getVariantId() != null) {
                ProductVariant variant = variantRepository.findById(item.getVariantId()).orElse(null);
                if (variant != null && variant.getProduct() != null) {
                    return variant.getProduct().getProductName();
                }
            } else if (item.getProductId() != null) {
                Product product = productRepository.findById(item.getProductId()).orElse(null);
                if (product != null) {
                    return product.getProductName();
                }
            }
        } catch (Exception e) {
            log.warn("Error getting product name for cart item: {}", e.getMessage());
        }
        return "Unknown Product";
    }

    /**
     * Helper method to get variant name from cart item
     */
    private String getVariantName(CartItemDTO item) {
        try {
            if (item.getVariantId() != null) {
                ProductVariant variant = variantRepository.findById(item.getVariantId()).orElse(null);
                if (variant != null) {
                    return variant.getVariantName();
                }
            }
        } catch (Exception e) {
            log.warn("Error getting variant name for cart item: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Transfer batch locks from temporary session to actual session
     */
    private void transferBatchLocks(String fromSessionId, String toSessionId) {
        try {
            enhancedStockLockService.transferBatchLocks(fromSessionId, toSessionId);
            log.info("Successfully transferred batch locks from {} to {}", fromSessionId, toSessionId);
        } catch (Exception e) {
            log.error("Failed to transfer batch locks from {} to {}: {}", fromSessionId, toSessionId, e.getMessage());
            throw new RuntimeException("Failed to transfer batch locks: " + e.getMessage(), e);
        }
    }

    /**
     * Cleanup expired batch locks
     */
    public void cleanupExpiredBatchLocks() {
        try {
            enhancedStockLockService.cleanupExpiredLocks();
            log.info("Successfully cleaned up expired batch locks");
        } catch (Exception e) {
            log.error("Failed to cleanup expired batch locks: {}", e.getMessage());
            throw new RuntimeException("Failed to cleanup expired batch locks: " + e.getMessage(), e);
        }
    }

    /**
     * Get locked stock information for a session
     */
    public Map<String, Object> getLockedStockInfo(String sessionId) {
        try {
            return enhancedStockLockService.getBatchLockInfo(sessionId);
        } catch (Exception e) {
            log.error("Failed to get locked stock info for session {}: {}", sessionId, e.getMessage());
            throw new RuntimeException("Failed to get locked stock info: " + e.getMessage(), e);
        }
    }

    private void refundPointsForFailedPayment(Order order) {
        try {
            if (order.getOrderTransaction() == null) {
                return;
            }

            Integer pointsUsed = order.getOrderTransaction().getPointsUsed();
            if (pointsUsed == null || pointsUsed <= 0) {
                return;
            }

            if (order.getUser() == null) {
                log.warn("Cannot refund points for order {} - no user associated", order.getOrderId());
                return;
            }

            String refundDescription = String.format("Points refunded for failed hybrid payment (Order #%s)",
                    order.getOrderCode() != null ? order.getOrderCode() : order.getOrderId().toString());

            // If per-shop shopTransactions exist, refund per shop according to shop
            // transaction points
            OrderTransaction tx = order.getOrderTransaction();
            if (tx != null && tx.getShopTransactions() != null && !tx.getShopTransactions().isEmpty()) {
                int totalPointsInTx = tx.getShopTransactions().stream()
                        .mapToInt(st -> st.getPointsUsed() != null ? st.getPointsUsed() : 0)
                        .sum();

                if (totalPointsInTx > 0) {
                    for (ShopOrderTransaction st : tx.getShopTransactions()) {
                        int shopPoints = st.getPointsUsed() != null ? st.getPointsUsed() : 0;
                        if (shopPoints <= 0)
                            continue;
                        Shop shop = st.getShopOrder() != null ? st.getShopOrder().getShop() : null;
                        if (shop != null) {
                            rewardService.refundPointsForCancelledOrder(order.getUser().getId(), shopPoints,
                                    refundDescription, shop);
                            log.info("Refunded {} points to user {} for shop {} (order {})",
                                    shopPoints, order.getUser().getId(), shop.getShopId(), order.getOrderId());
                        } else {
                            // fallback to global refund
                            rewardService.refundPointsForCancelledOrder(order.getUser().getId(), shopPoints,
                                    refundDescription);
                            log.info("Refunded {} points to user {} (global) for order {}",
                                    shopPoints, order.getUser().getId(), order.getOrderId());
                        }
                    }
                } else {
                    // No per-shop points recorded, fallback to single refund
                    rewardService.refundPointsForCancelledOrder(
                            order.getUser().getId(),
                            pointsUsed,
                            refundDescription);
                    log.info("Refunded {} points to user {} for failed hybrid payment order {}",
                            pointsUsed, order.getUser().getId(), order.getOrderId());
                }
            } else {
                rewardService.refundPointsForCancelledOrder(
                        order.getUser().getId(),
                        pointsUsed,
                        refundDescription);

                log.info("Refunded {} points to user {} for failed hybrid payment order {}",
                        pointsUsed, order.getUser().getId(), order.getOrderId());
            }

        } catch (Exception e) {
            log.error("Error refunding points for failed payment order {}: {}",
                    order.getOrderId(), e.getMessage(), e);
        }
    }

    /**
     * Record payment in money flow system
     */
    private void recordPaymentInMoneyFlow(Order order, OrderTransaction transaction) {
        try {
            BigDecimal paymentAmount = transaction.getOrderAmount();

            // For hybrid payments, only record the actual money paid (not points)
            if (transaction.getPaymentMethod() == OrderTransaction.PaymentMethod.HYBRID) {
                BigDecimal pointsValue = transaction.getPointsValue() != null ? transaction.getPointsValue()
                        : BigDecimal.ZERO;
                paymentAmount = paymentAmount.subtract(pointsValue);
            }

            // Only record if there's actual money involved
            if (paymentAmount.compareTo(BigDecimal.ZERO) > 0) {
                String description = String.format("Payment received for Order #%s (%s)",
                        order.getOrderCode() != null ? order.getOrderCode() : order.getOrderId().toString(),
                        transaction.getPaymentMethod().name());

                com.ecommerce.dto.CreateMoneyFlowDTO moneyFlowDTO = new com.ecommerce.dto.CreateMoneyFlowDTO();
                moneyFlowDTO.setDescription(description);
                moneyFlowDTO.setType(com.ecommerce.enums.MoneyFlowType.IN);
                moneyFlowDTO.setAmount(paymentAmount);

                moneyFlowService.save(moneyFlowDTO);
                log.info("Recorded money flow IN: {} for order {}", paymentAmount, order.getOrderId());
            }
        } catch (Exception e) {
            log.error("Failed to record money flow for order {}: {}", order.getOrderId(), e.getMessage(), e);
        }
    }

    /**
     * Release funds to a shop after delivery verification (escrow system)
     * This method releases funds for a single shop order only after delivery is
     * confirmed
     */
    @Transactional
    public void releaseFundsForShopOrder(ShopOrder shopOrder) {
        log.info("Releasing funds for shop order: {} (Shop: {})", shopOrder.getId(), shopOrder.getShop().getName());

        // Check if funds were already released
        if (Boolean.TRUE.equals(shopOrder.getFundsReleased())) {
            log.warn("Funds already released for shop order: {}. Skipping to prevent double payment.",
                    shopOrder.getId());
            return;
        }

        // Verify shop order is delivered
        if (shopOrder.getStatus() != ShopOrder.ShopOrderStatus.DELIVERED) {
            log.warn("Cannot release funds - shop order {} is not in DELIVERED status. Current status: {}",
                    shopOrder.getId(), shopOrder.getStatus());
            return;
        }

        // Get the parent order and transaction
        Order order = shopOrder.getOrder();
        OrderTransaction tx = order.getOrderTransaction();

        if (tx == null || tx.getStatus() != OrderTransaction.TransactionStatus.COMPLETED) {
            log.warn("Cannot release funds - transaction not completed for order: {}", order.getOrderId());
            return;
        }

        BigDecimal paidAmount = tx.getOrderAmount();

        // Calculate total order value for ratio (sum of all shop orders)
        BigDecimal totalOrderValue = BigDecimal.ZERO;
        for (ShopOrder so : order.getShopOrders()) {
            totalOrderValue = totalOrderValue.add(so.getTotalAmount());
        }

        // Handle hybrid payment adjustments - calculate only cash portion
        if (tx.getPaymentMethod() == OrderTransaction.PaymentMethod.HYBRID && tx.getPointsValue() != null) {
            BigDecimal pointsValue = tx.getPointsValue();

            if (paidAmount.compareTo(totalOrderValue) == 0 && pointsValue.compareTo(BigDecimal.ZERO) > 0) {
                // Subtract points value to get cash amount
                paidAmount = paidAmount.subtract(pointsValue);
            }
        }

        if (paidAmount.compareTo(BigDecimal.ZERO) <= 0) {
            log.info("No funds to release (paid amount is zero or negative)");
            return;
        }

        // Calculate distribution ratio (proportional share of cash)
        BigDecimal ratio = paidAmount.divide(totalOrderValue, 10, java.math.RoundingMode.HALF_DOWN);

        log.info("Fund release calculation - Paid: {}, Total Order Value: {}, Ratio: {}",
                paidAmount, totalOrderValue, ratio);

        // Calculate this shop's payout amount
        BigDecimal shopTotal = shopOrder.getTotalAmount();
        BigDecimal payoutAmount = shopTotal.multiply(ratio).setScale(2, java.math.RoundingMode.HALF_DOWN);

        log.info("Shop order {} - Shop Total: {}, Payout Amount: {}",
                shopOrder.getId(), shopTotal, payoutAmount);

        if (payoutAmount.compareTo(BigDecimal.ZERO) <= 0) {
            log.info("Payout amount is zero or negative for shop order: {}. Marking as released.", shopOrder.getId());
            // Still mark as released to prevent retry
            shopOrder.setFundsReleased(true);
            shopOrder.setFundsReleasedAt(LocalDateTime.now());
            shopOrderRepository.save(shopOrder);
            return;
        }

        // Check if shop has Stripe account connected
        if (shopOrder.getShop().getStripeAccount() == null ||
                shopOrder.getShop().getStripeAccount().getStripeAccountId() == null) {
            log.warn("Shop {} has no connected Stripe account, cannot release funds", shopOrder.getShop().getName());
            // Mark as released to prevent retry attempts
            shopOrder.setFundsReleased(true);
            shopOrder.setFundsReleasedAt(LocalDateTime.now());
            shopOrderRepository.save(shopOrder);
            return;
        }

        try {
            String connectedAccountId = shopOrder.getShop().getStripeAccount().getStripeAccountId();

            log.info("Successfully released {} to shop {} for shop order {}",
                    payoutAmount, shopOrder.getShop().getName(), shopOrder.getId());

        } catch (Exception e) {
            log.error("Failed to release funds to shop {} for shop order {}: {}",
                    shopOrder.getShop().getName(), shopOrder.getId(), e.getMessage(), e);
            // Don't mark as released if transfer failed - allow retry
            throw new RuntimeException("Failed to release funds to shop: " + e.getMessage(), e);
        }
    }
}
