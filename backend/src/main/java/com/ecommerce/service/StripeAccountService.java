package com.ecommerce.service;

import com.ecommerce.dto.StripeAccountDTO;
import com.ecommerce.entity.StripeAccount;

import java.util.List;
import java.util.UUID;

public interface StripeAccountService {

    StripeAccountDTO createStripeAccount(UUID shopId, StripeAccountDTO stripeAccountDTO, UUID userId);

    StripeAccountDTO updateStripeAccount(UUID shopId, StripeAccountDTO stripeAccountDTO, UUID userId);

    void deleteStripeAccount(UUID shopId, UUID userId);

    StripeAccountDTO getStripeAccountByShopId(UUID shopId);

    StripeAccountDTO getStripeAccountByStripeAccountId(String stripeAccountId);

    List<StripeAccountDTO> getStripeAccountsByOwner(UUID ownerId);

    boolean hasStripeAccount(UUID shopId);

    void updateAccountStatus(UUID shopId, StripeAccount.AccountStatus status, UUID userId);

    void updateVerificationStatus(UUID shopId, String verificationStatus, UUID userId);

    void updateCapabilities(UUID shopId, String capabilities, UUID userId);

    StripeAccountDTO convertToDTO(StripeAccount stripeAccount);

    StripeAccount convertToEntity(StripeAccountDTO stripeAccountDTO);
}