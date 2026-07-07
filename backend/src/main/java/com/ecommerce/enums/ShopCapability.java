package com.ecommerce.enums;

/**
 * Defines the operational capabilities of a shop.
 * 
 * VISUALIZATION_ONLY: Shop can only display products, no orders/delivery/returns
 * PICKUP_ORDERS: Shop can display products, accept pickup orders, and handle returns (customer returns to shop, no delivery agent)
 * FULL_ECOMMERCE: Shop can display products, accept orders, handle delivery (with agents), and handle returns (with agents)
 * HYBRID: Shop supports both PICKUP_ORDERS and FULL_ECOMMERCE capabilities
 */
public enum ShopCapability {
    VISUALIZATION_ONLY,      // Only show products
    PICKUP_ORDERS,           // Pickup orders + returns (no delivery agent)
    FULL_ECOMMERCE,          // Full orders + delivery + returns (with agents)
    HYBRID                   // Both pickup and full e-commerce
}
