CREATE TABLE batch_confirmation_requests (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  client_id BIGINT NOT NULL,
  batch_id BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL,
  requested_by BIGINT NULL,
  requested_at DATETIME(6) NOT NULL,
  request_memo VARCHAR(1000) NULL,
  reviewed_by BIGINT NULL,
  reviewed_at DATETIME(6) NULL,
  review_comment VARCHAR(1000) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_batch_confirmation_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_batch_confirmation_requests_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_batch_confirmation_requests_batch FOREIGN KEY (batch_id) REFERENCES upload_batches(id),
  CONSTRAINT fk_batch_confirmation_requests_requested_by FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_batch_confirmation_requests_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX idx_batch_confirmation_requests_scope ON batch_confirmation_requests (tenant_id, client_id, status, requested_at);
CREATE INDEX idx_batch_confirmation_requests_batch ON batch_confirmation_requests (batch_id, status);
