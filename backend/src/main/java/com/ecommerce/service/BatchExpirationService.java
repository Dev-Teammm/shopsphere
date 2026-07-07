package com.ecommerce.service;

import com.ecommerce.entity.StockBatch;
import com.ecommerce.enums.BatchStatus;
import com.ecommerce.repository.StockBatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for managing batch expiration
 * 
 * This service implements a scalable, production-grade approach to batch
 * expiration:
 * 1. Source of truth: StockBatch.expiresAt field (timestamp in database)
 * 2. Runtime check: Batches are considered expired if expiresAt <= now
 * 3. Background job: Periodic cron job marks batches as EXPIRED in database
 * 4. Database-first approach: Automatic status update prevents stale data
 * 
 * This approach is used by large e-commerce systems like Amazon, Walmart, etc.
 * It ensures consistency and allows for distributed systems to work correctly.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BatchExpirationService {

    private final StockBatchRepository stockBatchRepository;

    /**
     * Periodic background job that marks expired batches as EXPIRED in the database
     * 
     * Runs every 5 minutes (300000 milliseconds)
     * Only processes batches that are currently ACTIVE
     * This ensures database consistency even if application process hasn't checked
     * expiration yet
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void markExpiredBatches() {
        try {
            log.debug("Starting batch expiration check job");

            LocalDateTime now = LocalDateTime.now();

            // Get all active batches (these are the only ones that can transition to
            // EXPIRED)
            List<StockBatch> activeBatches = stockBatchRepository.findAll().stream()
                    .filter(batch -> batch.getStatus() == BatchStatus.ACTIVE)
                    .toList();

            int expiredCount = 0;

            for (StockBatch batch : activeBatches) {
                // Check if expiresAt (source of truth) has passed
                if (batch.getExpiresAt() != null && batch.getExpiresAt().isBefore(now)) {
                    batch.setStatus(BatchStatus.EXPIRED);
                    stockBatchRepository.save(batch);
                    expiredCount++;

                    log.info("Marked batch {} as EXPIRED - expiresAt: {}, Batch: {}",
                            batch.getId(), batch.getExpiresAt(), batch.getBatchNumber());
                }
                // Also check legacy expiryDate field for backward compatibility
                else if (batch.getExpiryDate() != null && batch.getExpiryDate().isBefore(now)) {
                    batch.setStatus(BatchStatus.EXPIRED);
                    stockBatchRepository.save(batch);
                    expiredCount++;

                    log.info("Marked batch {} as EXPIRED (via expiryDate) - expiryDate: {}, Batch: {}",
                            batch.getId(), batch.getExpiryDate(), batch.getBatchNumber());
                }
            }

            if (expiredCount > 0) {
                log.info("Batch expiration job completed - Marked {} batches as EXPIRED", expiredCount);
            } else {
                log.debug("Batch expiration job completed - No batches expired");
            }

        } catch (Exception e) {
            log.error("Error during batch expiration check: {}", e.getMessage(), e);
            // Don't throw - scheduler should continue running
        }
    }

    /**
     * Runtime check: Determines if a batch is expired at the current moment
     * This method is called whenever batch availability is checked at runtime
     * 
     * The batch is considered expired if:
     * 1. expiresAt <= now (source of truth), OR
     * 2. expiryDate <= now (legacy field), OR
     * 3. Status is marked as EXPIRED in the database
     * 
     * @param batch the stock batch to check
     * @return true if the batch is expired at runtime
     */
    public boolean isExpiredAtRuntime(StockBatch batch) {
        if (batch == null) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now();

        // Check expiresAt first (source of truth)
        if (batch.getExpiresAt() != null && batch.getExpiresAt().isBefore(now)) {
            return true;
        }

        // Fall back to expiryDate (legacy field)
        if (batch.getExpiryDate() != null && batch.getExpiryDate().isBefore(now)) {
            return true;
        }

        // Check database status
        return batch.getStatus() == BatchStatus.EXPIRED;
    }

    /**
     * Check if batch is active and not expired
     * This is the primary method to determine if a batch can be used for orders
     * 
     * @param batch the stock batch to check
     * @return true if batch is active (not expired, not empty, not recalled)
     */
    public boolean isActiveBatch(StockBatch batch) {
        if (batch == null) {
            return false;
        }

        // Must have quantity
        if (batch.getQuantity() == null || batch.getQuantity() <= 0) {
            return false;
        }

        // Must not be expired
        if (isExpiredAtRuntime(batch)) {
            return false;
        }

        // Must be marked as ACTIVE in database
        return batch.getStatus() == BatchStatus.ACTIVE;
    }

    /**
     * Marks a specific batch as expired immediately
     * Used for manual expiration (e.g., quality issues discovered)
     * 
     * @param batchId the batch ID to expire
     * @return true if successfully marked as expired, false if batch already
     *         expired or not found
     */
    @Transactional
    public boolean expireBatchImmediately(Long batchId) {
        try {
            var batch = stockBatchRepository.findById(batchId);

            if (batch.isEmpty()) {
                log.warn("Batch {} not found for immediate expiration", batchId);
                return false;
            }

            StockBatch stockBatch = batch.get();

            if (stockBatch.getStatus() == BatchStatus.EXPIRED) {
                log.warn("Batch {} already expired", batchId);
                return false;
            }

            stockBatch.setStatus(BatchStatus.EXPIRED);
            stockBatch.setExpiresAt(LocalDateTime.now());
            stockBatchRepository.save(stockBatch);

            log.info("Immediately expired batch {}: {}", batchId, stockBatch.getBatchNumber());
            return true;

        } catch (Exception e) {
            log.error("Error immediately expiring batch {}: {}", batchId, e.getMessage(), e);
            return false;
        }
    }
}
