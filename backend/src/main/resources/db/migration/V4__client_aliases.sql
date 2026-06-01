CREATE TABLE client_aliases (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  client_id BIGINT NOT NULL,
  alias_name VARCHAR(255) NOT NULL,
  normalized_alias VARCHAR(255) NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'ADMIN',
  active_yn BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uk_client_aliases_normalized UNIQUE (tenant_id, normalized_alias),
  CONSTRAINT fk_client_aliases_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_client_aliases_client FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX idx_client_aliases_client ON client_aliases (tenant_id, client_id, active_yn);
