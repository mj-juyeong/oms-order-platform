CREATE TABLE notifications (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  client_id BIGINT NULL,
  user_id BIGINT NULL,
  target_scope VARCHAR(30) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  related_resource_type VARCHAR(50) NULL,
  related_resource_id VARCHAR(100) NULL,
  link_path VARCHAR(500) NULL,
  read_at DATETIME(6) NULL,
  occurred_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_notifications_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_notifications_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_notifications_tenant_unread ON notifications (tenant_id, read_at, occurred_at);
CREATE INDEX idx_notifications_client_unread ON notifications (tenant_id, client_id, read_at, occurred_at);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, read_at, occurred_at);
CREATE INDEX idx_notifications_event_time ON notifications (event_type, occurred_at);
