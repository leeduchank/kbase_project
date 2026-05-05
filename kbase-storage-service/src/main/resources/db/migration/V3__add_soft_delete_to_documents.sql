-- V3: Add soft-delete flag to documents (default FALSE = not deleted)
ALTER TABLE documents
    ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_documents_project_deleted ON documents(project_id, is_deleted);
