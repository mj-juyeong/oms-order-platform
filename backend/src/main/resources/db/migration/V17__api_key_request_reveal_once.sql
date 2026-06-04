SET @issued_api_key_secret_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'api_key_requests'
    AND column_name = 'issued_api_key_secret'
);
SET @issued_api_key_secret_sql := IF(
  @issued_api_key_secret_exists = 0,
  'ALTER TABLE api_key_requests ADD COLUMN issued_api_key_secret TEXT NULL AFTER issued_at',
  'SELECT 1'
);
PREPARE issued_api_key_secret_stmt FROM @issued_api_key_secret_sql;
EXECUTE issued_api_key_secret_stmt;
DEALLOCATE PREPARE issued_api_key_secret_stmt;

SET @issued_api_key_revealed_at_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'api_key_requests'
    AND column_name = 'issued_api_key_revealed_at'
);
SET @issued_api_key_revealed_at_sql := IF(
  @issued_api_key_revealed_at_exists = 0,
  'ALTER TABLE api_key_requests ADD COLUMN issued_api_key_revealed_at DATETIME(6) NULL AFTER issued_api_key_secret',
  'SELECT 1'
);
PREPARE issued_api_key_revealed_at_stmt FROM @issued_api_key_revealed_at_sql;
EXECUTE issued_api_key_revealed_at_stmt;
DEALLOCATE PREPARE issued_api_key_revealed_at_stmt;
