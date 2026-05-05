-- V4: Track when a document was soft-deleted for auto-purge after 30 days
ALTER TABLE documents
    ADD COLUMN deleted_at TIMESTAMP;

-- Back-fill: any existing soft-deleted rows get "now" as their deletion time
UPDATE documents SET deleted_at = NOW() WHERE is_deleted = TRUE AND deleted_at IS NULL;
