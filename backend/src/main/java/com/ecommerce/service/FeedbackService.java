package com.ecommerce.service;

import com.ecommerce.dto.FeedbackDTO;
import com.ecommerce.dto.SubmitFeedbackRequestDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

public interface FeedbackService {

    /**
     * Submit feedback (public - no auth required).
     */
    FeedbackDTO submit(SubmitFeedbackRequestDTO request);

    /**
     * Get paginated feedback list with search, date range filter, and sort (admin only).
     */
    Page<FeedbackDTO> findAll(String search, LocalDateTime dateFrom, LocalDateTime dateTo, Pageable pageable);

    /**
     * Get a single feedback by id (admin only).
     */
    FeedbackDTO findById(Long id);

    /**
     * Delete feedback by id (admin only).
     */
    void deleteById(Long id);
}
