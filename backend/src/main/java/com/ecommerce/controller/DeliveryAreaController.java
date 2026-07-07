package com.ecommerce.controller;

import com.ecommerce.Enum.UserRole;
import com.ecommerce.dto.*;
import com.ecommerce.repository.UserRepository;
import com.ecommerce.service.DeliveryAreaService;
import com.ecommerce.service.ShopAuthorizationService;
import com.ecommerce.ServiceImpl.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shops/{shopId}/delivery-areas")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Delivery Areas", description = "Endpoints for managing delivery areas with tree structure")
public class DeliveryAreaController {

    private final DeliveryAreaService deliveryAreaService;
    private final ShopAuthorizationService shopAuthorizationService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE')")
    @Operation(summary = "Create a new delivery area", description = "Create a new delivery area for a shop. Requires warehouse in the same country.")
    public ResponseEntity<?> createDeliveryArea(
            @PathVariable UUID shopId,
            @Valid @RequestBody CreateDeliveryAreaDTO createDTO) {
        try {
            UUID currentUserId = getCurrentUserId();
            UserRole userRole = getCurrentUserRole();

            // Validate shop access
            if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
            }

            DeliveryAreaDTO created = deliveryAreaService.createDeliveryArea(shopId, createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception e) {
            log.error("Error creating delivery area: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{areaId}")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE')")
    @Operation(summary = "Update a delivery area", description = "Update an existing delivery area")
    public ResponseEntity<?> updateDeliveryArea(
            @PathVariable UUID shopId,
            @PathVariable Long areaId,
            @Valid @RequestBody UpdateDeliveryAreaDTO updateDTO) {
        try {
            UUID currentUserId = getCurrentUserId();
            UserRole userRole = getCurrentUserRole();

            // Validate shop access
            if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
            }

            DeliveryAreaDTO updated = deliveryAreaService.updateDeliveryArea(shopId, areaId, updateDTO);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Error updating delivery area: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{areaId}")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE')")
    @Operation(summary = "Delete a delivery area", description = "Delete a delivery area and all its children")
    public ResponseEntity<?> deleteDeliveryArea(
            @PathVariable UUID shopId,
            @PathVariable Long areaId) {
        try {
            UUID currentUserId = getCurrentUserId();
            UserRole userRole = getCurrentUserRole();

            // Validate shop access
            if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
            }

            deliveryAreaService.deleteDeliveryArea(shopId, areaId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting delivery area: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{areaId}")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'ADMIN')")
    @Operation(summary = "Get a delivery area by ID", description = "Get a specific delivery area with its tree structure")
    public ResponseEntity<?> getDeliveryAreaById(
            @PathVariable UUID shopId,
            @PathVariable Long areaId) {
        try {
            UUID currentUserId = getCurrentUserId();
            UserRole userRole = getCurrentUserRole();

            // Validate shop access
            if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
            }

            DeliveryAreaDTO area = deliveryAreaService.getDeliveryAreaById(shopId, areaId);
            return ResponseEntity.ok(area);
        } catch (Exception e) {
            log.error("Error getting delivery area: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'ADMIN')")
    @Operation(summary = "Get delivery areas with search and filters", description = "Get paginated delivery areas with search and filtering")
    public ResponseEntity<?> getDeliveryAreas(
            @PathVariable UUID shopId,
            @RequestParam(required = false) String searchQuery,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long parentId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Boolean rootOnly,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size,
            @RequestParam(required = false, defaultValue = "name") String sortBy,
            @RequestParam(required = false, defaultValue = "ASC") String sortDirection) {
        try {
            UUID currentUserId = getCurrentUserId();
            UserRole userRole = getCurrentUserRole();

            // Validate shop access
            if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
            }

            DeliveryAreaSearchDTO searchDTO = new DeliveryAreaSearchDTO();
            searchDTO.setSearchQuery(searchQuery);
            searchDTO.setCountry(country);
            searchDTO.setWarehouseId(warehouseId);
            searchDTO.setParentId(parentId);
            searchDTO.setIsActive(isActive);
            searchDTO.setRootOnly(rootOnly);

            Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
            Pageable pageable = PageRequest.of(page, size, sort);

            Page<DeliveryAreaDTO> areas = deliveryAreaService.getDeliveryAreas(shopId, searchDTO, pageable);
            return ResponseEntity.ok(areas);
        } catch (Exception e) {
            log.error("Error getting delivery areas: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/public")
    @Operation(summary = "Get delivery areas for a shop (public)", description = "Get paginated delivery areas for a shop with sub-areas. No authentication required.")
    public ResponseEntity<?> getDeliveryAreasPublic(
            @PathVariable UUID shopId,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size,
            @RequestParam(required = false, defaultValue = "name") String sortBy,
            @RequestParam(required = false, defaultValue = "ASC") String sortDirection) {
        try {
            DeliveryAreaSearchDTO searchDTO = new DeliveryAreaSearchDTO();
            searchDTO.setIsActive(true); // Only show active areas for public

            Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
            Pageable pageable = PageRequest.of(page, size, sort);

            // Get paginated areas, then enrich with children
            Page<DeliveryAreaDTO> areasPage = deliveryAreaService.getDeliveryAreas(shopId, searchDTO, pageable);
            
            // Enrich each area with its children
            List<DeliveryAreaDTO> enrichedAreas = areasPage.getContent().stream()
                    .map(area -> {
                        try {
                            // Fetch children for each area
                            List<DeliveryAreaDTO> children = deliveryAreaService.getChildrenAreas(shopId, area.getId());
                            area.setChildren(children);
                            area.setChildrenCount(children.size());
                        } catch (Exception e) {
                            log.warn("Error fetching children for area {}: {}", area.getId(), e.getMessage());
                            area.setChildren(new java.util.ArrayList<>());
                            area.setChildrenCount(0);
                        }
                        return area;
                    })
                    .collect(java.util.stream.Collectors.toList());
            
            // Create new page with enriched content
            Page<DeliveryAreaDTO> enrichedPage = new org.springframework.data.domain.PageImpl<>(
                    enrichedAreas,
                    pageable,
                    areasPage.getTotalElements()
            );
            
            return ResponseEntity.ok(enrichedPage);
        } catch (Exception e) {
            log.error("Error getting delivery areas (public): {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/countries")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'ADMIN')")
    @Operation(summary = "Get countries with delivery areas", description = "Get all countries with warehouses and their delivery areas structure")
    public ResponseEntity<?> getCountriesWithDeliveryAreas(@PathVariable UUID shopId) {
        try {
            UUID currentUserId = getCurrentUserId();
            UserRole userRole = getCurrentUserRole();

            // Validate shop access
            if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
            }

            List<CountryDeliveryAreasDTO> countries = deliveryAreaService.getCountriesWithDeliveryAreas(shopId);
            return ResponseEntity.ok(countries);
        } catch (Exception e) {
            log.error("Error getting countries with delivery areas: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/countries/{country}/tree")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'ADMIN')")
    @Operation(summary = "Get delivery areas tree for a country", description = "Get the complete tree structure of delivery areas for a specific country")
    public ResponseEntity<?> getDeliveryAreasTreeByCountry(
            @PathVariable UUID shopId,
            @PathVariable String country) {
        try {
            UUID currentUserId = getCurrentUserId();
            UserRole userRole = getCurrentUserRole();

            // Validate shop access
            if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
            }

            List<DeliveryAreaDTO> tree = deliveryAreaService.getDeliveryAreasTreeByCountry(shopId, country);
            return ResponseEntity.ok(tree);
        } catch (Exception e) {
            log.error("Error getting delivery areas tree: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/root")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'ADMIN')")
    @Operation(summary = "Get root delivery areas", description = "Get all root delivery areas (no parent)")
    public ResponseEntity<?> getRootAreas(@PathVariable UUID shopId) {
        try {
            UUID currentUserId = getCurrentUserId();
            UserRole userRole = getCurrentUserRole();

            // Validate shop access
            if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
            }

            List<DeliveryAreaDTO> rootAreas = deliveryAreaService.getRootAreas(shopId);
            return ResponseEntity.ok(rootAreas);
        } catch (Exception e) {
            log.error("Error getting root areas: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{parentId}/children")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'ADMIN')")
    @Operation(summary = "Get children of a delivery area", description = "Get all child delivery areas of a specific parent")
    public ResponseEntity<?> getChildrenAreas(
            @PathVariable UUID shopId,
            @PathVariable Long parentId) {
        try {
            UUID currentUserId = getCurrentUserId();
            UserRole userRole = getCurrentUserRole();

            // Validate shop access
            if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
            }

            List<DeliveryAreaDTO> children = deliveryAreaService.getChildrenAreas(shopId, parentId);
            return ResponseEntity.ok(children);
        } catch (Exception e) {
            log.error("Error getting children areas: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private UUID getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                return null;
            }

            Object principal = auth.getPrincipal();
            if (principal instanceof CustomUserDetails customUserDetails) {
                String email = customUserDetails.getUsername();
                return userRepository.findByUserEmail(email)
                        .map(com.ecommerce.entity.User::getId)
                        .orElse(null);
            }

            return null;
        } catch (Exception e) {
            log.warn("Error getting current user ID: {}", e.getMessage());
            return null;
        }
    }

    private UserRole getCurrentUserRole() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                return null;
            }

            Object principal = auth.getPrincipal();
            if (principal instanceof CustomUserDetails customUserDetails) {
                String email = customUserDetails.getUsername();
                return userRepository.findByUserEmail(email)
                        .map(com.ecommerce.entity.User::getRole)
                        .orElse(null);
            }

            return null;
        } catch (Exception e) {
            log.warn("Error getting current user role: {}", e.getMessage());
            return null;
        }
    }
}
