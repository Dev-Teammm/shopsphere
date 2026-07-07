package com.ecommerce.controller;

import com.ecommerce.dto.UserRewardSummaryDTO;
import com.ecommerce.entity.User;
import com.ecommerce.service.RewardPointsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.repository.UserRepository;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rewards")
@RequiredArgsConstructor
@Slf4j
public class RewardPointsController {

    private final RewardPointsService rewardPointsService;
    private final UserRepository userRepository;

    @GetMapping("/my-points")
    public ResponseEntity<UserRewardSummaryDTO> getMyPoints(
            @AuthenticationPrincipal Object principal,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "shopName") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {

        UUID userId = null;
        if (principal instanceof User) {
            userId = ((User) principal).getId();
        } else if (principal instanceof com.ecommerce.ServiceImpl.CustomUserDetails) {
            userId = ((com.ecommerce.ServiceImpl.CustomUserDetails) principal).getUserId();
        }

        if (userId == null) {
            log.error("Authenticated user ID not found in principal: {}", principal);
            return ResponseEntity.status(401).build();
        }

        log.info("Request to get points for user ID: {}, query: {}", userId, query);

        // Fetch user from repository as the service expects a User object
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Sort sort = Sort.by(Sort.Direction.fromString(sortDir.toUpperCase()), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        return ResponseEntity.ok(rewardPointsService.getUserRewards(user, query, pageable));
    }
}
