package com.ecommerce.service.impl;

import com.ecommerce.Exception.CustomException;
import com.ecommerce.dto.ShopSubscriptionDTO;
import com.ecommerce.dto.SubscriptionPlanDTO;
import com.ecommerce.entity.Shop;
import com.ecommerce.enums.ShopCapability;
import com.ecommerce.entity.ShopSubscription;
import com.ecommerce.entity.SubscriptionPlan;
import com.ecommerce.entity.SystemConfig;
import com.ecommerce.repository.ShopRepository;
import com.ecommerce.repository.ShopSubscriptionRepository;
import com.ecommerce.repository.SubscriptionPlanRepository;
import com.ecommerce.repository.SystemConfigRepository;
import com.ecommerce.service.SubscriptionService;
import com.ecommerce.service.StripeService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.model.PaymentIntent;
import com.stripe.param.checkout.SessionCreateParams;

@Service
@Slf4j
@RequiredArgsConstructor
public class SubscriptionServiceImpl implements SubscriptionService {

    private final SubscriptionPlanRepository planRepository;
    private final ShopSubscriptionRepository subscriptionRepository;
    private final ShopRepository shopRepository;
    private final SystemConfigRepository configRepository;
    private final StripeService stripeService;

    private static final String CONFIG_SUBSCRIPTION_ENABLED = "SUBSCRIPTION_ENABLED";
    private static final String CONFIG_SHOP_REGISTRATION_ENABLED = "SHOP_REGISTRATION_ENABLED";

    @Override
    @Transactional
    public SubscriptionPlanDTO createPlan(SubscriptionPlanDTO planDTO) {
        if (planRepository.existsByName(planDTO.getName())) {
            throw new CustomException("Plan with name '" + planDTO.getName() + "' already exists");
        }
        if (planDTO.getCapability() == null) {
            throw new CustomException("Plan capability is required");
        }
        SubscriptionPlan plan = convertToEntity(planDTO);
        SubscriptionPlan savedPlan = planRepository.save(plan);
        return convertToDTO(savedPlan);
    }

    @Override
    @Transactional
    public SubscriptionPlanDTO updatePlan(Long planId, SubscriptionPlanDTO planDTO) {
        SubscriptionPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new EntityNotFoundException("Plan not found with id: " + planId));

        plan.setName(planDTO.getName());
        plan.setDescription(planDTO.getDescription());
        plan.setPrice(planDTO.getPrice());
        plan.setCurrency(planDTO.getCurrency());
        plan.setDurationInDays(planDTO.getDurationInDays());
        plan.setIsActive(planDTO.getIsActive());
        plan.setIsFreemium(planDTO.getIsFreemium());
        plan.setMaxProducts(planDTO.getMaxProducts());
        plan.setMaxWarehouses(planDTO.getMaxWarehouses());
        plan.setMaxEmployees(planDTO.getMaxEmployees());
        plan.setMaxDeliveryAgents(planDTO.getMaxDeliveryAgents());
        plan.setFeaturesJson(planDTO.getFeaturesJson());
        plan.setCapability(planDTO.getCapability()); // Keep for backward compatibility
        if (planDTO.getAllowedCapabilities() != null) {
            plan.setAllowedCapabilities(planDTO.getAllowedCapabilities());
        }

        SubscriptionPlan updatedPlan = planRepository.save(plan);
        return convertToDTO(updatedPlan);
    }

    @Override
    public List<SubscriptionPlanDTO> getAllPlans() {
        return planRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<SubscriptionPlanDTO> getActivePlans() {
        return planRepository.findAll().stream()
                .filter(SubscriptionPlan::getIsActive)
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<SubscriptionPlanDTO> getActivePlansForShop(UUID shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with id: " + shopId));

        ShopCapability shopCapability = shop.getPrimaryCapability();
        if (shopCapability == null) {
            // If shop has no primary capability, return all active plans
            return getActivePlans();
        }

        boolean freemiumConsumed = hasConsumedFreemium(shopId);
        return planRepository.findByCapabilityAndIsActiveTrue(shopCapability).stream()
                .map(plan -> {
                    SubscriptionPlanDTO dto = convertToDTO(plan);
                    // Set freemium consumed status for freemium plans
                    if (plan.getIsFreemium() != null && plan.getIsFreemium()) {
                        dto.setFreemiumConsumed(freemiumConsumed);
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<SubscriptionPlanDTO> getPlansByCapability(ShopCapability capability) {
        return planRepository.findByCapability(capability).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<SubscriptionPlanDTO> getActivePlansByCapability(ShopCapability capability) {
        return planRepository.findByCapabilityAndIsActiveTrue(capability).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public SubscriptionPlanDTO getPlanById(Long planId) {
        return planRepository.findById(planId)
                .map(this::convertToDTO)
                .orElseThrow(() -> new EntityNotFoundException("Plan not found with id: " + planId));
    }

    @Override
    public void deletePlan(Long planId) {
        planRepository.deleteById(planId);
    }

    @Override
    @Transactional
    public ShopSubscriptionDTO subscribeShop(UUID shopId, Long planId, Boolean autoRenew) {
        if (!isSubscriptionEnabled()) {
            throw new CustomException("Subscription system is currently disabled");
        }

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with id: " + shopId));

        SubscriptionPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new EntityNotFoundException("Plan not found with id: " + planId));

        if (!plan.getIsActive()) {
            throw new CustomException("This plan is not currently active");
        }

        // Validate shop capability matches plan capability
        ShopCapability shopCapability = shop.getPrimaryCapability();
        if (shopCapability == null) {
            throw new CustomException("Shop capability is not set. Please set your shop capability first.");
        }
        if (!shopCapability.equals(plan.getCapability())) {
            throw new CustomException(
                    "This plan is not compatible with your shop's capability (" + shopCapability.name()
                            + "). Please select a plan that matches your shop type or update your shop capability.");
        }

        // For freemium plans, check if shop has already consumed freemium
        if (plan.getIsFreemium() != null && plan.getIsFreemium()) {
            if (hasConsumedFreemium(shopId)) {
                throw new CustomException(
                        "You have already used your free trial. Free plans can only be used once per shop and cannot be reactivated after cancellation or expiration.");
            }

            // Check if shop already has an active subscription
            subscriptionRepository.findActiveSubscriptionByShopId(shopId)
                    .ifPresent(activeSub -> {
                        throw new CustomException(
                                "Shop already has an active subscription. Please cancel it first before subscribing to a new plan.");
                    });

            // Create freemium subscription immediately
            ShopSubscription subscription = new ShopSubscription();
            subscription.setShop(shop);
            subscription.setPlan(plan);
            subscription.setStartDate(LocalDateTime.now());
            subscription.setEndDate(LocalDateTime.now().plusDays(plan.getDurationInDays()));
            subscription.setStatus(ShopSubscription.SubscriptionStatus.ACTIVE);
            subscription.setAmountPaid(BigDecimal.ZERO); // Free
            subscription.setAutoRenew(false); // Freemium doesn't auto-renew
            subscription.setPaymentReference("FREEMIUM_TRIAL");

            ShopSubscription savedSubscription = subscriptionRepository.save(subscription);
            log.info("Created freemium subscription for shop: {}", shopId);
            return convertToDTO(savedSubscription);
        }

        // For paid plans, throw exception - use createSubscriptionCheckoutSession
        // instead
        throw new CustomException("This is a paid plan. Please use the checkout flow to subscribe.");
    }

    @Override
    @Transactional
    public ShopSubscriptionDTO renewSubscription(UUID shopId) {
        ShopSubscription activeSub = subscriptionRepository.findActiveSubscriptionByShopId(shopId)
                .orElseThrow(() -> new CustomException("No active subscription found to renew"));

        // Extend validity
        activeSub.setEndDate(activeSub.getEndDate().plusDays(activeSub.getPlan().getDurationInDays()));
        ShopSubscription saved = subscriptionRepository.save(activeSub);
        return convertToDTO(saved);
    }

    @Override
    @Transactional
    public void cancelSubscription(UUID shopId) {
        ShopSubscription activeSub = subscriptionRepository.findActiveSubscriptionByShopId(shopId)
                .orElseThrow(() -> new CustomException("No active subscription found to cancel"));

        // Mark subscription as cancelled
        activeSub.setStatus(ShopSubscription.SubscriptionStatus.CANCELLED);
        activeSub.setAutoRenew(false);
        subscriptionRepository.save(activeSub);

        // Log cancellation, especially for freemium plans
        if (activeSub.getPlan() != null && activeSub.getPlan().getIsFreemium() != null
                && activeSub.getPlan().getIsFreemium()) {
            log.info("Freemium subscription cancelled for shop: {}. This shop can no longer activate freemium plans.",
                    shopId);
        }
    }

    @Override
    public ShopSubscriptionDTO getActiveSubscription(UUID shopId) {
        return subscriptionRepository.findActiveSubscriptionByShopId(shopId)
                .map(this::convertToDTO)
                .orElse(null);
    }

    @Override
    public List<ShopSubscriptionDTO> getSubscriptionHistory(UUID shopId) {
        return subscriptionRepository.findByShopShopId(shopId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public boolean hasConsumedFreemium(UUID shopId) {
        // Check if shop has any subscription with a freemium plan (regardless of
        // status: ACTIVE, CANCELLED, or EXPIRED)
        // Once a freemium plan is used, cancelled, or expired, it cannot be reactivated
        // for that shop
        List<ShopSubscription> subscriptions = subscriptionRepository.findByShopShopId(shopId);
        return subscriptions.stream()
                .anyMatch(sub -> sub.getPlan() != null &&
                        sub.getPlan().getIsFreemium() != null &&
                        sub.getPlan().getIsFreemium());
    }

    @Override
    @Transactional
    public String createSubscriptionCheckoutSession(UUID shopId, Long planId, String platform)
            throws StripeException {
        if (!isSubscriptionEnabled()) {
            throw new CustomException("Subscription system is currently disabled");
        }

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with id: " + shopId));

        SubscriptionPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new EntityNotFoundException("Plan not found with id: " + planId));

        if (!plan.getIsActive()) {
            throw new CustomException("This plan is not currently active");
        }

        // Validate shop capability matches plan capability
        ShopCapability shopCapability = shop.getPrimaryCapability();
        if (shopCapability == null) {
            throw new CustomException("Shop capability is not set. Please set your shop capability first.");
        }
        if (!shopCapability.equals(plan.getCapability())) {
            throw new CustomException(
                    "This plan is not compatible with your shop's capability (" + shopCapability.name()
                            + "). Please select a plan that matches your shop type or update your shop capability.");
        }

        if (plan.getIsFreemium() != null && plan.getIsFreemium()) {
            throw new CustomException("Freemium plans should be activated directly, not through checkout");
        }

        // Check if shop already has an active subscription
        subscriptionRepository.findActiveSubscriptionByShopId(shopId)
                .ifPresent(activeSub -> {
                    throw new CustomException("Shop already has an active subscription. Please cancel it first.");
                });

        // Create a pending subscription record
        ShopSubscription pendingSubscription = new ShopSubscription();
        pendingSubscription.setShop(shop);
        pendingSubscription.setPlan(plan);
        pendingSubscription.setStartDate(LocalDateTime.now());
        pendingSubscription.setEndDate(LocalDateTime.now().plusDays(plan.getDurationInDays()));
        pendingSubscription.setStatus(ShopSubscription.SubscriptionStatus.PENDING_PAYMENT);
        pendingSubscription.setAmountPaid(BigDecimal.ZERO);
        pendingSubscription.setAutoRenew(false);

        ShopSubscription savedSubscription = subscriptionRepository.save(pendingSubscription);

        // Create Stripe checkout session
        long amountInCents = plan.getPrice().multiply(BigDecimal.valueOf(100)).longValue();

        // Build product data - only set description if it's not null or empty (Stripe
        // doesn't allow empty strings)
        SessionCreateParams.LineItem.PriceData.ProductData.Builder productDataBuilder = SessionCreateParams.LineItem.PriceData.ProductData
                .builder()
                .setName(plan.getName() + " Subscription");

        // Only set description if it's not null and not empty
        String planDescription = plan.getDescription();
        if (planDescription != null && !planDescription.trim().isEmpty()) {
            productDataBuilder.setDescription(planDescription);
        }

        SessionCreateParams.LineItem.PriceData.ProductData productData = productDataBuilder.build();

        SessionCreateParams.LineItem.PriceData priceData = SessionCreateParams.LineItem.PriceData.builder()
                .setCurrency(plan.getCurrency() != null ? plan.getCurrency().toLowerCase() : "rwf")
                .setUnitAmount(amountInCents)
                .setProductData(productData)
                .build();

        SessionCreateParams.LineItem lineItem = SessionCreateParams.LineItem.builder()
                .setPriceData(priceData)
                .setQuantity(1L)
                .build();

        String webSuccess = "http://localhost:3001/shops/manage/" + shopId
                + "?subscription=success&session_id={CHECKOUT_SESSION_ID}";
        String webCancel = "http://localhost:3001/shops/manage/" + shopId
                + "?subscription=cancel&session_id={CHECKOUT_SESSION_ID}";
        String mobSuccess = "snapshop://subscription-success?session_id={CHECKOUT_SESSION_ID}";
        String mobCancel = "snapshop://subscription-cancel?session_id={CHECKOUT_SESSION_ID}";

        String successUrl = (platform != null && platform.equalsIgnoreCase("mobile")) ? mobSuccess : webSuccess;
        String cancelUrl = (platform != null && platform.equalsIgnoreCase("mobile")) ? mobCancel : webCancel;

        Map<String, String> metadata = Map.of(
                "shopId", shopId.toString(),
                "subscriptionId", savedSubscription.getId().toString(),
                "planId", planId.toString(),
                "type", "subscription");

        SessionCreateParams params = SessionCreateParams.builder()
                .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .addLineItem(lineItem)
                .putAllMetadata(metadata)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .build();

        Session session = Session.create(params);

        // Update subscription with session ID
        savedSubscription.setPaymentReference(session.getId());
        subscriptionRepository.save(savedSubscription);

        log.info("Created Stripe checkout session for subscription: {}, session: {}",
                savedSubscription.getId(), session.getId());

        return session.getUrl();
    }

    @Override
    @Transactional
    public ShopSubscriptionDTO verifySubscriptionPayment(String sessionId) {
        log.info("Verifying subscription payment for session: {}", sessionId);

        Session session;
        try {
            session = stripeService.retrieveSession(sessionId);
            log.info("Retrieved Stripe session: {}, payment status: {}", sessionId, session.getPaymentStatus());
        } catch (StripeException e) {
            log.error("Failed to retrieve Stripe session: {}", e.getMessage());
            throw new CustomException("Failed to verify payment: " + e.getMessage());
        }

        if (!"paid".equalsIgnoreCase(session.getPaymentStatus())) {
            log.warn("Payment not completed for session: {}, status: {}", sessionId, session.getPaymentStatus());
            throw new CustomException("Payment not completed. Status: " + session.getPaymentStatus());
        }

        // Find subscription by payment reference (session ID)
        Optional<ShopSubscription> subscriptionOpt = subscriptionRepository.findByPaymentReference(sessionId);
        log.info("Found subscription by payment reference: {}", subscriptionOpt.isPresent());

        ShopSubscription subscription;
        if (subscriptionOpt.isPresent()) {
            subscription = subscriptionOpt.get();
            log.info("Found subscription: {}, status: {}", subscription.getId(), subscription.getStatus());
        } else {
            // Fallback: try to find by metadata
            String subscriptionIdStr = session.getMetadata() != null ? session.getMetadata().get("subscriptionId")
                    : null;
            log.info("Subscription not found by payment reference, trying metadata. subscriptionId from metadata: {}",
                    subscriptionIdStr);

            if (subscriptionIdStr != null) {
                try {
                    Long subscriptionId = Long.parseLong(subscriptionIdStr);
                    subscription = subscriptionRepository.findById(subscriptionId)
                            .orElseThrow(() -> new EntityNotFoundException("Subscription not found"));
                    log.info("Found subscription by metadata ID: {}, status: {}", subscription.getId(),
                            subscription.getStatus());
                } catch (NumberFormatException e) {
                    log.error("Invalid subscription ID in session metadata: {}", subscriptionIdStr);
                    throw new CustomException("Invalid subscription ID in session metadata");
                }
            } else {
                log.error("Subscription not found for session: {}. No payment reference match and no metadata.",
                        sessionId);
                throw new EntityNotFoundException("Subscription not found for session: " + sessionId);
            }
        }

        if (subscription.getStatus() != ShopSubscription.SubscriptionStatus.PENDING_PAYMENT) {
            // If already activated, just return it
            if (subscription.getStatus() == ShopSubscription.SubscriptionStatus.ACTIVE) {
                log.info("Subscription {} already activated", subscription.getId());
                return convertToDTO(subscription);
            }
            throw new CustomException("Subscription is not in pending payment status");
        }

        // Cancel any other active subscriptions for this shop
        subscriptionRepository.findActiveSubscriptionByShopId(subscription.getShop().getShopId())
                .ifPresent(activeSub -> {
                    if (!activeSub.getId().equals(subscription.getId())) {
                        activeSub.setStatus(ShopSubscription.SubscriptionStatus.EXPIRED);
                        subscriptionRepository.save(activeSub);
                        log.info("Expired previous active subscription: {}", activeSub.getId());
                    }
                });

        // Activate the subscription
        subscription.setStatus(ShopSubscription.SubscriptionStatus.ACTIVE);

        // Update payment reference to payment intent ID (keep session ID for reference)
        // The payment intent ID is more useful for tracking the actual payment
        String paymentIntentId = session.getPaymentIntent();
        if (paymentIntentId != null) {
            subscription.setPaymentReference(paymentIntentId);
            log.info("Updated payment reference to payment intent: {}", paymentIntentId);
        } else {
            // Keep the session ID if no payment intent
            log.warn("No payment intent found in session, keeping session ID as payment reference");
        }

        subscription.setAmountPaid(subscription.getPlan().getPrice());
        subscription.setStartDate(LocalDateTime.now());
        subscription.setEndDate(LocalDateTime.now().plusDays(subscription.getPlan().getDurationInDays()));

        ShopSubscription saved = subscriptionRepository.save(subscription);
        log.info("Activated subscription: {} after payment verification. Status: {}, Payment Reference: {}",
                subscription.getId(), saved.getStatus(), saved.getPaymentReference());

        return convertToDTO(saved);
    }

    @Override
    @Transactional
    public void toggleAutoRenew(UUID shopId, Boolean autoRenew) {
        ShopSubscription activeSub = subscriptionRepository.findActiveSubscriptionByShopId(shopId)
                .orElseThrow(() -> new CustomException("No active subscription found"));

        activeSub.setAutoRenew(autoRenew != null ? autoRenew : false);
        subscriptionRepository.save(activeSub);
        log.info("Updated auto-renew for shop {} to {}", shopId, autoRenew);
    }

    @Override
    public boolean isSubscriptionEnabled() {
        return configRepository.findByKey(CONFIG_SUBSCRIPTION_ENABLED)
                .map(config -> Boolean.parseBoolean(config.getValue()))
                .orElse(true); // Default enabled if config missing? Or default disabled? Let's say enabled.
    }

    @Override
    @Transactional
    public void setSubscriptionEnabled(boolean enabled) {
        SystemConfig config = configRepository.findByKey(CONFIG_SUBSCRIPTION_ENABLED)
                .orElse(new SystemConfig());
        if (config.getKey() == null) {
            config.setKey(CONFIG_SUBSCRIPTION_ENABLED);
            config.setDescription("Global toggle for shop subscription system");
        }
        config.setValue(String.valueOf(enabled));
        configRepository.save(config);
    }

    @Override
    public boolean isShopRegistrationEnabled() {
        return configRepository.findByKey(CONFIG_SHOP_REGISTRATION_ENABLED)
                .map(config -> Boolean.parseBoolean(config.getValue()))
                .orElse(true); // Default enabled if config missing
    }

    @Override
    @Transactional
    public void setShopRegistrationEnabled(boolean enabled) {
        SystemConfig config = configRepository.findByKey(CONFIG_SHOP_REGISTRATION_ENABLED)
                .orElse(new SystemConfig());
        if (config.getKey() == null) {
            config.setKey(CONFIG_SHOP_REGISTRATION_ENABLED);
            config.setDescription("Global toggle for allowing new shop registration");
        }
        config.setValue(String.valueOf(enabled));
        configRepository.save(config);
        log.info("Shop registration {} by admin", enabled ? "enabled" : "disabled");
    }

    // Mappers
    private SubscriptionPlanDTO convertToDTO(SubscriptionPlan plan) {
        SubscriptionPlanDTO dto = new SubscriptionPlanDTO();
        dto.setId(plan.getId());
        dto.setName(plan.getName());
        dto.setDescription(plan.getDescription());
        dto.setPrice(plan.getPrice());
        dto.setCurrency(plan.getCurrency());
        dto.setDurationInDays(plan.getDurationInDays());
        dto.setIsActive(plan.getIsActive());
        dto.setIsFreemium(plan.getIsFreemium());
        dto.setMaxProducts(plan.getMaxProducts());
        dto.setMaxWarehouses(plan.getMaxWarehouses());
        dto.setMaxEmployees(plan.getMaxEmployees());
        dto.setMaxDeliveryAgents(plan.getMaxDeliveryAgents());
        dto.setFeaturesJson(plan.getFeaturesJson());
        dto.setCapability(plan.getCapability()); // Keep for backward compatibility
        dto.setAllowedCapabilities(plan.getAllowedCapabilities());
        dto.setCreatedAt(plan.getCreatedAt());
        dto.setUpdatedAt(plan.getUpdatedAt());
        return dto;
    }

    private SubscriptionPlan convertToEntity(SubscriptionPlanDTO dto) {
        SubscriptionPlan plan = new SubscriptionPlan();
        plan.setName(dto.getName());
        plan.setDescription(dto.getDescription());
        plan.setPrice(dto.getPrice());
        plan.setCurrency(dto.getCurrency());
        plan.setDurationInDays(dto.getDurationInDays());
        plan.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        plan.setIsFreemium(dto.getIsFreemium() != null ? dto.getIsFreemium() : false);
        plan.setMaxProducts(dto.getMaxProducts());
        plan.setMaxWarehouses(dto.getMaxWarehouses());
        plan.setMaxEmployees(dto.getMaxEmployees());
        plan.setMaxDeliveryAgents(dto.getMaxDeliveryAgents());
        plan.setFeaturesJson(dto.getFeaturesJson());
        plan.setCapability(dto.getCapability()); // Keep for backward compatibility
        plan.setAllowedCapabilities(
                dto.getAllowedCapabilities() != null ? dto.getAllowedCapabilities() : new HashSet<>());
        return plan;
    }

    private ShopSubscriptionDTO convertToDTO(ShopSubscription sub) {
        ShopSubscriptionDTO dto = new ShopSubscriptionDTO();
        dto.setId(sub.getId());
        dto.setShopId(sub.getShop().getShopId());
        dto.setShopName(sub.getShop().getName());
        dto.setPlanId(sub.getPlan().getId());
        dto.setPlanName(sub.getPlan().getName());
        dto.setStartDate(sub.getStartDate());
        dto.setEndDate(sub.getEndDate());
        dto.setStatus(sub.getStatus());
        dto.setPaymentReference(sub.getPaymentReference());
        dto.setAmountPaid(sub.getAmountPaid());
        dto.setAutoRenew(sub.getAutoRenew());
        dto.setCreatedAt(sub.getCreatedAt());
        dto.setUpdatedAt(sub.getUpdatedAt());
        return dto;
    }
}
