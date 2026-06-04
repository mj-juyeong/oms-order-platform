UPDATE api_keys
SET scope_type = CASE
  WHEN client_id IS NULL THEN 'TENANT'
  ELSE 'CLIENT'
END;

ALTER TABLE api_call_logs
  MODIFY COLUMN client_id BIGINT NULL;

CREATE INDEX idx_api_keys_scope_type ON api_keys (tenant_id, scope_type, status);
