SET @api_keys_scope_type_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'api_keys'
    AND column_name = 'scope_type'
);
SET @api_keys_scope_type_sql := IF(
  @api_keys_scope_type_exists = 0,
  'ALTER TABLE api_keys ADD COLUMN scope_type VARCHAR(32) NOT NULL DEFAULT ''CLIENT'' AFTER client_id',
  'SELECT 1'
);
PREPARE api_keys_scope_type_stmt FROM @api_keys_scope_type_sql;
EXECUTE api_keys_scope_type_stmt;
DEALLOCATE PREPARE api_keys_scope_type_stmt;

UPDATE api_keys
SET scope_type = CASE
  WHEN client_id IS NULL THEN 'TENANT'
  ELSE 'CLIENT'
END
WHERE scope_type IS NULL OR scope_type NOT IN ('CLIENT', 'TENANT');

CREATE TABLE IF NOT EXISTS api_key_requests (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  client_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  purpose VARCHAR(500) NOT NULL,
  system_name VARCHAR(100) NOT NULL,
  contact_name VARCHAR(100) NULL,
  contact_email VARCHAR(255) NULL,
  contact_phone VARCHAR(50) NULL,
  allowed_scope JSON NULL,
  requested_expires_at DATETIME(6) NULL,
  status VARCHAR(32) NOT NULL,
  requested_by BIGINT NULL,
  requested_at DATETIME(6) NOT NULL,
  reviewed_by BIGINT NULL,
  reviewed_at DATETIME(6) NULL,
  review_comment TEXT NULL,
  issued_api_key_id BIGINT NULL,
  issued_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_api_key_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_api_key_requests_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_api_key_requests_requested_by FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_api_key_requests_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id),
  CONSTRAINT fk_api_key_requests_issued_key FOREIGN KEY (issued_api_key_id) REFERENCES api_keys(id)
);

CREATE TABLE IF NOT EXISTS api_key_request_events (
  id BIGINT NOT NULL AUTO_INCREMENT,
  request_id BIGINT NOT NULL,
  tenant_id BIGINT NOT NULL,
  client_id BIGINT NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  actor_id BIGINT NULL,
  comment TEXT NULL,
  api_key_id BIGINT NULL,
  occurred_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_api_key_request_events_request FOREIGN KEY (request_id) REFERENCES api_key_requests(id),
  CONSTRAINT fk_api_key_request_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_api_key_request_events_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_api_key_request_events_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  CONSTRAINT fk_api_key_request_events_api_key FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);

SET @idx_api_keys_scope_type_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'api_keys'
    AND index_name = 'idx_api_keys_scope_type'
);
SET @idx_api_keys_scope_type_sql := IF(
  @idx_api_keys_scope_type_exists = 0,
  'CREATE INDEX idx_api_keys_scope_type ON api_keys (tenant_id, scope_type, status)',
  'SELECT 1'
);
PREPARE idx_api_keys_scope_type_stmt FROM @idx_api_keys_scope_type_sql;
EXECUTE idx_api_keys_scope_type_stmt;
DEALLOCATE PREPARE idx_api_keys_scope_type_stmt;

SET @idx_api_key_requests_list_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'api_key_requests'
    AND index_name = 'idx_api_key_requests_list'
);
SET @idx_api_key_requests_list_sql := IF(
  @idx_api_key_requests_list_exists = 0,
  'CREATE INDEX idx_api_key_requests_list ON api_key_requests (tenant_id, client_id, status, requested_at)',
  'SELECT 1'
);
PREPARE idx_api_key_requests_list_stmt FROM @idx_api_key_requests_list_sql;
EXECUTE idx_api_key_requests_list_stmt;
DEALLOCATE PREPARE idx_api_key_requests_list_stmt;

SET @idx_api_key_request_events_request_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'api_key_request_events'
    AND index_name = 'idx_api_key_request_events_request'
);
SET @idx_api_key_request_events_request_sql := IF(
  @idx_api_key_request_events_request_exists = 0,
  'CREATE INDEX idx_api_key_request_events_request ON api_key_request_events (request_id, occurred_at)',
  'SELECT 1'
);
PREPARE idx_api_key_request_events_request_stmt FROM @idx_api_key_request_events_request_sql;
EXECUTE idx_api_key_request_events_request_stmt;
DEALLOCATE PREPARE idx_api_key_request_events_request_stmt;
