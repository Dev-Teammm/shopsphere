package com.ecommerce.entity;

import com.ecommerce.enums.ShopCapability;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tracks capability transition requests for shops.
 * When a shop wants to change capability but has pending operations,
 * a transition request is created. During transition, shop maintains
 * BOTH old and new capabilities until all operations complete.
 */
@Entity
@Table(name = "capability_transitions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CapabilityTransition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transition_id")
    private Long id;

    @Column(name = "shop_id", nullable = false)
    private UUID shopId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", insertable = false, updatable = false)
    private Shop shop;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_capability", nullable = false)
    private ShopCapability currentCapability;

    @Enumerated(EnumType.STRING)
    @Column(name = "requested_capability", nullable = false)
    private ShopCapability requestedCapability;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TransitionStatus status = TransitionStatus.PENDING;

    @Column(name = "pending_orders_count")
    private Integer pendingOrdersCount = 0;

    @Column(name = "pending_returns_count")
    private Integer pendingReturnsCount = 0;

    @Column(name = "pending_appeals_count")
    private Integer pendingAppealsCount = 0;

    @Column(name = "pending_deliveries_count")
    private Integer pendingDeliveriesCount = 0;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @PrePersist
    protected void onCreate() {
        if (requestedAt == null) {
            requestedAt = LocalDateTime.now();
        }
    }

    public enum TransitionStatus {
        PENDING,        // Transition requested, waiting for operations to complete
        IN_PROGRESS,    // Operations completing, transition in progress
        COMPLETED,      // All operations complete, capability changed
        CANCELLED       // Transition cancelled by shop owner
    }

    /**
     * Check if transition is active (pending or in progress)
     */
    public boolean isActive() {
        return status == TransitionStatus.PENDING || status == TransitionStatus.IN_PROGRESS;
    }

    /**
     * Check if transition requires delivery operations to complete
     */
    public boolean requiresDeliveryCompletion() {
        // If moving FROM a capability that supports delivery TO one that doesn't
        return (currentCapability == ShopCapability.FULL_ECOMMERCE || currentCapability == ShopCapability.HYBRID)
            && (requestedCapability == ShopCapability.PICKUP_ORDERS || requestedCapability == ShopCapability.VISUALIZATION_ONLY);
    }

    /**
     * Mark transition as completed
     */
    public void complete() {
        this.status = TransitionStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    /**
     * Cancel the transition
     */
    public void cancel(String notes) {
        this.status = TransitionStatus.CANCELLED;
        this.cancelledAt = LocalDateTime.now();
        if (notes != null) {
            this.notes = notes;
        }
    }
}
