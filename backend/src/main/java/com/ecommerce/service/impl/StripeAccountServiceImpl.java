package com.ecommerce.service.impl;

import com.ecommerce.Exception.CustomException;
import com.ecommerce.dto.StripeAccountDTO;
import com.ecommerce.entity.Shop;
import com.ecommerce.entity.StripeAccount;
import com.ecommerce.entity.User;
import com.ecommerce.repository.ShopRepository;
import com.ecommerce.repository.StripeAccountRepository;
import com.ecommerce.repository.UserRepository;
import com.ecommerce.service.StripeAccountService;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class StripeAccountServiceImpl implements StripeAccountService {

    private final StripeAccountRepository stripeAccountRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;

    @Autowired
    public StripeAccountServiceImpl(StripeAccountRepository stripeAccountRepository,
            ShopRepository shopRepository,
            UserRepository userRepository) {
        this.stripeAccountRepository = stripeAccountRepository;
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public StripeAccountDTO createStripeAccount(UUID shopId, StripeAccountDTO stripeAccountDTO, UUID userId) {
        log.info("Creating mock Stripe account for shop: {}", shopId);

        // Validate shop exists and user is owner
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with id: " + shopId));

        if (!shop.getOwner().getId().equals(userId)) {
            throw new CustomException("You are not authorized to create Stripe account for this shop");
        }

        // Check if shop already has a Stripe account
        if (stripeAccountRepository.existsByShop_ShopId(shopId)) {
            throw new CustomException("Shop already has a Stripe account");
        }

        // Generate mock Stripe account credentials
        StripeAccountDTO mockAccount = generateMockStripeAccount(shop);

        // Check if generated Stripe account ID is already used (unlikely but possible)
        if (stripeAccountRepository.existsByStripeAccountId(mockAccount.getStripeAccountId())) {
            // Regenerate if collision (very unlikely)
            mockAccount = generateMockStripeAccount(shop);
        }

        StripeAccount stripeAccount = convertToEntity(mockAccount);
        stripeAccount.setShop(shop);
        stripeAccount.setCreatedBy(userId);
        stripeAccount.setUpdatedBy(userId);

        StripeAccount savedAccount = stripeAccountRepository.save(stripeAccount);
        log.info("Created mock Stripe account with ID: {} for shop: {}", savedAccount.getId(), shopId);

        return convertToDTO(savedAccount);
    }

    @Override
    @Transactional
    public StripeAccountDTO updateStripeAccount(UUID shopId, StripeAccountDTO stripeAccountDTO, UUID userId) {
        log.info("Updating Stripe account for shop: {}", shopId);

        // Validate shop exists and user is owner
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with id: " + shopId));

        if (!shop.getOwner().getId().equals(userId)) {
            throw new CustomException("You are not authorized to update Stripe account for this shop");
        }

        StripeAccount existingAccount = stripeAccountRepository.findByShop_ShopId(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Stripe account not found for shop: " + shopId));

        // Update fields
        existingAccount.setStripeAccountId(stripeAccountDTO.getStripeAccountId());
        existingAccount.setAccountStatus(stripeAccountDTO.getAccountStatus());
        existingAccount.setAccountType(stripeAccountDTO.getAccountType());
        existingAccount.setIsVerified(stripeAccountDTO.getIsVerified());
        existingAccount.setChargesEnabled(stripeAccountDTO.getChargesEnabled());
        existingAccount.setPayoutsEnabled(stripeAccountDTO.getPayoutsEnabled());
        existingAccount.setCountry(stripeAccountDTO.getCountry());
        existingAccount.setCurrency(stripeAccountDTO.getCurrency());
        existingAccount.setBusinessType(stripeAccountDTO.getBusinessType());
        existingAccount.setBusinessName(stripeAccountDTO.getBusinessName());
        existingAccount.setBusinessUrl(stripeAccountDTO.getBusinessUrl());
        existingAccount.setBusinessPhone(stripeAccountDTO.getBusinessPhone());
        existingAccount.setSupportEmail(stripeAccountDTO.getSupportEmail());
        existingAccount.setBankAccountId(stripeAccountDTO.getBankAccountId());
        existingAccount.setBankName(stripeAccountDTO.getBankName());
        existingAccount.setBankLast4(stripeAccountDTO.getBankLast4());
        existingAccount.setRoutingNumber(stripeAccountDTO.getRoutingNumber());
        existingAccount.setRequirements(stripeAccountDTO.getRequirements());
        existingAccount.setCapabilities(stripeAccountDTO.getCapabilities());
        existingAccount.setVerificationStatus(stripeAccountDTO.getVerificationStatus());
        existingAccount.setMetadata(stripeAccountDTO.getMetadata());
        existingAccount.setUpdatedBy(userId);

        StripeAccount savedAccount = stripeAccountRepository.save(existingAccount);
        log.info("Updated Stripe account for shop: {}", shopId);

        return convertToDTO(savedAccount);
    }

    @Override
    @Transactional
    public void deleteStripeAccount(UUID shopId, UUID userId) {
        log.info("Deleting Stripe account for shop: {}", shopId);

        // Validate shop exists and user is owner
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with id: " + shopId));

        if (!shop.getOwner().getId().equals(userId)) {
            throw new CustomException("You are not authorized to delete Stripe account for this shop");
        }

        StripeAccount stripeAccount = stripeAccountRepository.findByShop_ShopId(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Stripe account not found for shop: " + shopId));

        stripeAccountRepository.delete(stripeAccount);
        log.info("Deleted Stripe account for shop: {}", shopId);
    }

    @Override
    public StripeAccountDTO getStripeAccountByShopId(UUID shopId) {
        StripeAccount stripeAccount = stripeAccountRepository.findByShop_ShopId(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Stripe account not found for shop: " + shopId));

        return convertToDTO(stripeAccount);
    }

    @Override
    public StripeAccountDTO getStripeAccountByStripeAccountId(String stripeAccountId) {
        StripeAccount stripeAccount = stripeAccountRepository.findByStripeAccountId(stripeAccountId)
                .orElseThrow(() -> new EntityNotFoundException("Stripe account not found with ID: " + stripeAccountId));

        return convertToDTO(stripeAccount);
    }

    @Override
    public List<StripeAccountDTO> getStripeAccountsByOwner(UUID ownerId) {
        List<StripeAccount> accounts = stripeAccountRepository.findAll().stream()
                .filter(account -> account.getShop().getOwner().getId().equals(ownerId))
                .collect(Collectors.toList());

        return accounts.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public boolean hasStripeAccount(UUID shopId) {
        return stripeAccountRepository.existsByShop_ShopId(shopId);
    }

    @Override
    @Transactional
    public void updateAccountStatus(UUID shopId, StripeAccount.AccountStatus status, UUID userId) {
        StripeAccount stripeAccount = stripeAccountRepository.findByShop_ShopId(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Stripe account not found for shop: " + shopId));

        stripeAccount.setAccountStatus(status);
        stripeAccount.setUpdatedBy(userId);
        stripeAccountRepository.save(stripeAccount);

        log.info("Updated account status to {} for shop: {}", status, shopId);
    }

    @Override
    @Transactional
    public void updateVerificationStatus(UUID shopId, String verificationStatus, UUID userId) {
        StripeAccount stripeAccount = stripeAccountRepository.findByShop_ShopId(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Stripe account not found for shop: " + shopId));

        stripeAccount.setVerificationStatus(verificationStatus);
        stripeAccount.setUpdatedBy(userId);
        stripeAccountRepository.save(stripeAccount);

        log.info("Updated verification status for shop: {}", shopId);
    }

    @Override
    @Transactional
    public void updateCapabilities(UUID shopId, String capabilities, UUID userId) {
        StripeAccount stripeAccount = stripeAccountRepository.findByShop_ShopId(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Stripe account not found for shop: " + shopId));

        stripeAccount.setCapabilities(capabilities);
        stripeAccount.setUpdatedBy(userId);
        stripeAccountRepository.save(stripeAccount);

        log.info("Updated capabilities for shop: {}", shopId);
    }

    @Override
    public StripeAccountDTO convertToDTO(StripeAccount stripeAccount) {
        StripeAccountDTO dto = new StripeAccountDTO();
        dto.setId(stripeAccount.getId());
        dto.setShopId(stripeAccount.getShop().getShopId());
        dto.setShopName(stripeAccount.getShop().getName());
        dto.setStripeAccountId(stripeAccount.getStripeAccountId());
        dto.setAccountStatus(stripeAccount.getAccountStatus());
        dto.setAccountType(stripeAccount.getAccountType());
        dto.setIsVerified(stripeAccount.getIsVerified());
        dto.setChargesEnabled(stripeAccount.getChargesEnabled());
        dto.setPayoutsEnabled(stripeAccount.getPayoutsEnabled());
        dto.setCountry(stripeAccount.getCountry());
        dto.setCurrency(stripeAccount.getCurrency());
        dto.setBusinessType(stripeAccount.getBusinessType());
        dto.setBusinessName(stripeAccount.getBusinessName());
        dto.setBusinessUrl(stripeAccount.getBusinessUrl());
        dto.setBusinessPhone(stripeAccount.getBusinessPhone());
        dto.setSupportEmail(stripeAccount.getSupportEmail());
        dto.setBankAccountId(stripeAccount.getBankAccountId());
        dto.setBankName(stripeAccount.getBankName());
        dto.setBankLast4(stripeAccount.getBankLast4());
        dto.setRoutingNumber(stripeAccount.getRoutingNumber());
        dto.setRequirements(stripeAccount.getRequirements());
        dto.setCapabilities(stripeAccount.getCapabilities());
        dto.setVerificationStatus(stripeAccount.getVerificationStatus());
        dto.setMetadata(stripeAccount.getMetadata());
        dto.setCreatedAt(stripeAccount.getCreatedAt());
        dto.setUpdatedAt(stripeAccount.getUpdatedAt());
        dto.setCreatedBy(stripeAccount.getCreatedBy());
        dto.setUpdatedBy(stripeAccount.getUpdatedBy());

        return dto;
    }

    @Override
    public StripeAccount convertToEntity(StripeAccountDTO dto) {
        StripeAccount entity = new StripeAccount();
        entity.setStripeAccountId(dto.getStripeAccountId());
        entity.setAccountStatus(
                dto.getAccountStatus() != null ? dto.getAccountStatus() : StripeAccount.AccountStatus.PENDING);
        entity.setAccountType(dto.getAccountType() != null ? dto.getAccountType() : StripeAccount.AccountType.STANDARD);
        entity.setIsVerified(dto.getIsVerified());
        entity.setChargesEnabled(dto.getChargesEnabled());
        entity.setPayoutsEnabled(dto.getPayoutsEnabled());
        entity.setCountry(dto.getCountry());
        entity.setCurrency(dto.getCurrency() != null ? dto.getCurrency() : "RWF");
        entity.setBusinessType(dto.getBusinessType());
        entity.setBusinessName(dto.getBusinessName());
        entity.setBusinessUrl(dto.getBusinessUrl());
        entity.setBusinessPhone(dto.getBusinessPhone());
        entity.setSupportEmail(dto.getSupportEmail());
        entity.setBankAccountId(dto.getBankAccountId());
        entity.setBankName(dto.getBankName());
        entity.setBankLast4(dto.getBankLast4());
        entity.setRoutingNumber(dto.getRoutingNumber());
        entity.setRequirements(dto.getRequirements());
        entity.setCapabilities(dto.getCapabilities());
        entity.setVerificationStatus(dto.getVerificationStatus());
        entity.setMetadata(dto.getMetadata());

        return entity;
    }

    /**
     * Generates mock Stripe account credentials for development/testing purposes
     */
    private StripeAccountDTO generateMockStripeAccount(Shop shop) {
        StripeAccountDTO mockAccount = new StripeAccountDTO();

        // Generate a mock Stripe account ID (format: acct_test_ followed by random
        // characters)
        String mockAccountId = "acct_test_" + UUID.randomUUID().toString().substring(0, 16).replace("-", "");
        mockAccount.setStripeAccountId(mockAccountId);

        // Set account as active
        mockAccount.setAccountStatus(StripeAccount.AccountStatus.ACTIVE);
        mockAccount.setAccountType(StripeAccount.AccountType.STANDARD);

        // Set verification and capabilities
        mockAccount.setIsVerified(true);
        mockAccount.setChargesEnabled(true);
        mockAccount.setPayoutsEnabled(true);

        // Set default country and currency
        mockAccount.setCountry("US");
        mockAccount.setCurrency("RWF");

        // Set business type
        mockAccount.setBusinessType(StripeAccount.BusinessType.COMPANY);

        // Set business information based on shop
        mockAccount.setBusinessName(shop.getName());
        mockAccount.setBusinessUrl("https://" + shop.getName().toLowerCase().replace(" ", "") + ".com");
        mockAccount.setBusinessPhone("+1-555-0123");
        mockAccount.setSupportEmail("support@" + shop.getName().toLowerCase().replace(" ", "") + ".com");

        // Generate mock bank account details
        mockAccount.setBankAccountId("ba_test_" + UUID.randomUUID().toString().substring(0, 16).replace("-", ""));
        mockAccount.setBankName("Test Bank");
        mockAccount.setBankLast4("1234");
        mockAccount.setRoutingNumber("110000000");

        // Set verification status
        mockAccount.setVerificationStatus("verified");

        // Set shop ID
        mockAccount.setShopId(shop.getShopId());
        mockAccount.setShopName(shop.getName());

        return mockAccount;
    }
}