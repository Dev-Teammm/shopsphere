package com.ecommerce.service;

import com.ecommerce.entity.Shop;
import com.ecommerce.entity.ShopFollower;
import com.ecommerce.entity.User;
import com.ecommerce.repository.ShopFollowerRepository;
import com.ecommerce.repository.ShopRepository;
import com.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopFollowerService {

    private final ShopFollowerRepository shopFollowerRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;

    /**
     * Follow a shop
     */
    @Transactional
    public void followShop(UUID shopId, UUID userId) {
        // Check if already following
        if (shopFollowerRepository.existsByShopShopIdAndUserId(shopId, userId)) {
            throw new IllegalArgumentException("You are already following this shop");
        }

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        ShopFollower follower = new ShopFollower();
        follower.setShop(shop);
        follower.setUser(user);

        shopFollowerRepository.save(follower);
        log.info("User {} started following shop {}", userId, shopId);
    }

    /**
     * Unfollow a shop
     */
    @Transactional
    public void unfollowShop(UUID shopId, UUID userId) {
        if (!shopFollowerRepository.existsByShopShopIdAndUserId(shopId, userId)) {
            throw new IllegalArgumentException("You are not following this shop");
        }

        shopFollowerRepository.deleteByShopShopIdAndUserId(shopId, userId);
        log.info("User {} unfollowed shop {}", userId, shopId);
    }

    /**
     * Check if user follows a shop
     */
    @Transactional(readOnly = true)
    public boolean isFollowing(UUID shopId, UUID userId) {
        return shopFollowerRepository.existsByShopShopIdAndUserId(shopId, userId);
    }

    /**
     * Get follower count for a shop
     */
    @Transactional(readOnly = true)
    public long getFollowerCount(UUID shopId) {
        return shopFollowerRepository.countByShopShopId(shopId);
    }

    /**
     * Get all shop IDs that a user follows
     */
    @Transactional(readOnly = true)
    public List<UUID> getFollowedShopIds(UUID userId) {
        return shopFollowerRepository.findShopIdsByUserId(userId);
    }
}
