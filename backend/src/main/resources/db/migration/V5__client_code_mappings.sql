CREATE TABLE client_product_code_mappings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  client_id BIGINT NOT NULL,
  client_product_code VARCHAR(64) NOT NULL,
  ezadmin_code VARCHAR(64) NOT NULL,
  active_yn BOOLEAN NOT NULL DEFAULT TRUE,
  memo VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uk_client_product_code_mappings_client_code UNIQUE (tenant_id, client_id, client_product_code),
  CONSTRAINT fk_client_product_code_mappings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_client_product_code_mappings_client FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX idx_client_product_code_mappings_target ON client_product_code_mappings (tenant_id, ezadmin_code, active_yn);

CREATE TABLE client_store_code_mappings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  client_id BIGINT NOT NULL,
  client_store_code VARCHAR(64) NOT NULL,
  baljugo_code VARCHAR(64) NOT NULL,
  active_yn BOOLEAN NOT NULL DEFAULT TRUE,
  memo VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uk_client_store_code_mappings_client_code UNIQUE (tenant_id, client_id, client_store_code),
  CONSTRAINT fk_client_store_code_mappings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_client_store_code_mappings_client FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX idx_client_store_code_mappings_target ON client_store_code_mappings (tenant_id, baljugo_code, active_yn);
