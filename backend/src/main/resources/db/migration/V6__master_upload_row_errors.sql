CREATE TABLE master_upload_row_errors (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  master_upload_batch_id BIGINT NOT NULL,
  master_type VARCHAR(32) NOT NULL,
  row_no INT NOT NULL,
  column_name VARCHAR(255) NOT NULL,
  error_code VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  original_value TEXT NULL,
  key_value VARCHAR(255) NULL,
  raw_row_json JSON NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_master_upload_row_errors_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_master_upload_row_errors_upload FOREIGN KEY (master_upload_batch_id) REFERENCES master_upload_batches(id)
);

CREATE INDEX idx_master_upload_row_errors_upload ON master_upload_row_errors (master_upload_batch_id, row_no);
CREATE INDEX idx_master_upload_row_errors_tenant_type ON master_upload_row_errors (tenant_id, master_type, created_at);
CREATE INDEX idx_master_upload_row_errors_code ON master_upload_row_errors (master_upload_batch_id, error_code);
