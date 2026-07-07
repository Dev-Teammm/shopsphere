package com.ecommerce.service.impl;

import com.ecommerce.Exception.CustomException;
import com.ecommerce.dto.CapabilityTransitionDTO;
import com.ecommerce.entity.*;
import com.ecommerce.enums.ShopCapability;
import com.ecommerce.repository.*;
import com.ecommerce.service.CapabilityTransitionService;
import org.springframework.scheduling.annotation.Scheduled;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CapabilityTransitionServiceImpl implements CapabilityTransitionService {

    private final CapabilityTransitionRepository transitionRepository;
    private final ShopRepository shopRepository;
    private final ShopOrderRepository shopOrderRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final ReturnAppealRepository returnAppealRepository;
    private final DeliveryAssignmentRepository deliveryAssignmentRepository;

    @Override
    @Transactional
    public CapabilityTransitionDTO requestCapabilityTransition(UUID shopId, ShopCapability newCapability) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with id: " + shopId));

        ShopCapability currentCapability = shop.getPrimaryCapability();
        
        if (currentCapability == null) {
            throw new CustomException("Shop capability is not set. Please set your shop capability first.");
        }

        if (currentCapability.equals(newCapability)) {
            throw new CustomException("Shop already has capability: " + newCapability);
        }

        // Check if there's already an active transition
        Optional<CapabilityTransition> existingTransition = transitionRepository.findActiveTransitionByShopId(shopId);
        if (existingTransition.isPresent()) {
            CapabilityTransition transition = existingTransition.get();
            if (transition.getRequestedCapability().equals(newCapability)) {
                return convertToDTO(transition);
            }
            throw new CustomException("Shop already has an active transition to " + 
                transition.getRequestedCapability() + ". Please complete or cancel it first.");
        }

        // Check if transition requires completion of pending operations
        PendingOperationsCount pendingOps = countPendingOperations(shopId, currentCapability, newCapability);
        
        // If transitioning to a less capable type (removing delivery), check for pending operations
        boolean requiresTransition = requiresTransition(currentCapability, newCapability);
        
        if (requiresTransition && pendingOps.getTotal() > 0) {
            // Create transition record
            CapabilityTransition transition = new CapabilityTransition();
            transition.setShopId(shopId);
            transition.setCurrentCapability(currentCapability);
            transition.setRequestedCapability(newCapability);
            transition.setStatus(CapabilityTransition.TransitionStatus.PENDING);
            transition.setPendingOrdersCount(pendingOps.getPendingOrders());
            transition.setPendingReturnsCount(pendingOps.getPendingReturns());
            transition.setPendingAppealsCount(pendingOps.getPendingAppeals());
            transition.setPendingDeliveriesCount(pendingOps.getPendingDeliveries());
            transition.setRequestedAt(LocalDateTime.now());
            
            // Update shop capabilities set to include BOTH during transition
            shop.getCapabilities().clear();
            shop.getCapabilities().add(currentCapability); // Keep old capability
            shop.getCapabilities().add(newCapability);     // Add new capability
            shop.setPrimaryCapability(newCapability);      // Set new as primary
            
            transition = transitionRepository.save(transition);
            shopRepository.save(shop);
            
            log.info("Created capability transition for shop {}: {} -> {} (pending operations: {})", 
                shopId, currentCapability, newCapability, pendingOps.getTotal());
            
            return convertToDTO(transition);
        } else {
            // No pending operations, change immediately
            shop.setPrimaryCapability(newCapability);
            shop.getCapabilities().clear();
            shop.getCapabilities().add(newCapability);
            shopRepository.save(shop);
            
            log.info("Changed shop {} capability immediately: {} -> {}", shopId, currentCapability, newCapability);
            return null; // No transition needed
        }
    }

    @Override
    @Transactional(readOnly = true)
    public CapabilityTransitionDTO getActiveTransition(UUID shopId) {
        return transitionRepository.findActiveTransitionByShopId(shopId)
                .map(this::convertToDTO)
                .orElse(null);
    }

    @Override
    @Transactional
    public void cancelTransition(UUID shopId, String reason) {
        CapabilityTransition transition = transitionRepository.findActiveTransitionByShopId(shopId)
                .orElseThrow(() -> new CustomException("No active transition found for shop"));

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found"));

        // Revert to original capability
        shop.setPrimaryCapability(transition.getCurrentCapability());
        shop.getCapabilities().clear();
        shop.getCapabilities().add(transition.getCurrentCapability());
        
        transition.cancel(reason);
        transitionRepository.save(transition);
        shopRepository.save(shop);
        
        log.info("Cancelled capability transition for shop {}: {}", shopId, reason);
    }

    @Override
    @Transactional
    public void checkAndUpdateTransitions() {
        List<CapabilityTransition> activeTransitions = transitionRepository.findAllActiveTransitions();
        
        for (CapabilityTransition transition : activeTransitions) {
            PendingOperationsCount pendingOps = countPendingOperations(
                transition.getShopId(), 
                transition.getCurrentCapability(), 
                transition.getRequestedCapability()
            );
            
            // Update counts
            transition.setPendingOrdersCount(pendingOps.getPendingOrders());
            transition.setPendingReturnsCount(pendingOps.getPendingReturns());
            transition.setPendingAppealsCount(pendingOps.getPendingAppeals());
            transition.setPendingDeliveriesCount(pendingOps.getPendingDeliveries());
            
            if (pendingOps.getTotal() == 0) {
                // All operations complete, finalize transition
                Shop shop = shopRepository.findById(transition.getShopId())
                        .orElseThrow(() -> new EntityNotFoundException("Shop not found"));
                
                // Remove old capability, keep only new one
                shop.getCapabilities().clear();
                shop.getCapabilities().add(transition.getRequestedCapability());
                // Primary capability already set to new one during transition start
                
                transition.complete();
                transitionRepository.save(transition);
                shopRepository.save(shop);
                
                log.info("Completed capability transition for shop {}: {} -> {}", 
                    transition.getShopId(), transition.getCurrentCapability(), transition.getRequestedCapability());
            } else {
                // Update status to IN_PROGRESS if it was PENDING
                if (transition.getStatus() == CapabilityTransition.TransitionStatus.PENDING) {
                    transition.setStatus(CapabilityTransition.TransitionStatus.IN_PROGRESS);
                }
                transitionRepository.save(transition);
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PendingOperationsCount countPendingOperations(UUID shopId, ShopCapability oldCapability, ShopCapability newCapability) {
        boolean requiresDeliveryCompletion = requiresTransition(oldCapability, newCapability);
        
        int pendingOrders = 0;
        int pendingReturns = 0;
        int pendingAppeals = 0;
        int pendingDeliveries = 0;
        
        if (requiresDeliveryCompletion) {
            // Count shop orders that require delivery and are not completed
            pendingOrders = (int) shopOrderRepository.findByShopId(shopId).stream()
                    .filter(so -> {
                        ShopOrder.ShopOrderStatus status = so.getStatus();
                        // Count orders that are pending delivery (not pickup-only)
                        return (status == ShopOrder.ShopOrderStatus.PENDING || 
                                status == ShopOrder.ShopOrderStatus.PROCESSING ||
                                status == ShopOrder.ShopOrderStatus.SHIPPED) &&
                               // Only count if shop originally supported delivery
                               (oldCapability == ShopCapability.FULL_ECOMMERCE || 
                                oldCapability == ShopCapability.HYBRID);
                    })
                    .count();
            
            // Count return requests that require delivery agent
            // Get all shop orders first, then get their return requests
            List<ShopOrder> shopOrders = shopOrderRepository.findByShopId(shopId);
            pendingReturns = 0;
            for (ShopOrder shopOrder : shopOrders) {
                // Get return requests for this shop order using repository method
                List<ReturnRequest> returns = returnRequestRepository.findByShopOrderId(shopOrder.getId());
                
                for (ReturnRequest rr : returns) {
                    ReturnRequest.ReturnStatus status = rr.getStatus();
                    ReturnRequest.DeliveryStatus deliveryStatus = rr.getDeliveryStatus();
                    if ((status == ReturnRequest.ReturnStatus.PENDING || 
                         status == ReturnRequest.ReturnStatus.APPROVED) &&
                        (deliveryStatus == ReturnRequest.DeliveryStatus.ASSIGNED ||
                         deliveryStatus == ReturnRequest.DeliveryStatus.PICKUP_SCHEDULED ||
                         deliveryStatus == ReturnRequest.DeliveryStatus.PICKUP_IN_PROGRESS)) {
                        pendingReturns++;
                    }
                }
            }
            
            // Count pending appeals related to returns that need delivery
            // Use the repository method that filters by shop ID
            List<ReturnAppeal> pendingAppealsList = returnAppealRepository.findByStatus(ReturnAppeal.AppealStatus.PENDING);
            pendingAppeals = 0;
            for (ReturnAppeal appeal : pendingAppealsList) {
                ReturnRequest returnRequest = appeal.getReturnRequest();
                if (returnRequest != null && returnRequest.getShopOrder() != null) {
                    UUID appealShopId = returnRequest.getShopOrder().getShop().getShopId();
                    if (appealShopId.equals(shopId)) {
                        ReturnRequest.DeliveryStatus deliveryStatus = returnRequest.getDeliveryStatus();
                        if (deliveryStatus == ReturnRequest.DeliveryStatus.ASSIGNED ||
                            deliveryStatus == ReturnRequest.DeliveryStatus.PICKUP_SCHEDULED ||
                            deliveryStatus == ReturnRequest.DeliveryStatus.PICKUP_IN_PROGRESS) {
                            pendingAppeals++;
                        }
                    }
                }
            }
            
            // Count active delivery assignments for this shop's orders
            List<ShopOrder> allShopOrders = shopOrderRepository.findByShopId(shopId);
            pendingDeliveries = 0;
            for (ShopOrder so : allShopOrders) {
                ShopOrder.ShopOrderStatus status = so.getStatus();
                if (status == ShopOrder.ShopOrderStatus.SHIPPED ||
                    status == ShopOrder.ShopOrderStatus.PROCESSING) {
                    // Check if order has active delivery assignment
                    List<DeliveryAssignment> assignments = deliveryAssignmentRepository.findByOrderOrderId(so.getOrder().getOrderId());
                    if (!assignments.isEmpty()) {
                        boolean hasActiveAssignment = assignments.stream()
                                .anyMatch(da -> da.getStatus() != com.ecommerce.Enum.DeliveryStatus.CANCELED);
                        if (hasActiveAssignment) {
                            pendingDeliveries++;
                        }
                    }
                }
            }
        }
        
        return new PendingOperationsCount(pendingOrders, pendingReturns, pendingAppeals, pendingDeliveries);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canAcceptNewOrderType(UUID shopId, boolean requiresDelivery) {
        Optional<CapabilityTransition> transitionOpt = transitionRepository.findActiveTransitionByShopId(shopId);
        
        if (transitionOpt.isEmpty()) {
            // No transition, check shop's current capability
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow(() -> new EntityNotFoundException("Shop not found"));
            if (requiresDelivery) {
                return shop.supportsDelivery();
            } else {
                return shop.supportsPickupOrders();
            }
        }
        
        CapabilityTransition transition = transitionOpt.get();
        
        // During transition, check if new capability supports this order type
        if (requiresDelivery) {
            // Block new delivery orders if transitioning away from delivery
            return transition.getRequestedCapability() == ShopCapability.FULL_ECOMMERCE ||
                   transition.getRequestedCapability() == ShopCapability.HYBRID;
        } else {
            // Allow pickup orders if new capability supports it
            return transition.getRequestedCapability() == ShopCapability.PICKUP_ORDERS ||
                   transition.getRequestedCapability() == ShopCapability.HYBRID;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public EffectiveCapabilities getEffectiveCapabilities(UUID shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found"));
        
        Optional<CapabilityTransition> transitionOpt = transitionRepository.findActiveTransitionByShopId(shopId);
        
        if (transitionOpt.isEmpty()) {
            return new EffectiveCapabilities(shop.getPrimaryCapability());
        }
        
        CapabilityTransition transition = transitionOpt.get();
        return new EffectiveCapabilities(
            transition.getRequestedCapability(),  // New capability (primary)
            transition.getCurrentCapability()     // Old capability (during transition)
        );
    }

    /**
     * Scheduled job to check and update transitions (runs every hour)
     */
    @Scheduled(fixedRate = 3600000) // 1 hour in milliseconds
    public void scheduledTransitionCheck() {
        log.info("Running scheduled capability transition check");
        try {
            checkAndUpdateTransitions();
        } catch (Exception e) {
            log.error("Error in scheduled transition check: {}", e.getMessage(), e);
        }
    }

    /**
     * Check if transition requires waiting for operations to complete
     */
    private boolean requiresTransition(ShopCapability oldCapability, ShopCapability newCapability) {
        // Transition requires waiting if moving FROM a more capable type TO a less capable type
        // that removes delivery support
        boolean oldSupportsDelivery = oldCapability == ShopCapability.FULL_ECOMMERCE || 
                                      oldCapability == ShopCapability.HYBRID;
        boolean newSupportsDelivery = newCapability == ShopCapability.FULL_ECOMMERCE || 
                                      newCapability == ShopCapability.HYBRID;
        
        return oldSupportsDelivery && !newSupportsDelivery;
    }

    private CapabilityTransitionDTO convertToDTO(CapabilityTransition transition) {
        return CapabilityTransitionDTO.builder()
                .id(transition.getId())
                .shopId(transition.getShopId())
                .currentCapability(transition.getCurrentCapability())
                .requestedCapability(transition.getRequestedCapability())
                .status(transition.getStatus())
                .pendingOrdersCount(transition.getPendingOrdersCount())
                .pendingReturnsCount(transition.getPendingReturnsCount())
                .pendingAppealsCount(transition.getPendingAppealsCount())
                .pendingDeliveriesCount(transition.getPendingDeliveriesCount())
                .requestedAt(transition.getRequestedAt())
                .completedAt(transition.getCompletedAt())
                .cancelledAt(transition.getCancelledAt())
                .notes(transition.getNotes())
                .build();
    }
}
