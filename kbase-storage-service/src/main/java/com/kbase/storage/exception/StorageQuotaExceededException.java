package com.kbase.storage.exception;

/**
 * Thrown when a file upload would cause the project's total storage
 * to exceed its configured quota limit.
 */
public class StorageQuotaExceededException extends RuntimeException {

    public StorageQuotaExceededException(String message) {
        super(message);
    }
}
