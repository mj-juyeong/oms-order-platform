ALTER TABLE clients
  ADD COLUMN external_code VARCHAR(128) NULL AFTER name;
