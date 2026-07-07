package com.ecommerce.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ShopMemberDTO {
    private UUID id;
    private String firstName;
    private String lastName;
    private String userEmail;
    private String phoneNumber;
    private String role; // EMPLOYEE or DELIVERY_AGENT
    private UUID shopId;
    private String shopName;
    private LocalDateTime createdAt; // Join date
    private LocalDateTime lastLogin;
    private boolean enabled;
    private boolean emailVerified;
    private boolean phoneVerified;
}
