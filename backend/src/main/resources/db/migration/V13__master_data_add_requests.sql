CREATE TABLE master_data_add_requests (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  client_id BIGINT NOT NULL,
  request_type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  request_payload_json JSON NULL,
  request_memo TEXT NULL,
  requested_by BIGINT NULL,
  requested_at DATETIME(6) NOT NULL,
  reviewed_by BIGINT NULL,
  reviewed_at DATETIME(6) NULL,
  review_comment TEXT NULL,
  applied_master_type VARCHAR(32) NULL,
  applied_master_item_id BIGINT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_master_data_add_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_master_data_add_requests_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_master_data_add_requests_requested_by FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_master_data_add_requests_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX idx_master_data_add_requests_scope ON master_data_add_requests (tenant_id, client_id, status, requested_at);
CREATE INDEX idx_master_data_add_requests_type ON master_data_add_requests (tenant_id, request_type, status);
