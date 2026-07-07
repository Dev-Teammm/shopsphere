package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

import com.ecommerce.dto.UnitDTO;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartProductsResponseDTO {

    private List<CartProductDTO> items;
    private BigDecimal subtotal;
    private Integer totalItems;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartProductDTO {

        private String itemId; // From localStorage
        private String productId;
        private Long variantId;
        private String productName;
        private String productDescription;
        private BigDecimal price;
        private BigDecimal previousPrice;
        private String productImage;
        private Integer quantity;
        private Integer availableStock;
        private BigDecimal totalPrice;
        private Double averageRating;
        private Integer reviewCount;

        // Variant specific fields
        private String variantSku;
        private List<VariantAttributeDTO> variantAttributes;
        
        // Discount information
        private BigDecimal discountPercentage;
        private String discountName;
        private BigDecimal discountAmount; // Amount saved due to discount
        private Boolean hasDiscount;
        
        // Shop capability
        private com.ecommerce.enums.ShopCapability shopCapability;

        /** Unit of measure (e.g. kg, pc). */
        private UnitDTO unit;

        /** Whether the product is organic. */
        private Boolean organic;

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class VariantAttributeDTO {
            private String attributeTypeName;
            private String attributeValue;
        }
    }
}
