package com.ecommerce.repository;

import com.ecommerce.entity.StripeAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StripeAccountRepository extends JpaRepository<StripeAccount, UUID> {

    Optional<StripeAccount> findByShop_ShopId(UUID shopId);

    Optional<StripeAccount> findByStripeAccountId(String stripeAccountId);

    boolean existsByShop_ShopId(UUID shopId);

    boolean existsByStripeAccountId(String stripeAccountId);

    @Query("SELECT sa FROM StripeAccount sa WHERE sa.shop.owner.id = :userId")
    Optional<StripeAccount> findByShopOwnerId(@Param("userId") UUID userId);

    @Query("SELECT sa FROM StripeAccount sa WHERE sa.accountStatus = :status")
    java.util.List<StripeAccount> findByAccountStatus(@Param("status") StripeAccount.AccountStatus status);
}