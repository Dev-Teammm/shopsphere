package com.ecommerce.service.impl;

import com.ecommerce.dto.FeedbackDTO;
import com.ecommerce.dto.SubmitFeedbackRequestDTO;
import com.ecommerce.entity.Feedback;
import com.ecommerce.repository.FeedbackRepository;
import com.ecommerce.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FeedbackServiceImpl implements FeedbackService {

    private final FeedbackRepository feedbackRepository;

    @Override
    @Transactional(readOnly = false)
    public FeedbackDTO submit(SubmitFeedbackRequestDTO request) {
        Feedback feedback = new Feedback();
        feedback.setUsername(request.getUsername().trim());
        feedback.setEmail(request.getEmail().trim());
        feedback.setContent(request.getContent().trim());
        Feedback saved = feedbackRepository.save(feedback);
        log.info("Feedback submitted: id={}, email={}", saved.getId(), saved.getEmail());
        return toDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<FeedbackDTO> findAll(String search, LocalDateTime dateFrom, LocalDateTime dateTo, Pageable pageable) {
        Specification<Feedback> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("username")), pattern),
                    cb.like(cb.lower(root.get("email")), pattern),
                    cb.like(cb.lower(root.get("content")), pattern)
                ));
            }
            if (dateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), dateFrom));
            }
            if (dateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), dateTo));
            }
            if (predicates.isEmpty()) {
                return cb.conjunction();
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<Feedback> page = feedbackRepository.findAll(spec, pageable);
        return page.map(this::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackDTO findById(Long id) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Feedback not found: " + id));
        return toDTO(feedback);
    }

    @Override
    @Transactional(readOnly = false)
    public void deleteById(Long id) {
        if (!feedbackRepository.existsById(id)) {
            throw new jakarta.persistence.EntityNotFoundException("Feedback not found: " + id);
        }
        feedbackRepository.deleteById(id);
        log.info("Feedback deleted: id={}", id);
    }

    private FeedbackDTO toDTO(Feedback f) {
        return FeedbackDTO.builder()
                .id(f.getId())
                .username(f.getUsername())
                .email(f.getEmail())
                .content(f.getContent())
                .createdAt(f.getCreatedAt())
                .build();
    }
}
