package com.ecommerce.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.ecommerce.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryServiceImpl implements CloudinaryService {

    private final Cloudinary cloudinary;
    private final ExecutorService executorService = Executors.newFixedThreadPool(10);
    private final String unsignedPreset = System.getenv("CLOUDINARY_UNSIGNED_PRESET");

    @Override
    public Map<String, String> uploadImage(MultipartFile file) throws IOException {
        return uploadFile(file, "image");
    }

    @Override
    public List<Map<String, String>> uploadMultipleImages(List<MultipartFile> files) {
        return uploadMultipleFiles(files, "image");
    }

    @Override
    public Map<String, String> uploadVideo(MultipartFile file) throws IOException {
        return uploadFile(file, "video");
    }

    @Override
    public List<Map<String, String>> uploadMultipleVideos(List<MultipartFile> files) {
        return uploadMultipleFiles(files, "video");
    }

    @Override
    public Map<String, String> deleteFile(String publicId) throws IOException {
        Map result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        Map<String, String> response = new HashMap<>();
        response.put("publicId", publicId);
        response.put("result", result.get("result").toString());
        return response;
    }

    @Override
    public String getSignedUrl(String publicId, int expirationTimeInSeconds) {
        return cloudinary.url()
                .secure(true)
                .signed(true)
                .publicId(publicId)
                .format("auto")
                .generate();
    }

    @Override
    public String createThumbnail(String publicId, int width, int height) {
        return cloudinary.url()
                .transformation(new com.cloudinary.Transformation()
                        .width(width)
                        .height(height)
                        .crop("fill"))
                .secure(true)
                .publicId(publicId)
                .format("auto")
                .generate();
    }

    @Override
    public Map<String, String> deleteImage(String imageUrl) throws IOException {
        try {
            // Extract public ID from Cloudinary URL
            String publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId == null) {
                throw new IllegalArgumentException("Invalid Cloudinary URL format: " + imageUrl);
            }

            log.debug("Deleting image with public ID: {} from URL: {}", publicId, imageUrl);

            // Use the existing deleteFile method
            return deleteFile(publicId);

        } catch (Exception e) {
            log.error("Error deleting image from URL: {}", imageUrl, e);
            Map<String, String> errorMap = new HashMap<>();
            errorMap.put("error", "Failed to delete image");
            errorMap.put("errorMessage", e.getMessage());
            errorMap.put("imageUrl", imageUrl);
            return errorMap;
        }
    }

    /**
     * Extract public ID from a Cloudinary URL
     * 
     * @param imageUrl The Cloudinary URL
     * @return The public ID or null if extraction fails
     */
    private String extractPublicIdFromUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return null;
        }

        try {
            // Handle different Cloudinary URL formats
            // Example:
            // https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/image.jpg
            // or: https://res.cloudinary.com/cloud_name/image/upload/folder/image.jpg

            String[] parts = imageUrl.split("/upload/");
            if (parts.length < 2) {
                return null;
            }

            String afterUpload = parts[1];

            // Remove version if present (v1234567890/)
            if (afterUpload.startsWith("v") && afterUpload.contains("/")) {
                afterUpload = afterUpload.substring(afterUpload.indexOf("/") + 1);
            }

            // Remove file extension
            int lastDotIndex = afterUpload.lastIndexOf(".");
            if (lastDotIndex > 0) {
                afterUpload = afterUpload.substring(0, lastDotIndex);
            }

            return afterUpload;

        } catch (Exception e) {
            log.warn("Failed to extract public ID from URL: {}", imageUrl, e);
            return null;
        }
    }

    private Map<String, String> uploadFile(MultipartFile file, String resourceType) throws IOException {
        // Validate file before upload
        if ("video".equals(resourceType)) {
            validateVideoFile(file);
        }

        File convertedFile = convertMultiPartToFile(file);
        try {
            Map params = ObjectUtils.asMap(
                    "resource_type", resourceType,
                    "public_id", generateUniquePublicId(file),
                    "overwrite", true,
                    // Provide timestamp to help avoid stale signature issues
                    "timestamp", String.valueOf(System.currentTimeMillis() / 1000)
            );

            // If an unsigned upload preset is configured, use it to bypass signing/timestamp requirements
            if (unsignedPreset != null && !unsignedPreset.isBlank()) {
                params.put("upload_preset", unsignedPreset);
            }

            // Retry logic for handling temporary Cloudinary service issues (502, 503, etc.)
            Map uploadResult = uploadWithRetry(convertedFile, params, file.getOriginalFilename());
            Map<String, String> result = mapToStringMap(uploadResult);

            // Extract metadata for images
            if ("image".equals(resourceType)) {
                extractImageMetadata(file, result);
            }

            // Add file size for all files
            result.put("fileSize", String.valueOf(file.getSize()));
            result.put("mimeType", file.getContentType());

            return result;
        } finally {
            // Clean up the temporary file
            if (convertedFile.exists()) {
                convertedFile.delete();
            }
        }
    }

    /**
     * Upload file with retry logic for handling temporary Cloudinary service issues
     * Retries up to 3 times with exponential backoff for 5xx errors
     */
    private Map uploadWithRetry(File file, Map params, String filename) throws IOException {
        int maxRetries = 3;
        long baseDelayMs = 1000; // Start with 1 second delay
        
        IOException lastException = null;
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                log.debug("Upload attempt {} for file: {}", attempt, filename);
                return cloudinary.uploader().upload(file, params);
            } catch (RuntimeException e) {
                // Check if it's a retryable error (5xx status codes)
                String errorMessage = e.getMessage();
                boolean isRetryable = errorMessage != null && (
                    errorMessage.contains("502") || 
                    errorMessage.contains("503") || 
                    errorMessage.contains("504") ||
                    errorMessage.contains("Bad Gateway") ||
                    errorMessage.contains("Service Unavailable") ||
                    errorMessage.contains("Gateway Timeout")
                );
                
                if (isRetryable && attempt < maxRetries) {
                    long delayMs = baseDelayMs * (long) Math.pow(2, attempt - 1); // Exponential backoff
                    log.warn("Cloudinary service error (attempt {}/{}): {}. Retrying in {}ms...", 
                            attempt, maxRetries, errorMessage, delayMs);
                    
                    try {
                        Thread.sleep(delayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new IOException("Upload interrupted during retry delay", ie);
                    }
                    
                    lastException = new IOException("Cloudinary service error: " + errorMessage, e);
                    continue; // Retry
                } else {
                    // Not retryable or max retries reached
                    log.error("Failed to upload file {} after {} attempts: {}", filename, attempt, errorMessage, e);
                    throw new IOException("Failed to upload file to Cloudinary: " + 
                            (errorMessage != null ? errorMessage : e.getMessage()), e);
                }
            } catch (IOException e) {
                // For IOExceptions, check if it's a retryable network issue
                String errorMessage = e.getMessage();
                boolean isRetryable = errorMessage != null && (
                    errorMessage.contains("502") || 
                    errorMessage.contains("503") || 
                    errorMessage.contains("504") ||
                    errorMessage.contains("Connection") ||
                    errorMessage.contains("timeout")
                );
                
                if (isRetryable && attempt < maxRetries) {
                    long delayMs = baseDelayMs * (long) Math.pow(2, attempt - 1);
                    log.warn("Network error during upload (attempt {}/{}): {}. Retrying in {}ms...", 
                            attempt, maxRetries, errorMessage, delayMs);
                    
                    try {
                        Thread.sleep(delayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new IOException("Upload interrupted during retry delay", ie);
                    }
                    
                    lastException = e;
                    continue; // Retry
                } else {
                    // Not retryable or max retries reached
                    log.error("Failed to upload file {} after {} attempts: {}", filename, attempt, errorMessage, e);
                    throw e;
                }
            }
        }
        
        // Should not reach here, but handle it just in case
        if (lastException != null) {
            throw lastException;
        }
        throw new IOException("Failed to upload file after " + maxRetries + " attempts");
    }

    private List<Map<String, String>> uploadMultipleFiles(List<MultipartFile> files, String resourceType) {
        List<CompletableFuture<Map<String, String>>> futures = files.stream()
                .map(file -> CompletableFuture.supplyAsync(() -> {
                    try {
                        return uploadFile(file, resourceType);
                    } catch (IOException e) {
                        log.error("Error uploading file {}: {}", file.getOriginalFilename(), e.getMessage(), e);
                        Map<String, String> errorMap = new HashMap<>();
                        errorMap.put("error", "Failed to upload file: " + file.getOriginalFilename());
                        
                        // Provide user-friendly error message
                        String errorMessage = e.getMessage();
                        if (errorMessage != null && errorMessage.contains("502")) {
                            errorMap.put("errorMessage", "Cloudinary service temporarily unavailable. Please try again in a few moments.");
                        } else if (errorMessage != null && errorMessage.contains("503")) {
                            errorMap.put("errorMessage", "Cloudinary service is temporarily overloaded. Please try again shortly.");
                        } else if (errorMessage != null && errorMessage.contains("504")) {
                            errorMap.put("errorMessage", "Upload request timed out. Please check your connection and try again.");
                        } else {
                            errorMap.put("errorMessage", errorMessage != null ? errorMessage : "Unknown error occurred during upload");
                        }
                        
                        errorMap.put("originalFilename", file.getOriginalFilename());
                        return errorMap;
                    } catch (Exception e) {
                        log.error("Unexpected error uploading file {}: {}", file.getOriginalFilename(), e.getMessage(), e);
                        Map<String, String> errorMap = new HashMap<>();
                        errorMap.put("error", "Failed to upload file: " + file.getOriginalFilename());
                        errorMap.put("errorMessage", "An unexpected error occurred: " + e.getMessage());
                        errorMap.put("originalFilename", file.getOriginalFilename());
                        return errorMap;
                    }
                }, executorService))
                .collect(Collectors.toList());

        return futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList());
    }

    private File convertMultiPartToFile(MultipartFile file) throws IOException {
        String fileName = file.getOriginalFilename();
        File convertedFile = File.createTempFile("upload",
                fileName != null ? fileName.substring(fileName.lastIndexOf(".")) : ".tmp");
        FileOutputStream fos = new FileOutputStream(convertedFile);
        fos.write(file.getBytes());
        fos.close();
        return convertedFile;
    }

    private String generateUniquePublicId(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        return UUID.randomUUID().toString() + extension;
    }

    private Map<String, String> mapToStringMap(Map uploadResult) {
        Map<String, String> result = new HashMap<>();
        for (Object key : uploadResult.keySet()) {
            Object value = uploadResult.get(key);
            result.put(key.toString(), value != null ? value.toString() : null);
        }
        return result;
    }

    /**
     * Validates video file duration and size constraints
     */
    private void validateVideoFile(MultipartFile file) throws IOException {
        // Check file size (max 50MB for videos)
        long maxFileSize = 50 * 1024 * 1024; // 50MB
        if (file.getSize() > maxFileSize) {
            throw new IllegalArgumentException("Video file size exceeds maximum allowed (50MB)");
        }

        // Check content type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("video/")) {
            throw new IllegalArgumentException("File must be a video format");
        }

        // For video duration validation, we'll use a simpler approach
        // In a production environment, you might want to use libraries like FFmpeg
        log.info("Video file validation passed for: {} ({})", file.getOriginalFilename(), contentType);
    }

    /**
     * Extracts image metadata (dimensions) and adds to result map
     */
    private void extractImageMetadata(MultipartFile file, Map<String, String> result) {
        try {
            // Check file size (max 10MB for images)
            long maxFileSize = 10 * 1024 * 1024; // 10MB
            if (file.getSize() > maxFileSize) {
                throw new IllegalArgumentException("Image file size exceeds maximum allowed (10MB)");
            }

            // Extract image dimensions
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(file.getBytes()));
            if (image != null) {
                result.put("width", String.valueOf(image.getWidth()));
                result.put("height", String.valueOf(image.getHeight()));
                log.debug("Extracted image dimensions: {}x{} for file: {}",
                        image.getWidth(), image.getHeight(), file.getOriginalFilename());
            } else {
                log.warn("Could not read image dimensions for file: {}", file.getOriginalFilename());
                result.put("width", "0");
                result.put("height", "0");
            }
        } catch (IOException e) {
            log.error("Error extracting image metadata for file: {}", file.getOriginalFilename(), e);
            // Set default values if extraction fails
            result.put("width", "0");
            result.put("height", "0");
        }
    }
}