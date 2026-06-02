package com.company.oms.notification

import com.company.oms.batch.UploadBatchEntity
import com.company.oms.auth.CurrentUser
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.NotificationEventType
import com.company.oms.common.persistence.NotificationSeverity
import com.company.oms.common.persistence.NotificationTargetScope
import com.company.oms.common.persistence.UserScopeType
import com.company.oms.common.response.PageResponse
import jakarta.persistence.criteria.Predicate
import org.springframework.context.annotation.Profile
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Profile("local")
class NotificationService(
	private val notificationRepository: NotificationRepository,
) {
	@Transactional
	fun notifyBatchConfirmationRequested(
		batch: UploadBatchEntity,
		requestId: Long,
	) {
		create(
			tenantId = batch.tenantId,
			clientId = null,
			targetScope = NotificationTargetScope.TENANT,
			eventType = NotificationEventType.BATCH_CONFIRMATION_REQUESTED,
			severity = NotificationSeverity.INFO,
			title = "배치 확정 요청 도착",
			message = "${batch.batchNo} 배치의 확정 요청이 도착했습니다.",
			relatedResourceType = "BATCH_CONFIRMATION_REQUEST",
			relatedResourceId = requestId.toString(),
			linkPath = "/batch-confirmation-requests",
		)
	}

	@Transactional
	fun notifyBatchConfirmationApproved(batch: UploadBatchEntity) {
		createClientBatchNotification(
			batch = batch,
			eventType = NotificationEventType.BATCH_CONFIRMATION_APPROVED,
			severity = NotificationSeverity.INFO,
			title = "배치 확정 완료",
			message = "${batch.batchNo} 배치가 승인되어 최종 확정되었습니다.",
			linkPath = "/batches/${batch.id}",
		)
	}

	@Transactional
	fun notifyBatchConfirmationNeedsMoreInfo(
		batch: UploadBatchEntity,
		comment: String?,
	) {
		val suffix = comment?.takeIf { it.isNotBlank() }?.let { " 사유: ${it.take(120)}" }.orEmpty()
		createClientBatchNotification(
			batch = batch,
			eventType = NotificationEventType.BATCH_CONFIRMATION_NEEDS_MORE_INFO,
			severity = NotificationSeverity.WARNING,
			title = "배치 보완 요청",
			message = "${batch.batchNo} 배치에 보완 요청이 등록되었습니다.$suffix",
			linkPath = "/batches/${batch.id}",
		)
	}

	@Transactional
	fun notifyBatchConfirmationRejected(
		batch: UploadBatchEntity,
		comment: String?,
	) {
		val suffix = comment?.takeIf { it.isNotBlank() }?.let { " 사유: ${it.take(120)}" }.orEmpty()
		createClientBatchNotification(
			batch = batch,
			eventType = NotificationEventType.BATCH_CONFIRMATION_REJECTED,
			severity = NotificationSeverity.ERROR,
			title = "배치 확정 요청 반려",
			message = "${batch.batchNo} 배치 확정 요청이 반려되었습니다.$suffix",
			linkPath = "/batches/${batch.id}",
		)
	}

	@Transactional(readOnly = true)
	fun listNotifications(
		currentUser: CurrentUser,
		tenantId: Long,
		clientId: Long?,
		severity: NotificationSeverity?,
		eventType: NotificationEventType?,
		readStatus: NotificationReadStatus,
		page: Int,
		size: Int,
	): PageResponse<NotificationResponse> {
		val pageable = PageRequest.of(
			page.coerceAtLeast(0),
			size.coerceIn(1, 100),
			Sort.by(Sort.Direction.DESC, "occurredAt").and(Sort.by(Sort.Direction.DESC, "id")),
		)
		val result = notificationRepository.findAll(
			notificationSpec(currentUser, tenantId, clientId, severity, eventType, readStatus),
			pageable,
		)
		return PageResponse(
			items = result.content.map { it.toResponse() },
			page = result.number,
			size = result.size,
			totalElements = result.totalElements,
			totalPages = result.totalPages,
		)
	}

	@Transactional(readOnly = true)
	fun countUnread(
		currentUser: CurrentUser,
		tenantId: Long,
		clientId: Long?,
	): NotificationUnreadCountResponse {
		val count = notificationRepository.count(
			notificationSpec(
				currentUser = currentUser,
				tenantId = tenantId,
				clientId = clientId,
				severity = null,
				eventType = null,
				readStatus = NotificationReadStatus.UNREAD,
			),
		)
		return NotificationUnreadCountResponse(unreadCount = count)
	}

	@Transactional
	fun markRead(
		currentUser: CurrentUser,
		tenantId: Long,
		clientId: Long?,
		notificationId: Long,
	): NotificationResponse {
		val notification = notificationRepository.findById(notificationId).orElseThrow {
			OmsException(ErrorCode.NOT_FOUND, message = "알림을 찾을 수 없습니다.", status = HttpStatus.NOT_FOUND)
		}
		if (!canAccess(currentUser, tenantId, clientId, notification)) {
			throw OmsException(ErrorCode.NOT_FOUND, message = "알림을 찾을 수 없습니다.", status = HttpStatus.NOT_FOUND)
		}
		if (notification.readAt == null) {
			notification.readAt = LocalDateTime.now()
		}
		return notification.toResponse()
	}

	@Transactional
	fun markAllRead(
		currentUser: CurrentUser,
		tenantId: Long,
		clientId: Long?,
		request: NotificationReadAllRequest?,
	): NotificationUnreadCountResponse {
		val unread = notificationRepository.findAll(
			notificationSpec(
				currentUser = currentUser,
				tenantId = tenantId,
				clientId = clientId,
				severity = request?.severity,
				eventType = request?.eventType,
				readStatus = NotificationReadStatus.UNREAD,
			),
		)
		val now = LocalDateTime.now()
		unread.forEach { it.readAt = now }
		return countUnread(currentUser, tenantId, clientId)
	}

	private fun createClientBatchNotification(
		batch: UploadBatchEntity,
		eventType: NotificationEventType,
		severity: NotificationSeverity,
		title: String,
		message: String,
		linkPath: String,
	) {
		create(
			tenantId = batch.tenantId,
			clientId = batch.clientId,
			targetScope = NotificationTargetScope.CLIENT,
			eventType = eventType,
			severity = severity,
			title = title,
			message = message,
			relatedResourceType = "BATCH",
			relatedResourceId = (batch.id ?: 0).toString(),
			linkPath = linkPath,
		)
	}

	private fun create(
		tenantId: Long,
		clientId: Long?,
		targetScope: NotificationTargetScope,
		eventType: NotificationEventType,
		severity: NotificationSeverity,
		title: String,
		message: String,
		relatedResourceType: String?,
		relatedResourceId: String?,
		linkPath: String?,
	) {
		notificationRepository.save(
			NotificationEntity(
				tenantId = tenantId,
				clientId = clientId,
				targetScope = targetScope,
				eventType = eventType,
				severity = severity,
				title = title,
				message = message,
				relatedResourceType = relatedResourceType,
				relatedResourceId = relatedResourceId,
				linkPath = linkPath,
				occurredAt = LocalDateTime.now(),
			),
		)
	}
}

private fun notificationSpec(
	currentUser: CurrentUser,
	tenantId: Long,
	clientId: Long?,
	severity: NotificationSeverity?,
	eventType: NotificationEventType?,
	readStatus: NotificationReadStatus,
): Specification<NotificationEntity> =
	Specification { root, _, criteriaBuilder ->
		val predicates = mutableListOf<Predicate>()
		predicates += criteriaBuilder.equal(root.get<Long>("tenantId"), tenantId)

		when (currentUser.userScopeType) {
			UserScopeType.CLIENT -> {
				val currentClientId = currentUser.clientId ?: -1
				val userId = currentUser.userId
				if (userId == null) {
					predicates += criteriaBuilder.equal(root.get<Long>("clientId"), currentClientId)
				} else {
					predicates += criteriaBuilder.or(
						criteriaBuilder.equal(root.get<Long>("clientId"), currentClientId),
						criteriaBuilder.equal(root.get<Long>("userId"), userId),
					)
				}
			}

			else -> {
				if (clientId != null) {
					predicates += criteriaBuilder.equal(root.get<Long>("clientId"), clientId)
				}
			}
		}

		if (severity != null) {
			predicates += criteriaBuilder.equal(root.get<NotificationSeverity>("severity"), severity)
		}
		if (eventType != null) {
			predicates += criteriaBuilder.equal(root.get<NotificationEventType>("eventType"), eventType)
		}
		when (readStatus) {
			NotificationReadStatus.UNREAD -> predicates += criteriaBuilder.isNull(root.get<LocalDateTime>("readAt"))
			NotificationReadStatus.READ -> predicates += criteriaBuilder.isNotNull(root.get<LocalDateTime>("readAt"))
			NotificationReadStatus.ALL -> Unit
		}

		criteriaBuilder.and(*predicates.toTypedArray())
	}

private fun canAccess(
	currentUser: CurrentUser,
	tenantId: Long,
	clientId: Long?,
	notification: NotificationEntity,
): Boolean {
	if (notification.tenantId != tenantId) {
		return false
	}
	return when (currentUser.userScopeType) {
		UserScopeType.CLIENT -> {
			notification.clientId == currentUser.clientId || notification.userId == currentUser.userId
		}

		else -> clientId == null || notification.clientId == clientId
	}
}
