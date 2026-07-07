package com.ecommerce.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "stripe_accounts", indexes = {
        @Index(name = "idx_stripe_accounts_shop_id", columnList = "shop_id"),
        @Index(name = "idx_stripe_accounts_stripe_external_id", columnList = "stripe_external_id"),
        @Index(name = "idx_stripe_accounts_status", columnList = "account_status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StripeAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "stripe_account_id", updatable = false, nullable = false)
    private UUID id;

    @NotNull(message = "Shop is required")
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false, unique = true)
    @JsonBackReference
    private Shop shop;

    @NotBlank(message = "Stripe account ID is required")
    @Column(name = "stripe_external_id", nullable = false, unique = true)
    private String stripeAccountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", nullable = false)
    private AccountStatus accountStatus = AccountStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false)
    private AccountType accountType = AccountType.STANDARD;

    @Column(name = "is_verified")
    private Boolean isVerified = false;

    @Column(name = "charges_enabled")
    private Boolean chargesEnabled = false;

    @Column(name = "payouts_enabled")
    private Boolean payoutsEnabled = false;

    @Column(name = "country", length = 2)
    private String country;

    @Column(name = "currency", length = 3)
    private String currency = "RWF";

    @Enumerated(EnumType.STRING)
    @Column(name = "business_type")
    private BusinessType businessType;

    // Business Information
    @Column(name = "business_name")
    private String businessName;

    @Column(name = "business_url")
    private String businessUrl;

    @Column(name = "business_phone")
    private String businessPhone;

    @Column(name = "support_email")
    private String supportEmail;

    // Bank Account Information (for display purposes, actual details stored in
    // Stripe)
    @Column(name = "bank_account_id")
    private String bankAccountId;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "bank_last4")
    private String bankLast4;

    @Column(name = "routing_number")
    private String routingNumber;

    // Stripe Requirements and Capabilities
    @Column(name = "requirements", columnDefinition = "TEXT")
    private String requirements; // JSON string of Stripe requirements

    @Column(name = "capabilities", columnDefinition = "TEXT")
    private String capabilities; // JSON string of Stripe capabilities

    @Column(name = "verification_status", columnDefinition = "TEXT")
    private String verificationStatus; // JSON string of verification status

    // Metadata
    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata; // Additional custom data as JSON

    // Audit fields
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isVerified == null) {
            isVerified = false;
        }
        if (chargesEnabled == null) {
            chargesEnabled = false;
        }
        if (payoutsEnabled == null) {
            payoutsEnabled = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum AccountStatus {
        PENDING, ACTIVE, SUSPENDED, DISABLED, CLOSED;

        @JsonCreator
        public static AccountStatus fromString(String value) {
            if (value == null)
                return null;
            return AccountStatus.valueOf(value.toUpperCase());
        }

        @JsonValue
        public String toValue() {
            return this.name();
        }
    }

    public enum AccountType {
        STANDARD, EXPRESS, CUSTOM;

        @JsonCreator
        public static AccountType fromString(String value) {
            if (value == null)
                return null;
            return AccountType.valueOf(value.toUpperCase());
        }

        @JsonValue
        public String toValue() {
            return this.name();
        }
    }

    public enum BusinessType {
        INDIVIDUAL, COMPANY, NON_PROFIT, GOVERNMENT_ENTITY;

        @JsonCreator
        public static BusinessType fromString(String value) {
            if (value == null)
                return null;
            return BusinessType.valueOf(value.toUpperCase());
        }

        @JsonValue
        public String toValue() {
            return this.name();
        }
    }
}