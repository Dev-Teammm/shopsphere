package com.ecommerce.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface OrderAnalyticsService {

    /**
     * Get total number of orders
     */
    Long getTotalOrdersCount();

    Long getTotalOrdersCount(java.util.UUID shopId);

    /**
     * Get total revenue from all orders
     */
    Double getTotalRevenue();

    Double getTotalRevenue(java.util.UUID shopId);

    /**
     * Get average order value
     */
    Double getAverageOrderValue();

    Double getAverageOrderValue(java.util.UUID shopId);

    /**
     * Get orders count grouped by status
     */
    Map<String, Long> getOrdersCountByStatus();

    Map<String, Long> getOrdersCountByStatus(java.util.UUID shopId);

    /**
     * Get customer order statistics
     */
    Map<String, Object> getCustomerOrderStats();

    Map<String, Object> getCustomerOrderStats(java.util.UUID shopId);

    /**
     * Get delivery performance metrics
     */
    Map<String, Object> getDeliveryPerformanceMetrics();

    Map<String, Object> getDeliveryPerformanceMetrics(java.util.UUID shopId);

    /**
     * Get top selling products
     */
    List<Map<String, Object>> getTopSellingProducts(int limit);

    List<Map<String, Object>> getTopSellingProducts(int limit, java.util.UUID shopId);

    /**
     * Get revenue trend for specified number of days
     */
    List<Map<String, Object>> getRevenueTrend(int days);

    List<Map<String, Object>> getRevenueTrend(int days, java.util.UUID shopId);

    /**
     * Get revenue for a specific period
     */
    Double getRevenueForPeriod(LocalDateTime startDate, LocalDateTime endDate);

    Double getRevenueForPeriod(LocalDateTime startDate, LocalDateTime endDate, java.util.UUID shopId);

    /**
     * Get orders by date range
     */
    List<Map<String, Object>> getOrdersByDateRange(LocalDateTime startDate, LocalDateTime endDate);

    List<Map<String, Object>> getOrdersByDateRange(LocalDateTime startDate, LocalDateTime endDate,
            java.util.UUID shopId);
}
