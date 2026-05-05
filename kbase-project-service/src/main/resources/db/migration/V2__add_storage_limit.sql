-- V2: Add storage quota limit per project (default 1 GB = 1,073,741,824 bytes)
ALTER TABLE projects
    ADD COLUMN storage_limit BIGINT NOT NULL DEFAULT 1073741824;
