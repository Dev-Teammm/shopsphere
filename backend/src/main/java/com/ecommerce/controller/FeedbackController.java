package com.ecommerce.controller;

import com.ecommerce.dto.FeedbackDTO;
import com.ecommerce.dto.SubmitFeedbackRequestDTO;
import com.ecommerce.service.FeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/feedback")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Feedback", description = "Submit and manage feedback")
public class FeedbackController {

    private final FeedbackService feedbackService;

    @Operation(summary = "Submit feedback", description = "Anyone can submit feedback (no account required)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Feedback submitted"),
            @ApiResponse(responseCode = "400", description = "Invalid input")
    })
    @PostMapping
    public ResponseEntity<?> submit(@Valid @RequestBody SubmitFeedbackRequestDTO request) {
        FeedbackDTO dto = feedbackService.submit(request);
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Thank you for your feedback.");
        body.put("data", dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @Operation(summary = "List feedback (admin)", description = "Paginated list with search, date range, sort")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "List retrieved"),
            @ApiResponse(responseCode = "403", description = "Admin only")
    })
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> findAll(
            @Parameter(description = "Search in name, email, content") @RequestParam(required = false) String search,
            @Parameter(description = "From date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @Parameter(description = "To date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "DESC") String direction) {
        LocalDateTime from = dateFrom != null ? dateFrom.atStartOfDay() : null;
        LocalDateTime to = dateTo != null ? dateTo.atTime(LocalTime.MAX) : null;
        Sort.Direction dir = Sort.Direction.fromString(direction);
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sort));
        Page<FeedbackDTO> result = feedbackService.findAll(search, from, to, pageable);
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", result.getContent());
        body.put("totalElements", result.getTotalElements());
        body.put("totalPages", result.getTotalPages());
        body.put("number", result.getNumber());
        body.put("size", result.getSize());
        body.put("first", result.isFirst());
        body.put("last", result.isLast());
        return ResponseEntity.ok(body);
    }

    @Operation(summary = "Get one feedback (admin)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Feedback found"),
            @ApiResponse(responseCode = "404", description = "Not found"),
            @ApiResponse(responseCode = "403", description = "Admin only")
    })
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        FeedbackDTO dto = feedbackService.findById(id);
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", dto);
        return ResponseEntity.ok(body);
    }

    @Operation(summary = "Delete feedback (admin)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Deleted"),
            @ApiResponse(responseCode = "404", description = "Not found"),
            @ApiResponse(responseCode = "403", description = "Admin only")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteById(@PathVariable Long id) {
        feedbackService.deleteById(id);
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Feedback deleted.");
        return ResponseEntity.ok(body);
    }
}
