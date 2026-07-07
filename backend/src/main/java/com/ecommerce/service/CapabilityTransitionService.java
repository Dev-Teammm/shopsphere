package com.ecommerce.service;

import com.ecommerce.dto.CapabilityTransitionDTO;
import com.ecommerce.enums.ShopCapability;

import java.util.List;
import java.util.UUID;

public interface CapabilityTransitionService {
    
    /**
     * Request a capability transition for a shop
     * Returns transition DTO if transition is needed, null if immediate change is possible
     */
    CapabilityTransitionDTO requestCapabilityTransition(UUID shopId, ShopCapability newCapability);
    
    /**
     * Get active transition for a shop
     */
    CapabilityTransitionDTO getActiveTransition(UUID shopId);
    
    /**
     * Cancel an active transition
     */
    void cancelTransition(UUID shopId, String reason);
    
    /**
     * Check and update transition status (called by scheduled job)
     */
    void checkAndUpdateTransitions();
    
    /**
     * Count pending operations that require the old capability
     */
    PendingOperationsCount countPendingOperations(UUID shopId, ShopCapability oldCapability, ShopCapability newCapability);
    
    /**
     * Check if shop can accept new orders of a specific type during transition
     */
    boolean canAcceptNewOrderType(UUID shopId, boolean requiresDelivery);
    
    /**
     * Get effective capabilities for a shop (considering active transition)
     */
    EffectiveCapabilities getEffectiveCapabilities(UUID shopId);
    
    /**
     * DTO for pending operations count
     */
    class PendingOperationsCount {
        private int pendingOrders;
        private int pendingReturns;
        private int pendingAppeals;
        private int pendingDeliveries;
        
        public PendingOperationsCount() {}
        
        public PendingOperationsCount(int pendingOrders, int pendingReturns, int pendingAppeals, int pendingDeliveries) {
            this.pendingOrders = pendingOrders;
            this.pendingReturns = pendingReturns;
            this.pendingAppeals = pendingAppeals;
            this.pendingDeliveries = pendingDeliveries;
        }
        
        public int getTotal() {
            return pendingOrders + pendingReturns + pendingAppeals + pendingDeliveries;
        }
        
        // Getters and setters
        public int getPendingOrders() { return pendingOrders; }
        public void setPendingOrders(int pendingOrders) { this.pendingOrders = pendingOrders; }
        public int getPendingReturns() { return pendingReturns; }
        public void setPendingReturns(int pendingReturns) { this.pendingReturns = pendingReturns; }
        public int getPendingAppeals() { return pendingAppeals; }
        public void setPendingAppeals(int pendingAppeals) { this.pendingAppeals = pendingAppeals; }
        public int getPendingDeliveries() { return pendingDeliveries; }
        public void setPendingDeliveries(int pendingDeliveries) { this.pendingDeliveries = pendingDeliveries; }
    }
    
    /**
     * DTO for effective capabilities during transition
     */
    class EffectiveCapabilities {
        private ShopCapability primaryCapability;
        private ShopCapability transitionCapability; // Old capability during transition
        private boolean inTransition;
        
        public EffectiveCapabilities(ShopCapability primaryCapability) {
            this.primaryCapability = primaryCapability;
            this.inTransition = false;
        }
        
        public EffectiveCapabilities(ShopCapability primaryCapability, ShopCapability transitionCapability) {
            this.primaryCapability = primaryCapability;
            this.transitionCapability = transitionCapability;
            this.inTransition = true;
        }
        
        /**
         * Check if shop effectively supports delivery (has either capability)
         */
        public boolean supportsDelivery() {
            if (inTransition && transitionCapability != null) {
                return primaryCapability == ShopCapability.FULL_ECOMMERCE || 
                       primaryCapability == ShopCapability.HYBRID ||
                       transitionCapability == ShopCapability.FULL_ECOMMERCE || 
                       transitionCapability == ShopCapability.HYBRID;
            }
            return primaryCapability == ShopCapability.FULL_ECOMMERCE || 
                   primaryCapability == ShopCapability.HYBRID;
        }
        
        /**
         * Check if shop effectively supports pickup
         */
        public boolean supportsPickup() {
            if (inTransition && transitionCapability != null) {
                return primaryCapability == ShopCapability.PICKUP_ORDERS || 
                       primaryCapability == ShopCapability.HYBRID ||
                       transitionCapability == ShopCapability.PICKUP_ORDERS || 
                       transitionCapability == ShopCapability.HYBRID;
            }
            return primaryCapability == ShopCapability.PICKUP_ORDERS || 
                   primaryCapability == ShopCapability.HYBRID;
        }
        
        /**
         * Check if shop effectively supports visualization
         */
        public boolean supportsVisualization() {
            return true; // All shops support visualization
        }
        
        // Getters
        public ShopCapability getPrimaryCapability() { return primaryCapability; }
        public ShopCapability getTransitionCapability() { return transitionCapability; }
        public boolean isInTransition() { return inTransition; }
    }
}
