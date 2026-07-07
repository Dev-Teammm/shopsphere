package com.ecommerce.service.impl;

import com.ecommerce.Enum.UserRole;
import com.ecommerce.dto.ShopMemberDTO;
import com.ecommerce.entity.Shop;
import com.ecommerce.entity.User;
import com.ecommerce.repository.ShopRepository;
import com.ecommerce.repository.UserRepository;
import com.ecommerce.service.ShopMemberService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class ShopMemberServiceImpl implements ShopMemberService {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<ShopMemberDTO> getShopMembers(
            UUID shopId,
            String email,
            String username,
            String role,
            LocalDateTime joinDateFrom,
            LocalDateTime joinDateTo,
            Pageable pageable
    ) {
        log.info("Getting shop members for shop: {} with filters - email: {}, username: {}, role: {}, joinDateFrom: {}, joinDateTo: {}",
                shopId, email, username, role, joinDateFrom, joinDateTo);

        // Validate shop exists
        if (!shopRepository.existsById(shopId)) {
            throw new EntityNotFoundException("Shop not found with ID: " + shopId);
        }

        // Build specification for filtering
        Specification<User> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter by shop
            predicates.add(criteriaBuilder.equal(root.get("shop").get("shopId"), shopId));

            // Filter by role (EMPLOYEE or DELIVERY_AGENT only)
            Predicate employeeRole = criteriaBuilder.equal(root.get("role"), UserRole.EMPLOYEE);
            Predicate deliveryAgentRole = criteriaBuilder.equal(root.get("role"), UserRole.DELIVERY_AGENT);
            Predicate rolePredicate = criteriaBuilder.or(employeeRole, deliveryAgentRole);
            predicates.add(rolePredicate);

            // If specific role filter is provided
            if (role != null && !role.trim().isEmpty()) {
                try {
                    UserRole userRole = UserRole.valueOf(role.toUpperCase());
                    if (userRole == UserRole.EMPLOYEE || userRole == UserRole.DELIVERY_AGENT) {
                        predicates.add(criteriaBuilder.equal(root.get("role"), userRole));
                    }
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid role filter: {}", role);
                }
            }

            // Filter by email
            if (email != null && !email.trim().isEmpty()) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("userEmail")),
                        "%" + email.toLowerCase() + "%"
                ));
            }

            // Filter by username (first name or last name)
            if (username != null && !username.trim().isEmpty()) {
                String searchTerm = "%" + username.toLowerCase() + "%";
                Predicate firstNamePredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("firstName")), searchTerm);
                Predicate lastNamePredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("lastName")), searchTerm);
                predicates.add(criteriaBuilder.or(firstNamePredicate, lastNamePredicate));
            }

            // Filter by join date range
            if (joinDateFrom != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), joinDateFrom));
            }
            if (joinDateTo != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), joinDateTo));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> users = userRepository.findAll(spec, pageable);
        
        return users.map(this::convertToDTO);
    }

    @Override
    @Transactional
    public ShopMemberDTO changeMemberRole(UUID shopId, UUID memberId, UserRole newRole) {
        log.info("Changing role for member {} in shop {} to {}", memberId, shopId, newRole);

        // Validate shop exists
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with ID: " + shopId));

        // Validate member exists and is associated with the shop
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + memberId));

        // Verify member is associated with the correct shop
        if (member.getShop() == null || !member.getShop().getShopId().equals(shopId)) {
            throw new IllegalArgumentException("User is not associated with the specified shop");
        }

        // Verify current role is EMPLOYEE or DELIVERY_AGENT
        if (member.getRole() != UserRole.EMPLOYEE && member.getRole() != UserRole.DELIVERY_AGENT) {
            throw new IllegalArgumentException("Only EMPLOYEE or DELIVERY_AGENT roles can be changed within a shop");
        }

        // Verify new role is valid (must be EMPLOYEE or DELIVERY_AGENT)
        if (newRole != UserRole.EMPLOYEE && newRole != UserRole.DELIVERY_AGENT) {
            throw new IllegalArgumentException("New role must be either EMPLOYEE or DELIVERY_AGENT");
        }

        // Change role
        member.setRole(newRole);
        User savedMember = userRepository.save(member);

        log.info("Successfully changed role for member {} in shop {} to {}", memberId, shopId, newRole);
        return convertToDTO(savedMember);
    }

    @Override
    @Transactional
    public void removeMemberFromShop(UUID shopId, UUID memberId) {
        log.info("Removing member {} from shop {}", memberId, shopId);

        // Validate shop exists
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with ID: " + shopId));

        // Validate member exists
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + memberId));

        // Verify member is associated with the correct shop
        if (member.getShop() == null || !member.getShop().getShopId().equals(shopId)) {
            throw new IllegalArgumentException("User is not associated with the specified shop");
        }

        // Verify current role is EMPLOYEE or DELIVERY_AGENT
        if (member.getRole() != UserRole.EMPLOYEE && member.getRole() != UserRole.DELIVERY_AGENT) {
            throw new IllegalArgumentException("Only EMPLOYEE or DELIVERY_AGENT can be removed from a shop");
        }

        // Remove shop association and change role to CUSTOMER
        // Note: Historical actions (orders, etc.) remain linked to the shop through the order/user relationship
        // The user's shop_id is set to null, but their actions remain in the database
        member.setRole(UserRole.CUSTOMER);
        member.setShop(null);
        userRepository.save(member);

        log.info("Successfully removed member {} from shop {}. Role changed to CUSTOMER. Historical actions preserved.", 
                memberId, shopId);
    }

    private ShopMemberDTO convertToDTO(User user) {
        ShopMemberDTO dto = new ShopMemberDTO();
        dto.setId(user.getId());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setUserEmail(user.getUserEmail());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setRole(user.getRole() != null ? user.getRole().name() : null);
        if (user.getShop() != null) {
            dto.setShopId(user.getShop().getShopId());
            dto.setShopName(user.getShop().getName());
        }
        dto.setCreatedAt(user.getCreatedAt());
        dto.setLastLogin(user.getLastLogin());
        dto.setEnabled(user.isEnabled());
        dto.setEmailVerified(user.isEmailVerified());
        dto.setPhoneVerified(user.isPhoneVerified());
        return dto;
    }
}
