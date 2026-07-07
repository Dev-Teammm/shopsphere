package com.ecommerce.service.impl;

import com.ecommerce.Enum.UserRole;
import java.math.BigDecimal;
import com.ecommerce.entity.Order;
import com.ecommerce.entity.OrderItem;
import com.ecommerce.entity.Product;
import com.ecommerce.repository.OrderRepository;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.repository.ShopOrderRepository;
import com.ecommerce.repository.UserRepository;
import com.ecommerce.service.OrderAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderAnalyticsServiceImpl implements OrderAnalyticsService {

    private final OrderRepository orderRepository;
    private final ShopOrderRepository shopOrderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Override
    public Long getTotalOrdersCount() {
        try {
            return orderRepository.count();
        } catch (Exception e) {
            log.error("Error getting total orders count: {}", e.getMessage(), e);
            return 0L;
        }
    }

    @Override
    public Double getTotalRevenue() {
        try {
            List<Order> orders = orderRepository.findAll().stream()
                    .filter(order -> "DELIVERED".equals(order.getStatus()))
                    .collect(Collectors.toList());
            return orders.stream()
                    .mapToDouble(order -> order.getTotalAmount().doubleValue())
                    .sum();
        } catch (Exception e) {
            log.error("Error getting total revenue: {}", e.getMessage(), e);
            return 0.0;
        }
    }

    @Override
    public Long getTotalOrdersCount(UUID shopId) {
        try {
            return shopOrderRepository.countByShopId(shopId);
        } catch (Exception e) {
            log.error("Error getting total orders count for shop {}: {}", shopId, e.getMessage(), e);
            return 0L;
        }
    }

    @Override
    public Double getTotalRevenue(UUID shopId) {
        try {
            BigDecimal revenue = shopOrderRepository.sumTotalRevenueByShopId(shopId);
            return revenue != null ? revenue.doubleValue() : 0.0;
        } catch (Exception e) {
            log.error("Error getting total revenue for shop {}: {}", shopId, e.getMessage(), e);
            return 0.0;
        }
    }

    @Override
    public Double getAverageOrderValue() {
        try {
            List<Order> orders = orderRepository.findAll().stream()
                    .filter(order -> "DELIVERED".equals(order.getStatus()))
                    .collect(Collectors.toList());
            if (orders.isEmpty()) {
                return 0.0;
            }

            double totalRevenue = orders.stream()
                    .mapToDouble(order -> order.getTotalAmount().doubleValue())
                    .sum();

            return totalRevenue / orders.size();
        } catch (Exception e) {
            log.error("Error getting average order value: {}", e.getMessage(), e);
            return 0.0;
        }
    }

    @Override
    public Double getAverageOrderValue(UUID shopId) {
        try {
            List<com.ecommerce.entity.ShopOrder> orders = shopOrderRepository.findByShopId(shopId).stream()
                    .filter(so -> com.ecommerce.entity.ShopOrder.ShopOrderStatus.DELIVERED.equals(so.getStatus()))
                    .collect(Collectors.toList());
            if (orders.isEmpty()) {
                return 0.0;
            }

            double totalRevenue = orders.stream()
                    .mapToDouble(so -> so.getTotalAmount().doubleValue())
                    .sum();

            return totalRevenue / orders.size();
        } catch (Exception e) {
            log.error("Error getting average order value for shop {}: {}", shopId, e.getMessage(), e);
            return 0.0;
        }
    }

    @Override
    public Map<String, Long> getOrdersCountByStatus() {
        try {
            List<Order> allOrders = orderRepository.findAll();
            return allOrders.stream()
                    .collect(Collectors.groupingBy(
                            Order::getStatus,
                            Collectors.counting()));
        } catch (Exception e) {
            log.error("Error getting orders count by status: {}", e.getMessage(), e);
            return new HashMap<>();
        }
    }

    @Override
    public Map<String, Long> getOrdersCountByStatus(UUID shopId) {
        try {
            List<com.ecommerce.entity.ShopOrder> allOrders = shopOrderRepository.findByShopId(shopId);
            return allOrders.stream()
                    .collect(Collectors.groupingBy(
                            so -> so.getStatus().name(),
                            Collectors.counting()));
        } catch (Exception e) {
            log.error("Error getting orders count by status for shop {}: {}", shopId, e.getMessage(), e);
            return new HashMap<>();
        }
    }

    @Override
    public Map<String, Object> getCustomerOrderStats() {
        try {
            Map<String, Object> stats = new HashMap<>();

            // Total customers
            long totalCustomers = userRepository.countByRole(UserRole.CUSTOMER);
            stats.put("totalCustomers", totalCustomers);

            // Customers with orders
            List<Order> orders = orderRepository.findAll();
            long customersWithOrders = orders.stream()
                    .filter(o -> o.getUser() != null)
                    .map(order -> order.getUser().getId())
                    .distinct()
                    .count();
            stats.put("customersWithOrders", customersWithOrders);

            // Average orders per customer
            if (customersWithOrders > 0) {
                double avgOrdersPerCustomer = (double) orders.size() / customersWithOrders;
                stats.put("averageOrdersPerCustomer", avgOrdersPerCustomer);
            } else {
                stats.put("averageOrdersPerCustomer", 0.0);
            }

            // Top customers by order count
            Map<UUID, Long> customerOrderCounts = orders.stream()
                    .filter(o -> o.getUser() != null)
                    .collect(Collectors.groupingBy(
                            order -> order.getUser().getId(),
                            Collectors.counting()));

            List<Map<String, Object>> topCustomers = customerOrderCounts.entrySet().stream()
                    .sorted(Map.Entry.<UUID, Long>comparingByValue().reversed())
                    .limit(5)
                    .map(entry -> {
                        Map<String, Object> customer = new HashMap<>();
                        customer.put("customerId", entry.getKey());
                        customer.put("orderCount", entry.getValue());
                        return customer;
                    })
                    .collect(Collectors.toList());

            stats.put("topCustomers", topCustomers);

            return stats;
        } catch (Exception e) {
            log.error("Error getting customer order stats: {}", e.getMessage(), e);
            return new HashMap<>();
        }
    }

    @Override
    public Map<String, Object> getCustomerOrderStats(UUID shopId) {
        try {
            Map<String, Object> stats = new HashMap<>();

            // Total customers for this shop
            long totalCustomers = shopOrderRepository.countDistinctCustomersByShopId(shopId);
            stats.put("totalCustomers", totalCustomers);

            // Fetch all shop orders for this shop
            List<com.ecommerce.entity.ShopOrder> orders = shopOrderRepository.findByShopId(shopId);

            // Average orders per customer
            if (totalCustomers > 0) {
                double avgOrdersPerCustomer = (double) orders.size() / totalCustomers;
                stats.put("averageOrdersPerCustomer", avgOrdersPerCustomer);
            } else {
                stats.put("averageOrdersPerCustomer", 0.0);
            }

            // Top customers by order count for this shop
            Map<UUID, Long> customerOrderCounts = orders.stream()
                    .filter(so -> so.getOrder().getUser() != null)
                    .collect(Collectors.groupingBy(
                            so -> so.getOrder().getUser().getId(),
                            Collectors.counting()));

            List<Map<String, Object>> topCustomers = customerOrderCounts.entrySet().stream()
                    .sorted(Map.Entry.<UUID, Long>comparingByValue().reversed())
                    .limit(5)
                    .map(entry -> {
                        Map<String, Object> customer = new HashMap<>();
                        customer.put("customerId", entry.getKey());
                        customer.put("orderCount", entry.getValue());
                        return customer;
                    })
                    .collect(Collectors.toList());

            stats.put("topCustomers", topCustomers);

            return stats;
        } catch (Exception e) {
            log.error("Error getting customer order stats for shop {}: {}", shopId, e.getMessage(), e);
            return new HashMap<>();
        }
    }

    @Override
    public Map<String, Object> getDeliveryPerformanceMetrics() {
        try {
            Map<String, Object> metrics = new HashMap<>();

            List<Order> orders = orderRepository.findAll();

            // Delivery success rate
            long deliveredOrders = orders.stream()
                    .filter(order -> "DELIVERED".equals(order.getStatus()))
                    .count();

            long totalCompletedOrders = orders.stream()
                    .filter(order -> "DELIVERED".equals(order.getStatus()) || "CANCELLED".equals(order.getStatus()))
                    .count();

            double deliverySuccessRate = totalCompletedOrders > 0
                    ? (double) deliveredOrders / totalCompletedOrders * 100
                    : 0.0;

            metrics.put("deliverySuccessRate", deliverySuccessRate);
            metrics.put("totalDelivered", deliveredOrders);
            metrics.put("totalCompleted", totalCompletedOrders);

            // Average delivery time (if delivery date is available)
            // Simplified: using difference between created and updated (if delivered)
            List<Order> deliveredOrdersList = orders.stream()
                    .filter(order -> "DELIVERED".equals(order.getStatus()))
                    .collect(Collectors.toList());

            if (!deliveredOrdersList.isEmpty()) {
                double avgDeliveryTime = deliveredOrdersList.stream()
                        .mapToDouble(order -> {
                            if (order.getCreatedAt() != null && order.getUpdatedAt() != null) {
                                return java.time.Duration.between(order.getCreatedAt(), order.getUpdatedAt()).toHours();
                            }
                            return 0.0;
                        })
                        .average()
                        .orElse(0.0);

                metrics.put("averageDeliveryTimeHours", avgDeliveryTime);
            } else {
                metrics.put("averageDeliveryTimeHours", 0.0);
            }

            return metrics;
        } catch (Exception e) {
            log.error("Error getting delivery performance metrics: {}", e.getMessage(), e);
            return new HashMap<>();
        }
    }

    @Override
    public Map<String, Object> getDeliveryPerformanceMetrics(UUID shopId) {
        try {
            Map<String, Object> metrics = new HashMap<>();

            List<com.ecommerce.entity.ShopOrder> orders = shopOrderRepository.findByShopId(shopId);

            // Delivery success rate
            long deliveredOrders = orders.stream()
                    .filter(so -> com.ecommerce.entity.ShopOrder.ShopOrderStatus.DELIVERED.equals(so.getStatus()))
                    .count();

            long totalCompletedOrders = orders.stream()
                    .filter(so -> com.ecommerce.entity.ShopOrder.ShopOrderStatus.DELIVERED.equals(so.getStatus())
                            || com.ecommerce.entity.ShopOrder.ShopOrderStatus.CANCELLED.equals(so.getStatus()))
                    .count();

            double deliverySuccessRate = totalCompletedOrders > 0
                    ? (double) deliveredOrders / totalCompletedOrders * 100
                    : 0.0;

            metrics.put("deliverySuccessRate", deliverySuccessRate);
            metrics.put("totalDelivered", deliveredOrders);
            metrics.put("totalCompleted", totalCompletedOrders);

            // Average delivery time
            List<com.ecommerce.entity.ShopOrder> deliveredOrdersList = orders.stream()
                    .filter(so -> com.ecommerce.entity.ShopOrder.ShopOrderStatus.DELIVERED.equals(so.getStatus()))
                    .collect(Collectors.toList());

            if (!deliveredOrdersList.isEmpty()) {
                double avgDeliveryTime = deliveredOrdersList.stream()
                        .mapToDouble(so -> {
                            if (so.getCreatedAt() != null && so.getUpdatedAt() != null) {
                                return java.time.Duration.between(so.getCreatedAt(), so.getUpdatedAt()).toHours();
                            }
                            return 0.0;
                        })
                        .average()
                        .orElse(0.0);

                metrics.put("averageDeliveryTimeHours", avgDeliveryTime);
            } else {
                metrics.put("averageDeliveryTimeHours", 0.0);
            }

            return metrics;
        } catch (Exception e) {
            log.error("Error getting delivery performance metrics for shop {}: {}", shopId, e.getMessage(), e);
            return new HashMap<>();
        }
    }

    @Override
    public List<Map<String, Object>> getTopSellingProducts(int limit) {
        try {
            List<Order> orders = orderRepository.findAll().stream()
                    .filter(order -> "DELIVERED".equals(order.getStatus()))
                    .collect(Collectors.toList());

            // Count product sales
            Map<UUID, Integer> productSales = new HashMap<>();

            for (Order order : orders) {
                for (OrderItem item : order.getAllItems()) {
                    if (item.getEffectiveProduct() != null) {
                        UUID productId = item.getEffectiveProduct().getProductId();
                        productSales.merge(productId, item.getQuantity(), Integer::sum);
                    }
                }
            }

            // Get top selling products
            return productSales.entrySet().stream()
                    .sorted(Map.Entry.<UUID, Integer>comparingByValue().reversed())
                    .limit(limit)
                    .map(entry -> {
                        Map<String, Object> product = new HashMap<>();
                        product.put("productId", entry.getKey());
                        product.put("totalSold", entry.getValue());

                        // Get product details
                        Optional<Product> productOpt = productRepository.findById(entry.getKey());
                        if (productOpt.isPresent()) {
                            Product p = productOpt.get();
                            product.put("productName", p.getProductName());
                            product.put("productSlug", p.getSlug());
                        }

                        return product;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error getting top selling products: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    @Override
    public List<Map<String, Object>> getTopSellingProducts(int limit, UUID shopId) {
        try {
            List<com.ecommerce.entity.ShopOrder> orders = shopOrderRepository.findByShopId(shopId).stream()
                    .filter(so -> com.ecommerce.entity.ShopOrder.ShopOrderStatus.DELIVERED.equals(so.getStatus()))
                    .collect(Collectors.toList());

            // Count product sales
            Map<UUID, Integer> productSales = new HashMap<>();

            for (com.ecommerce.entity.ShopOrder so : orders) {
                for (OrderItem item : so.getItems()) {
                    if (item.getEffectiveProduct() != null) {
                        UUID productId = item.getEffectiveProduct().getProductId();
                        productSales.merge(productId, item.getQuantity(), Integer::sum);
                    }
                }
            }

            // Get top selling products
            return productSales.entrySet().stream()
                    .sorted(Map.Entry.<UUID, Integer>comparingByValue().reversed())
                    .limit(limit)
                    .map(entry -> {
                        Map<String, Object> product = new HashMap<>();
                        product.put("productId", entry.getKey());
                        product.put("totalSold", entry.getValue());

                        // Get product details
                        Optional<Product> productOpt = productRepository.findById(entry.getKey());
                        if (productOpt.isPresent()) {
                            Product p = productOpt.get();
                            product.put("productName", p.getProductName());
                            product.put("productSlug", p.getSlug());
                        }

                        return product;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error getting top selling products for shop {}: {}", shopId, e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    @Override
    public List<Map<String, Object>> getRevenueTrend(int days) {
        try {
            List<Map<String, Object>> trend = new ArrayList<>();
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusDays(days - 1);

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
                LocalDateTime startOfDay = date.atStartOfDay();
                LocalDateTime endOfDay = date.atTime(23, 59, 59);

                List<Order> dayOrders = orderRepository.findAllBetween(startOfDay, endOfDay).stream()
                        .filter(order -> "DELIVERED".equals(order.getStatus()))
                        .collect(Collectors.toList());

                double dayRevenue = dayOrders.stream()
                        .mapToDouble(order -> order.getTotalAmount().doubleValue())
                        .sum();

                Map<String, Object> dayData = new HashMap<>();
                dayData.put("date", date.format(formatter));
                dayData.put("revenue", dayRevenue);
                dayData.put("orderCount", dayOrders.size());

                trend.add(dayData);
            }

            return trend;
        } catch (Exception e) {
            log.error("Error getting revenue trend: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    @Override
    public List<Map<String, Object>> getRevenueTrend(int days, UUID shopId) {
        try {
            List<Map<String, Object>> trend = new ArrayList<>();
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusDays(days - 1);

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
                LocalDateTime startOfDay = date.atStartOfDay();
                LocalDateTime endOfDay = date.atTime(23, 59, 59);

                List<com.ecommerce.entity.ShopOrder> dayOrders = shopOrderRepository
                        .findByShopIdAndCreatedAtBetween(shopId, startOfDay, endOfDay).stream()
                        .filter(so -> com.ecommerce.entity.ShopOrder.ShopOrderStatus.DELIVERED.equals(so.getStatus()))
                        .collect(Collectors.toList());

                double dayRevenue = dayOrders.stream()
                        .mapToDouble(so -> so.getTotalAmount().doubleValue())
                        .sum();

                Map<String, Object> dayData = new HashMap<>();
                dayData.put("date", date.format(formatter));
                dayData.put("revenue", dayRevenue);
                dayData.put("orderCount", dayOrders.size());

                trend.add(dayData);
            }

            return trend;
        } catch (Exception e) {
            log.error("Error getting revenue trend for shop {}: {}", shopId, e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    @Override
    public Double getRevenueForPeriod(LocalDateTime startDate, LocalDateTime endDate) {
        try {
            List<Order> orders = orderRepository.findAllBetween(startDate, endDate).stream()
                    .filter(order -> "DELIVERED".equals(order.getStatus()))
                    .collect(Collectors.toList());

            return orders.stream()
                    .mapToDouble(order -> order.getTotalAmount().doubleValue())
                    .sum();
        } catch (Exception e) {
            log.error("Error getting revenue for period: {}", e.getMessage(), e);
            return 0.0;
        }
    }

    @Override
    public Double getRevenueForPeriod(LocalDateTime startDate, LocalDateTime endDate, UUID shopId) {
        try {
            List<com.ecommerce.entity.ShopOrder> orders = shopOrderRepository
                    .findByShopIdAndCreatedAtBetween(shopId, startDate, endDate).stream()
                    .filter(so -> com.ecommerce.entity.ShopOrder.ShopOrderStatus.DELIVERED.equals(so.getStatus()))
                    .collect(Collectors.toList());

            return orders.stream()
                    .mapToDouble(so -> so.getTotalAmount().doubleValue())
                    .sum();
        } catch (Exception e) {
            log.error("Error getting revenue for period for shop {}: {}", shopId, e.getMessage(), e);
            return 0.0;
        }
    }

    @Override
    public List<Map<String, Object>> getOrdersByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        try {
            List<Order> orders = orderRepository.findAllBetween(startDate, endDate);

            return orders.stream()
                    .map(order -> {
                        Map<String, Object> orderData = new HashMap<>();
                        orderData.put("orderId", order.getId());
                        orderData.put("status", order.getStatus());
                        orderData.put("totalAmount", order.getTotalAmount());
                        orderData.put("createdAt", order.getCreatedAt());
                        orderData.put("customerId", order.getUser() != null ? order.getUser().getId() : null);
                        orderData.put("customerName",
                                order.getUser() != null
                                        ? order.getUser().getFirstName() + " " + order.getUser().getLastName()
                                        : "Guest");
                        return orderData;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error getting orders by date range: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    @Override
    public List<Map<String, Object>> getOrdersByDateRange(LocalDateTime startDate, LocalDateTime endDate, UUID shopId) {
        try {
            List<com.ecommerce.entity.ShopOrder> orders = shopOrderRepository
                    .findByShopIdAndCreatedAtBetween(shopId, startDate, endDate);

            return orders.stream()
                    .map(so -> {
                        Map<String, Object> orderData = new HashMap<>();
                        orderData.put("orderId", so.getId());
                        orderData.put("status", so.getStatus().name());
                        orderData.put("totalAmount", so.getTotalAmount());
                        orderData.put("createdAt", so.getCreatedAt());
                        orderData.put("customerId",
                                so.getOrder().getUser() != null ? so.getOrder().getUser().getId() : null);
                        orderData.put("customerName",
                                so.getOrder().getUser() != null ? so.getOrder().getUser().getFirstName() + " "
                                        + so.getOrder().getUser().getLastName() : "Guest");
                        return orderData;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error getting orders by date range for shop {}: {}", shopId, e.getMessage(), e);
            return new ArrayList<>();
        }
    }
}
