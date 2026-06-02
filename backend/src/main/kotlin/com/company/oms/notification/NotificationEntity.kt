package com.company.oms.notification

import com.company.oms.common.persistence.CreatedAtEntity
import com.company.oms.common.persistence.NotificationEventType
import com.company.oms.common.persistence.NotificationSeverity
import com.company.oms.common.persistence.NotificationTargetScope
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "notifications")
class NotificationEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id")
	var clientId: Long? = null,

	@Column(name = "user_id")
	var userId: Long? = null,

	@Enumerated(EnumType.STRING)
	@Column(name = "target_scope", nullable = false, length = 30)
	var targetScope: NotificationTargetScope = NotificationTargetScope.TENANT,

	@Enumerated(EnumType.STRING)
	@Column(name = "event_type", nullable = false, length = 80)
	var eventType: NotificationEventType = NotificationEventType.BATCH_CONFIRMATION_REQUESTED,

	@Enumerated(EnumType.STRING)
	@Column(name = "severity", nullable = false, length = 20)
	var severity: NotificationSeverity = NotificationSeverity.INFO,

	@Column(name = "title", nullable = false, length = 200)
	var title: String = "",

	@Column(name = "message", nullable = false, length = 1000)
	var message: String = "",

	@Column(name = "related_resource_type", length = 50)
	var relatedResourceType: String? = null,

	@Column(name = "related_resource_id", length = 100)
	var relatedResourceId: String? = null,

	@Column(name = "link_path", length = 500)
	var linkPath: String? = null,

	@Column(name = "read_at")
	var readAt: LocalDateTime? = null,

	@Column(name = "occurred_at", nullable = false)
	var occurredAt: LocalDateTime = LocalDateTime.now(),
) : CreatedAtEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}
