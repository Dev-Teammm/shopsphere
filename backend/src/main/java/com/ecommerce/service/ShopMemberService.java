package com.ecommerce.service;

import com.ecommerce.Enum.UserRole;
import com.ecommerce.dto.ShopMemberDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.UUID;

public interface ShopMemberService {
    
    /**
     * Get all shop members (employees and delivery agents) with filtering
     * 
     * @param shopId Shop ID
     * @param email Filter by email (optional)
     * @param username Filter by username/name (optional)
     * @param role Filter by role - EMPLOYEE or DELIVERY_AGENT (optional)
     * @param joinDateFrom Filter by join date from (optional)
     * @param joinDateTo Filter by join date to (optional)
     * @param pageable Pagination information
     * @return Page of shop members
     */
    Page<ShopMemberDTO> getShopMembers(
            UUID shopId,
            String email,
            String username,
            String role,
            LocalDateTime joinDateFrom,
            LocalDateTime joinDateTo,
            Pageable pageable
    );
    
    /**
     * Change member role within the shop (EMPLOYEE <-> DELIVERY_AGENT)
     * 
     * @param shopId Shop ID
     * @param memberId Member (user) ID
     * @param newRole New role (EMPLOYEE or DELIVERY_AGENT)
     * @return Updated shop member DTO
     */
    ShopMemberDTO changeMemberRole(UUID shopId, UUID memberId, UserRole newRole);
    
    /**
     * Remove member from shop - sets role to CUSTOMER and removes shop association
     * The member's historical actions remain available for the shop
     * 
     * @param shopId Shop ID
     * @param memberId Member (user) ID
     */
    void removeMemberFromShop(UUID shopId, UUID memberId);
}
