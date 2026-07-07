package com.ecommerce.controller;

import com.ecommerce.Enum.UserRole;
import com.ecommerce.dto.ShopMemberDTO;
import com.ecommerce.service.ShopMemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shops")
@RequiredArgsConstructor
@Tag(name = "Shop Members", description = "Endpoints for managing shop members (employees and delivery agents)")
public class ShopMemberController {

    private final ShopMemberService shopMemberService;

    @GetMapping("/{shopId}/members")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Get shop members", description = "Get all employees and delivery agents for a shop with filtering and pagination")
    public ResponseEntity<?> getShopMembers(
            @PathVariable UUID shopId,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String role, // EMPLOYEE or DELIVERY_AGENT
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime joinDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime joinDateTo,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestParam(required = false, defaultValue = "DESC") String sortDirection
    ) {
        try {
            Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
            Pageable pageable = PageRequest.of(page, size, sort);
            
            Page<ShopMemberDTO> members = shopMemberService.getShopMembers(
                    shopId, email, username, role, joinDateFrom, joinDateTo, pageable
            );
            
            return ResponseEntity.ok(members);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{shopId}/members/{memberId}/role")
    @PreAuthorize("hasRole('VENDOR')")
    @Operation(summary = "Change member role", description = "Change a member's role between EMPLOYEE and DELIVERY_AGENT (Vendor only)")
    public ResponseEntity<?> changeMemberRole(
            @PathVariable UUID shopId,
            @PathVariable UUID memberId,
            @RequestParam String newRole
    ) {
        try {
            UserRole role;
            try {
                role = UserRole.valueOf(newRole.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body("Invalid role. Must be EMPLOYEE or DELIVERY_AGENT");
            }

            if (role != UserRole.EMPLOYEE && role != UserRole.DELIVERY_AGENT) {
                return ResponseEntity.badRequest().body("Role must be either EMPLOYEE or DELIVERY_AGENT");
            }

            ShopMemberDTO updatedMember = shopMemberService.changeMemberRole(shopId, memberId, role);
            return ResponseEntity.ok(updatedMember);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{shopId}/members/{memberId}")
    @PreAuthorize("hasRole('VENDOR')")
    @Operation(summary = "Remove member from shop", description = "Remove a member from the shop. Sets role to CUSTOMER and removes shop association. Historical actions are preserved. (Vendor only)")
    public ResponseEntity<?> removeMemberFromShop(
            @PathVariable UUID shopId,
            @PathVariable UUID memberId
    ) {
        try {
            shopMemberService.removeMemberFromShop(shopId, memberId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
