CREATE TABLE client_master_visibility_settings (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  client_id BIGINT NOT NULL,
  product_visibility_mode VARCHAR(32) NOT NULL DEFAULT 'SCOPED_ONLY',
  store_route_visibility_mode VARCHAR(32) NOT NULL DEFAULT 'SCOPED_ONLY',
  show_price_fields_yn BOOLEAN NOT NULL DEFAULT FALSE,
  show_supplier_fields_yn BOOLEAN NOT NULL DEFAULT FALSE,
  show_store_route_internal_fields_yn BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by BIGINT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_client_master_visibility_settings_scope UNIQUE (tenant_id, client_id),
  CONSTRAINT fk_client_master_visibility_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_client_master_visibility_settings_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_client_master_visibility_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE client_product_master_scopes (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  client_id BIGINT NOT NULL,
  product_master_item_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  source VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
  created_by BIGINT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_client_product_master_scopes_item UNIQUE (tenant_id, client_id, product_master_item_id),
  CONSTRAINT fk_client_product_master_scopes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_client_product_master_scopes_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_client_product_master_scopes_product FOREIGN KEY (product_master_item_id) REFERENCES product_master_items(id),
  CONSTRAINT fk_client_product_master_scopes_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_client_product_master_scopes_scope ON client_product_master_scopes (tenant_id, client_id, status);

CREATE TABLE client_store_route_master_scopes (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  client_id BIGINT NOT NULL,
  store_route_master_item_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  source VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
  created_by BIGINT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_client_store_route_master_scopes_item UNIQUE (tenant_id, client_id, store_route_master_item_id),
  CONSTRAINT fk_client_store_route_master_scopes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_client_store_route_master_scopes_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_client_store_route_master_scopes_store_route FOREIGN KEY (store_route_master_item_id) REFERENCES store_route_master_items(id),
  CONSTRAINT fk_client_store_route_master_scopes_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_client_store_route_master_scopes_scope ON client_store_route_master_scopes (tenant_id, client_id, status);
