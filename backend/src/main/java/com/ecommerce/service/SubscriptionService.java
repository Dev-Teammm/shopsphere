package com.ecommerce.service;

import com.ecommerce.dto.ShopSubscriptionDTO;
import com.ecommerce.dto.SubscriptionPlanDTO;
import com.ecommerce.enums.ShopCapability;

import java.util.List;
import java.util.UUID;

public interface SubscriptionService {
    
    // Plan Management
    SubscriptionPlanDTO createPlan(SubscriptionPlanDTO planDTO);
    SubscriptionPlanDTO updatePlan(Long planId, SubscriptionPlanDTO planDTO);
    List<SubscriptionPlanDTO> getAllPlans();
    List<SubscriptionPlanDTO> getActivePlans();
    List<SubscriptionPlanDTO> getActivePlansForShop(UUID shopId);
    List<SubscriptionPlanDTO> getPlansByCapability(ShopCapability capability);
    List<SubscriptionPlanDTO> getActivePlansByCapability(ShopCapability capability);
    SubscriptionPlanDTO getPlanById(Long planId);
    void deletePlan(Long planId);

    // Subscription Management
    ShopSubscriptionDTO subscribeShop(UUID shopId, Long planId, Boolean autoRenew);
    String createSubscriptionCheckoutSession(UUID shopId, Long planId, String platform) throws com.stripe.exception.StripeException;
    ShopSubscriptionDTO verifySubscriptionPayment(String sessionId);
    ShopSubscriptionDTO renewSubscription(UUID shopId);
    void cancelSubscription(UUID shopId);
    void toggleAutoRenew(UUID shopId, Boolean autoRenew);
    ShopSubscriptionDTO getActiveSubscription(UUID shopId);
    List<ShopSubscriptionDTO> getSubscriptionHistory(UUID shopId);
    boolean hasConsumedFreemium(UUID shopId);
    
    // Check Status
    boolean isSubscriptionEnabled();
    void setSubscriptionEnabled(boolean enabled);
    
    // Shop Registration Control
    boolean isShopRegistrationEnabled();
    void setShopRegistrationEnabled(boolean enabled);
}
