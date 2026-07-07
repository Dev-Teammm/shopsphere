package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisibilityIssueDTO {
    private String code;
    private String title;
    private String description;
    private String severity;
    private String actionLabel;
    private String actionPath;
}
