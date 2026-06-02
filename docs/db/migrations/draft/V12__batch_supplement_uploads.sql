ALTER TABLE batch_confirmation_requests
  ADD COLUMN supplement_type VARCHAR(32) NULL AFTER review_comment;

ALTER TABLE upload_batches
  ADD COLUMN parent_batch_id BIGINT NULL AFTER batch_no,
  ADD COLUMN revision_no INT NOT NULL DEFAULT 1 AFTER parent_batch_id,
  ADD COLUMN reupload_reason VARCHAR(1000) NULL AFTER revision_no,
  ADD CONSTRAINT fk_upload_batches_parent_batch FOREIGN KEY (parent_batch_id) REFERENCES upload_batches(id);

CREATE INDEX idx_upload_batches_parent_batch ON upload_batches (parent_batch_id, revision_no);
