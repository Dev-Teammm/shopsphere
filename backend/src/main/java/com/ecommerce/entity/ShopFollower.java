package com.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonBackReference;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "shop_followers", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"shop_id", "user_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShopFollower {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "follower_id", updatable = false, nullable = false)
    private UUID followerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    @JsonBackReference
    private Shop shop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonBackReference
    private User user;

    @Column(name = "followed_at", nullable = false)
    private LocalDateTime followedAt;

    @PrePersist
    protected void onCreate() {
        followedAt = LocalDateTime.now();
    }
}
