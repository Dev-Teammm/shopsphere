package com.ecommerce.dto;

import com.ecommerce.entity.StripeAccount;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StripeAccountDTO {

    private UUID id;

    @NotNull(message = "Shop ID is required")
    private UUID shopId;

    private String shopName;

    @NotBlank(message = "Stripe account ID is required")
    private String stripeAccountId;

    private StripeAccount.AccountStatus accountStatus;

    private StripeAccount.AccountType accountType;

    private Boolean isVerified;

    private Boolean chargesEnabled;

    private Boolean payoutsEnabled;

    private String country;

    private String currency;

    private StripeAccount.BusinessType businessType;

    // Business Information
    private String businessName;

    private String businessUrl;

    private String businessPhone;

    private String supportEmail;

    // Bank Account Information
    private String bankAccountId;

    private String bankName;

    private String bankLast4;

    private String routingNumber;

    // Stripe data as JSON strings
    private String requirements;

    private String capabilities;

    private String verificationStatus;

    private String metadata;

    // Audit fields
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private UUID createdBy;

    private UUID updatedBy;
}