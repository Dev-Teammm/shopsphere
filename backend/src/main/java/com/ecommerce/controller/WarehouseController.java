package com.ecommerce.controller;

import com.ecommerce.dto.CreateWarehouseDTO;
import com.ecommerce.dto.ProductVariantWarehouseDTO;
import com.ecommerce.dto.UpdateWarehouseDTO;
import com.ecommerce.dto.WarehouseDTO;
import com.ecommerce.dto.WarehouseProductDTO;
import com.ecommerce.dto.CountryValidationRequest;
import com.ecommerce.service.WarehouseService;
import com.ecommerce.service.ShopAuthorizationService;
import com.ecommerce.ServiceImpl.CustomUserDetails;
import com.ecommerce.Enum.UserRole;
import com.ecommerce.repository.UserRepository;
import com.ecommerce.repository.WarehouseRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/warehouses")
@Slf4j
public class WarehouseController {

    private final WarehouseService warehouseService;
    private final ObjectMapper objectMapper;
    private final ShopAuthorizationService shopAuthorizationService;
    private final UserRepository userRepository;
    private final WarehouseRepository warehouseRepository;

    @Autowired
    public WarehouseController(WarehouseService warehouseService,
            ObjectMapper objectMapper,
            ShopAuthorizationService shopAuthorizationService,
            UserRepository userRepository,
            WarehouseRepository warehouseRepository) {
        this.warehouseService = warehouseService;
        this.objectMapper = objectMapper;
        this.shopAuthorizationService = shopAuthorizationService;
        this.userRepository = userRepository;
        this.warehouseRepository = warehouseRepository;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<WarehouseDTO> createWarehouse(
            @RequestParam("warehouse") String warehouseJson,
            @RequestParam(value = "images", required = false) List<MultipartFile> images) throws Exception {
        CreateWarehouseDTO createWarehouseDTO = objectMapper.readValue(warehouseJson, CreateWarehouseDTO.class);

        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, shopId is required and must validate access
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (createWarehouseDTO.getShopId() == null) {
                throw new IllegalArgumentException("shopId is required for VENDOR and EMPLOYEE roles");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, createWarehouseDTO.getShopId());
        }

        WarehouseDTO warehouse = warehouseService.createWarehouse(createWarehouseDTO, images);
        return ResponseEntity.status(HttpStatus.CREATED).body(warehouse);
    }

    @GetMapping("/{warehouseId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<WarehouseDTO> getWarehouseById(@PathVariable Long warehouseId) {
        WarehouseDTO warehouse = warehouseService.getWarehouseById(warehouseId);

        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, validate shop access
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (warehouse.getShopId() == null) {
                throw new IllegalArgumentException("Warehouse does not belong to a shop");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, warehouse.getShopId());
        }

        return ResponseEntity.ok(warehouse);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<Page<WarehouseDTO>> getAllWarehouses(
            @RequestParam(value = "shopId", required = false) UUID shopId,
            Pageable pageable) {
        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, shopId is required
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (shopId == null) {
                throw new IllegalArgumentException("shopId is required for VENDOR and EMPLOYEE roles");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
        }

        Page<WarehouseDTO> warehouses = warehouseService.getAllWarehouses(shopId, pageable);
        return ResponseEntity.ok(warehouses);
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<List<WarehouseDTO>> getAllWarehousesList(
            @RequestParam(value = "shopId", required = false) UUID shopId) {
        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, shopId is required
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (shopId == null) {
                throw new IllegalArgumentException("shopId is required for VENDOR and EMPLOYEE roles");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
        }

        List<WarehouseDTO> warehouses = warehouseService.getAllWarehouses(shopId);
        return ResponseEntity.ok(warehouses);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<Page<WarehouseDTO>> searchWarehouses(
            @RequestParam("query") String query,
            @RequestParam(value = "shopId", required = false) UUID shopId,
            Pageable pageable) {
        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, shopId is required
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (shopId == null) {
                throw new IllegalArgumentException("shopId is required for VENDOR and EMPLOYEE roles");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
        }

        Page<WarehouseDTO> warehouses = warehouseService.searchWarehouses(query, shopId, pageable);
        return ResponseEntity.ok(warehouses);
    }

    @PutMapping("/{warehouseId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<WarehouseDTO> updateWarehouse(
            @PathVariable Long warehouseId,
            @RequestParam("warehouse") String warehouseJson,
            @RequestParam(value = "images", required = false) List<MultipartFile> images) throws Exception {
        log.info("Updating warehouse with ID: {}", warehouseId);
        UpdateWarehouseDTO updateWarehouseDTO = objectMapper.readValue(warehouseJson, UpdateWarehouseDTO.class);

        // Get warehouse to check shop access
        WarehouseDTO existingWarehouse = warehouseService.getWarehouseById(warehouseId);
        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, validate shop access
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (existingWarehouse.getShopId() == null) {
                throw new IllegalArgumentException("Warehouse does not belong to a shop");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, existingWarehouse.getShopId());
        }

        WarehouseDTO warehouse = warehouseService.updateWarehouse(warehouseId, updateWarehouseDTO, images);
        return ResponseEntity.ok(warehouse);
    }

    @DeleteMapping("/{warehouseId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<Void> deleteWarehouse(@PathVariable Long warehouseId) {
        log.info("Deleting warehouse with ID: {}", warehouseId);

        // Get warehouse to check shop access
        WarehouseDTO existingWarehouse = warehouseService.getWarehouseById(warehouseId);
        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, validate shop access
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (existingWarehouse.getShopId() == null) {
                throw new IllegalArgumentException("Warehouse does not belong to a shop");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, existingWarehouse.getShopId());
        }

        boolean deleted = warehouseService.deleteWarehouse(warehouseId);
        if (deleted) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{warehouseId}/products")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<Page<WarehouseProductDTO>> getProductsInWarehouse(
            @PathVariable Long warehouseId,
            @PageableDefault(size = 10, sort = "id") Pageable pageable) {
        log.info("Getting products for warehouse {}", warehouseId);

        // Get warehouse to check shop access
        WarehouseDTO warehouse = warehouseService.getWarehouseById(warehouseId);
        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, validate shop access
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (warehouse.getShopId() == null) {
                throw new IllegalArgumentException("Warehouse does not belong to a shop");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, warehouse.getShopId());
        }

        Page<WarehouseProductDTO> products = warehouseService.getProductsInWarehouse(warehouseId, pageable);
        return ResponseEntity.ok(products);
    }

    @GetMapping("/{warehouseId}/products/{productId}/variants")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<List<ProductVariantWarehouseDTO>> getProductVariantsInWarehouse(
            @PathVariable Long warehouseId,
            @PathVariable UUID productId) {
        log.info("Getting variants for product {} in warehouse {}", productId, warehouseId);

        // Get warehouse to check shop access
        WarehouseDTO warehouse = warehouseService.getWarehouseById(warehouseId);
        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, validate shop access
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (warehouse.getShopId() == null) {
                throw new IllegalArgumentException("Warehouse does not belong to a shop");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, warehouse.getShopId());
        }

        List<ProductVariantWarehouseDTO> variants = warehouseService.getProductVariantsInWarehouse(warehouseId,
                productId);
        return ResponseEntity.ok(variants);
    }

    @DeleteMapping("/{warehouseId}/products/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<Void> removeProductFromWarehouse(
            @PathVariable Long warehouseId,
            @PathVariable UUID productId) {
        log.info("Removing product {} from warehouse {}", productId, warehouseId);

        // Get warehouse to check shop access
        WarehouseDTO warehouse = warehouseService.getWarehouseById(warehouseId);
        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, validate shop access
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (warehouse.getShopId() == null) {
                throw new IllegalArgumentException("Warehouse does not belong to a shop");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, warehouse.getShopId());
        }

        boolean removed = warehouseService.removeProductFromWarehouse(warehouseId, productId);
        if (removed) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @DeleteMapping("/{warehouseId}/variants/{variantId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<Void> removeVariantFromWarehouse(
            @PathVariable Long warehouseId,
            @PathVariable Long variantId) {
        log.info("Removing variant {} from warehouse {}", variantId, warehouseId);

        // Get warehouse to check shop access
        WarehouseDTO warehouse = warehouseService.getWarehouseById(warehouseId);
        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, validate shop access
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (warehouse.getShopId() == null) {
                throw new IllegalArgumentException("Warehouse does not belong to a shop");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, warehouse.getShopId());
        }

        boolean removed = warehouseService.removeVariantFromWarehouse(warehouseId, variantId);
        if (removed) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/{warehouseId}/images")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<WarehouseDTO> addImagesToWarehouse(
            @PathVariable Long warehouseId,
            @RequestParam("images") List<MultipartFile> images) {
        log.info("Adding {} images to warehouse {}", images.size(), warehouseId);

        // Get warehouse to check shop access
        WarehouseDTO existingWarehouse = warehouseService.getWarehouseById(warehouseId);
        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, validate shop access
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (existingWarehouse.getShopId() == null) {
                throw new IllegalArgumentException("Warehouse does not belong to a shop");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, existingWarehouse.getShopId());
        }

        WarehouseDTO warehouse = warehouseService.addImagesToWarehouse(warehouseId, images);
        return ResponseEntity.ok(warehouse);
    }

    @DeleteMapping("/{warehouseId}/images/{imageId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<Void> removeImageFromWarehouse(
            @PathVariable Long warehouseId,
            @PathVariable Long imageId) {
        log.info("Removing image {} from warehouse {}", imageId, warehouseId);

        // Get warehouse to check shop access
        WarehouseDTO existingWarehouse = warehouseService.getWarehouseById(warehouseId);
        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, validate shop access
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (existingWarehouse.getShopId() == null) {
                throw new IllegalArgumentException("Warehouse does not belong to a shop");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, existingWarehouse.getShopId());
        }

        boolean removed = warehouseService.removeImageFromWarehouse(warehouseId, imageId);
        if (removed) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @GetMapping("/location")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR')")
    public ResponseEntity<List<WarehouseDTO>> getWarehousesByLocation(
            @RequestParam String location,
            @RequestParam(value = "shopId", required = false) UUID shopId) {
        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, shopId is required
        if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
            if (shopId == null) {
                throw new IllegalArgumentException("shopId is required for VENDOR and EMPLOYEE roles");
            }
            shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
        }

        List<WarehouseDTO> warehouses = warehouseService.getWarehousesByLocation(location, shopId);
        return ResponseEntity.ok(warehouses);
    }

    @GetMapping("/nearby")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'VENDOR', 'CUSTOMER', 'DELIVERY_AGENT')")
    public ResponseEntity<List<WarehouseDTO>> getWarehousesNearLocation(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam Double radiusKm,
            @RequestParam(value = "shopId", required = false) UUID shopId) {
        UUID currentUserId = getCurrentUserId();
        UserRole userRole = getCurrentUserRole();

        // For VENDOR and EMPLOYEE, shopId is required if provided
        if ((userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) && shopId != null) {
            shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
        }

        List<WarehouseDTO> warehouses = warehouseService.getWarehousesNearLocation(latitude, longitude, radiusKm,
                shopId);
        return ResponseEntity.ok(warehouses);
    }

    @GetMapping("/public/shops/{shopId}")
    @Operation(summary = "Get warehouses for a shop (public)", description = "Get paginated active warehouses for a shop. No authentication required.")
    public ResponseEntity<Page<WarehouseDTO>> getWarehousesByShopIdPublic(
            @PathVariable UUID shopId,
            @PageableDefault(size = 10, sort = "name") Pageable pageable) {
        log.info("Fetching active warehouses for shop {} (public)", shopId);
        // Use repository to get only active warehouses with pagination, then use service to map
        Page<WarehouseDTO> warehouses = warehouseRepository.findByShopShopIdAndIsActiveTrue(shopId, pageable)
                .map(warehouse -> warehouseService.getWarehouseById(warehouse.getId()));
        return ResponseEntity.ok(warehouses);
    }

    @GetMapping("/countries")
    public ResponseEntity<List<String>> getWarehouseCountries() {
        log.info("Fetching all countries with warehouses");
        List<String> countries = warehouseService.getWarehouseCountries();
        return ResponseEntity.ok(countries);
    }

    @GetMapping("/countries/paginated")
    public ResponseEntity<Page<String>> getWarehouseCountriesPaginated(Pageable pageable) {
        log.info("Fetching countries with warehouses - page: {}, size: {}", pageable.getPageNumber(),
                pageable.getPageSize());
        Page<String> countries = warehouseService.getWarehouseCountriesPaginated(pageable);
        return ResponseEntity.ok(countries);
    }

    @PostMapping("/countries/validate-country")
    public ResponseEntity<Boolean> validateCountry(@RequestBody CountryValidationRequest request) {
        log.info("Validating country: {}", request.getCountry());
        boolean isValid = warehouseService.hasWarehouseInCountry(request.getCountry());
        return ResponseEntity.ok(isValid);
    }

    private UUID getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                throw new RuntimeException("User not authenticated");
            }

            Object principal = auth.getPrincipal();
            if (principal instanceof CustomUserDetails customUserDetails) {
                String email = customUserDetails.getUsername();
                return userRepository.findByUserEmail(email)
                        .map(com.ecommerce.entity.User::getId)
                        .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
            }

            throw new RuntimeException("Unable to extract user ID from authentication");
        } catch (Exception e) {
            throw new RuntimeException("Error getting current user ID: " + e.getMessage(), e);
        }
    }

    private UserRole getCurrentUserRole() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                throw new RuntimeException("User not authenticated");
            }

            Object principal = auth.getPrincipal();
            if (principal instanceof CustomUserDetails customUserDetails) {
                String email = customUserDetails.getUsername();
                return userRepository.findByUserEmail(email)
                        .map(com.ecommerce.entity.User::getRole)
                        .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
            }

            throw new RuntimeException("Unable to extract user role from authentication");
        } catch (Exception e) {
            throw new RuntimeException("Error getting current user role: " + e.getMessage(), e);
        }
    }
}
