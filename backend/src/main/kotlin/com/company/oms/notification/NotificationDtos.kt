package com.company.oms.notification

import com.company.oms.common.persistence.NotificationEventType
import com.company.oms.common.persistence.NotificationSeverity
import com.company.oms.common.persistence.NotificationTargetScope
import java.time.LocalDateTime

data class NotificationResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long?,
	val userId: Long?,
	val targetScope: NotificationTargetScope,
	val eventType: NotificationEventType,
	val severity: NotificationSeverity,
	val title: String,
	val message: String,
	val relatedResourceType: String?,
	val relatedResourceId: String?,
	val linkPath: String?,
	val readAt: LocalDateTime?,
	val occurredAt: LocalDateTime,
	val createdAt: LocalDateTime?,
)

data class NotificationUnreadCountResponse(
	val unreadCount: Long,
)

data class NotificationReadAllRequest(
	val severity: NotificationSeverity? = null,
	val eventType: NotificationEventType? = null,
)

enum class NotificationReadStatus {
	UNREAD,
	READ,
	ALL,
}

fun NotificationEntity.toResponse(): NotificationResponse =
	NotificationResponse(
		id = id ?: 0,
		tenantId = tenantId,
		clientId = clientId,
		userId = userId,
		targetScope = targetScope,
		eventType = eventType,
		severity = severity,
		title = title,
		message = message,
		relatedResourceType = relatedResourceType,
		relatedResourceId = relatedResourceId,
		linkPath = linkPath,
		readAt = readAt,
		occurredAt = occurredAt,
		createdAt = createdAt,
	)
