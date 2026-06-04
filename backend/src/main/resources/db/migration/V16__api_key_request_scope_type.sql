SET @api_key_requests_scope_type_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'api_key_requests'
    AND column_name = 'scope_type'
);
SET @api_key_requests_scope_type_sql := IF(
  @api_key_requests_scope_type_exists = 0,
  'ALTER TABLE api_key_requests ADD COLUMN scope_type VARCHAR(32) NOT NULL DEFAULT ''CLIENT'' AFTER client_id',
  'SELECT 1'
);
PREPARE api_key_requests_scope_type_stmt FROM @api_key_requests_scope_type_sql;
EXECUTE api_key_requests_scope_type_stmt;
DEALLOCATE PREPARE api_key_requests_scope_type_stmt;

UPDATE api_key_requests
SET scope_type = CASE
  WHEN client_id IS NULL THEN 'TENANT'
  ELSE 'CLIENT'
END
WHERE scope_type IS NULL OR scope_type NOT IN ('CLIENT', 'TENANT');

ALTER TABLE api_key_requests
  MODIFY COLUMN client_id BIGINT NULL;

ALTER TABLE api_key_request_events
  MODIFY COLUMN client_id BIGINT NULL;
