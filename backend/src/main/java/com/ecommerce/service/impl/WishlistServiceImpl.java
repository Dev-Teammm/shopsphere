package com.ecommerce.service.impl;

import com.ecommerce.dto.AddToCartDTO;
import com.ecommerce.dto.AddToWishlistDTO;
import com.ecommerce.dto.WishlistDTO;
import com.ecommerce.dto.WishlistProductDTO;
import com.ecommerce.dto.UpdateWishlistProductDTO;
import com.ecommerce.service.CartService;
import com.ecommerce.service.ProductAvailabilityService;
import com.ecommerce.entity.Wishlist;
import com.ecommerce.entity.WishlistProduct;
import com.ecommerce.entity.Product;
import com.ecommerce.entity.User;
import com.ecommerce.repository.WishlistProductRepository;
import com.ecommerce.repository.WishlistRepository;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.repository.UserRepository;
import com.ecommerce.service.WishlistService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WishlistServiceImpl implements WishlistService {

        private final WishlistProductRepository wishlistProductRepository;
        private final WishlistRepository wishlistRepository;
        private final UserRepository userRepository;
        private final ProductRepository productRepository;
        private final CartService cartService;
        private final ProductAvailabilityService productAvailabilityService;

        @Override
        @Transactional
        public WishlistProductDTO addToWishlist(UUID userId, AddToWishlistDTO addToWishlistDTO) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

                Product product = productRepository.findById(addToWishlistDTO.getProductId())
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Product not found with ID: "
                                                                + addToWishlistDTO.getProductId()));

                if (!product.isActive()) {
                        throw new IllegalArgumentException("Product is not active");
                }

                // Check if product is available for customers (includes expired subscription
                // check)
                // For expired subscriptions: products NOT visible, so can't add to wishlist
                if (!productAvailabilityService.isProductAvailableForCustomers(product)) {
                        throw new IllegalArgumentException(
                                        "Product is not available. The shop's subscription may have expired or the product is not active.");
                }

                Wishlist wishlist = getOrCreateUserWishlist(user);

                // Check if product already exists in wishlist
                WishlistProduct existingProduct = wishlistProductRepository
                                .findByWishlistIdAndProductProductId(wishlist.getId(), product.getProductId())
                                .orElse(null);

                if (existingProduct != null) {
                        // Update existing product with new notes/priority if provided
                        if (addToWishlistDTO.getNotes() != null) {
                                existingProduct.setNotes(addToWishlistDTO.getNotes());
                        }
                        if (addToWishlistDTO.getPriority() != null) {
                                existingProduct.setPriority(addToWishlistDTO.getPriority());
                        }
                        existingProduct = wishlistProductRepository.save(existingProduct);
                        return mapWishlistProductToDTO(existingProduct);
                } else {
                        // Create new wishlist product
                        WishlistProduct newProduct = new WishlistProduct();
                        newProduct.setWishlist(wishlist);
                        newProduct.setProduct(product);
                        newProduct.setNotes(addToWishlistDTO.getNotes());
                        newProduct.setPriority(
                                        addToWishlistDTO.getPriority() != null ? addToWishlistDTO.getPriority() : 0);
                        newProduct.setAddedAt(LocalDateTime.now());

                        WishlistProduct savedProduct = wishlistProductRepository.save(newProduct);
                        return mapWishlistProductToDTO(savedProduct);
                }
        }

        @Override
        @Transactional
        public WishlistProductDTO updateWishlistProduct(UUID userId,
                        UpdateWishlistProductDTO updateWishlistProductDTO) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

                Wishlist wishlist = wishlistRepository.findByUserId(userId)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Wishlist is empty"));

                WishlistProduct wishlistProduct = wishlistProductRepository
                                .findById(updateWishlistProductDTO.getWishlistProductId())
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Wishlist product not found with ID: "
                                                                + updateWishlistProductDTO.getWishlistProductId()));

                if (!wishlistProduct.getWishlist().getId().equals(wishlist.getId())) {
                        throw new IllegalArgumentException("Wishlist product does not belong to the user");
                }

                if (!productAvailabilityService.isProductAvailableForCustomers(wishlistProduct.getProduct())) {
                        throw new EntityNotFoundException("Product is no longer available for customers.");
                }

                // Update fields if provided
                if (updateWishlistProductDTO.getNotes() != null) {
                        wishlistProduct.setNotes(updateWishlistProductDTO.getNotes());
                }
                if (updateWishlistProductDTO.getPriority() != null) {
                        wishlistProduct.setPriority(updateWishlistProductDTO.getPriority());
                }

                WishlistProduct updatedProduct = wishlistProductRepository.save(wishlistProduct);
                return mapWishlistProductToDTO(updatedProduct);
        }

        @Override
        @Transactional
        public boolean removeFromWishlist(UUID userId, Long wishlistProductId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

                Wishlist wishlist = wishlistRepository.findByUserId(userId)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Wishlist is empty"));

                WishlistProduct wishlistProduct = wishlistProductRepository.findById(wishlistProductId)
                                .orElseThrow(
                                                () -> new EntityNotFoundException("Wishlist product not found with ID: "
                                                                + wishlistProductId));

                if (!wishlistProduct.getWishlist().getId().equals(wishlist.getId())) {
                        throw new IllegalArgumentException("Wishlist product does not belong to the user");
                }

                wishlistProductRepository.delete(wishlistProduct);
                return true;
        }

        @Override
        @Transactional
        public WishlistDTO viewWishlist(UUID userId, Pageable pageable) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

                Wishlist wishlist = wishlistRepository.findByUserId(userId)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Wishlist is empty"));

                List<WishlistProduct> allProducts = wishlistProductRepository.findByWishlistId(wishlist.getId());
                List<WishlistProduct> availableProducts = new java.util.ArrayList<>();
                for (WishlistProduct wp : allProducts) {
                        if (productAvailabilityService.isProductAvailableForCustomers(wp.getProduct())) {
                                availableProducts.add(wp);
                        } else {
                                wishlistProductRepository.delete(wp);
                        }
                }

                int totalAvailable = availableProducts.size();
                int pageNumber = pageable.getPageNumber();
                int pageSize = pageable.getPageSize();
                int fromIndex = Math.min(pageNumber * pageSize, totalAvailable);
                int toIndex = Math.min(fromIndex + pageSize, totalAvailable);
                List<WishlistProduct> pageProducts = fromIndex < totalAvailable
                                ? availableProducts.subList(fromIndex, toIndex)
                                : new java.util.ArrayList<>();

                List<WishlistProductDTO> wishlistProductDTOs = pageProducts.stream()
                                .map(this::mapWishlistProductToDTO)
                                .collect(Collectors.toList());

                return WishlistDTO.builder()
                                .wishlistId(wishlist.getId())
                                .userId(userId)
                                .products(wishlistProductDTOs)
                                .totalProducts(totalAvailable)
                                .createdAt(wishlist.getCreatedAt())
                                .updatedAt(wishlist.getUpdatedAt())
                                .isEmpty(totalAvailable == 0)
                                .build();
        }

        @Override
        @Transactional
        public boolean clearWishlist(UUID userId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

                Wishlist wishlist = wishlistRepository.findByUserId(userId)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Wishlist is empty"));

                wishlistProductRepository.deleteByWishlistId(wishlist.getId());
                return true;
        }

        @Override
        @Transactional
        public WishlistProductDTO getWishlistProduct(UUID userId, Long wishlistProductId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

                Wishlist wishlist = wishlistRepository.findByUserId(userId)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Wishlist is empty"));

                WishlistProduct wishlistProduct = wishlistProductRepository.findById(wishlistProductId)
                                .orElseThrow(
                                                () -> new EntityNotFoundException("Wishlist product not found with ID: "
                                                                + wishlistProductId));

                if (!wishlistProduct.getWishlist().getId().equals(wishlist.getId())) {
                        throw new IllegalArgumentException("Wishlist product does not belong to the user");
                }

                if (!productAvailabilityService.isProductAvailableForCustomers(wishlistProduct.getProduct())) {
                        throw new EntityNotFoundException("Product is no longer available for customers.");
                }

                return mapWishlistProductToDTO(wishlistProduct);
        }

        @Override
        @Transactional
        public boolean hasProducts(UUID userId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

                Wishlist wishlist = wishlistRepository.findByUserId(userId)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Wishlist is empty"));

                long productCount = wishlistProductRepository.countByWishlistId(wishlist.getId());
                return productCount > 0;
        }

        @Override
        @Transactional
        public boolean moveToCart(UUID userId, Long wishlistProductId, int quantity) {

                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

                Wishlist wishlist = wishlistRepository.findByUserId(userId)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Wishlist is empty"));

                WishlistProduct wishlistProduct = wishlistProductRepository.findById(wishlistProductId)
                                .orElseThrow(
                                                () -> new EntityNotFoundException("Wishlist product not found with ID: "
                                                                + wishlistProductId));

                if (!wishlistProduct.getWishlist().getId().equals(wishlist.getId())) {
                        throw new IllegalArgumentException("Wishlist product does not belong to the user");
                }

                Product product = wishlistProduct.getProduct();
                if (!productAvailabilityService.isProductAvailableForCustomers(product)) {
                        throw new IllegalArgumentException(
                                        "Product is no longer available for customers. It may be hidden, out of stock, or the shop may no longer be active.");
                }

                AddToCartDTO addToCartDTO = new AddToCartDTO();
                addToCartDTO.setProductId(product.getProductId());
                addToCartDTO.setQuantity(quantity);

                cartService.addToCart(userId, addToCartDTO);

                // Only remove from wishlist if the product has no variants
                // Products with variants should remain in wishlist so users can buy multiple
                // variants
                if (product.getVariants() == null || product.getVariants().isEmpty()) {
                        wishlistProductRepository.delete(wishlistProduct);
                }

                return true;
        }

        private Wishlist getOrCreateUserWishlist(User user) {
                return wishlistRepository.findByUserId(user.getId())
                                .orElseGet(() -> {
                                        Wishlist newWishlist = new Wishlist();
                                        newWishlist.setUser(user);
                                        return wishlistRepository.save(newWishlist);
                                });
        }

        private WishlistProductDTO mapWishlistProductToDTO(WishlistProduct wishlistProduct) {
                Product product = wishlistProduct.getProduct();
                String productImage = null;

                if (product.getImages() != null && !product.getImages().isEmpty()) {
                        productImage = product.getImages().stream()
                                        .filter(img -> img.isPrimary())
                                        .findFirst()
                                        .map(img -> img.getImageUrl())
                                        .orElse(product.getImages().get(0).getImageUrl());
                }

                return WishlistProductDTO.builder()
                                .id(wishlistProduct.getId())
                                .productId(product.getProductId())
                                .productSku(product.getSku())
                                .productName(product.getProductName())
                                .productImage(productImage)
                                .notes(wishlistProduct.getNotes())
                                .priority(wishlistProduct.getPriority())
                                .addedAt(wishlistProduct.getAddedAt())
                                .inStock(product.isInStock())
                                .availableStock(product.getTotalStockQuantity())
                                .price(product.getPrice())
                                .finalPrice(product.getDiscountedPrice())
                                .unit(com.ecommerce.dto.UnitDTO.from(product.getUnit()))
                                .organic(product.getOrganic())
                                .build();
        }
}
