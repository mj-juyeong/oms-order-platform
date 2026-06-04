package com.company.oms.batch

import com.company.oms.audit.BatchAuditLogEntity
import com.company.oms.audit.BatchAuditLogRepository
import com.company.oms.auth.UserRepository
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.BatchConfirmationRequestStatus
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.BatchSupplementRequestType
import com.company.oms.common.persistence.ValidationSeverity
import com.company.oms.common.request.RequestContext
import com.company.oms.common.response.PageResponse
import com.company.oms.notification.NotificationService
import com.company.oms.validation.ValidationErrorRepository
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
class BatchConfirmationRequestService(
	private val uploadBatchRepository: UploadBatchRepository,
	private val confirmationRequestRepository: BatchConfirmationRequestRepository,
	private val validationErrorRepository: ValidationErrorRepository,
	private val batchAuditLogRepository: BatchAuditLogRepository,
	private val userRepository: UserRepository,
	private val notificationService: NotificationService,
) {
	@Transactional
	fun requestConfirmation(
		tenantId: Long,
		clientId: Long?,
		batchId: Long,
		actorId: Long?,
		memo: String?,
	): BatchConfirmationRequestResponse {
		val batch = getBatchForScope(tenantId, clientId, batchId)
		if (batch.status != BatchStatus.READY_TO_CONFIRM) {
			throw invalidBatchStatus("READY_TO_CONFIRM 상태의 배치만 확정 요청할 수 있습니다.")
		}
		if (validationErrorRepository.existsByBatchIdAndSeverityAndResolvedYn(batchId, ValidationSeverity.ERROR, false)) {
			throw OmsException(ErrorCode.VALIDATION_ERROR_EXISTS, status = HttpStatus.BAD_REQUEST)
		}
		if (confirmationRequestRepository.existsByBatchIdAndStatusIn(batchId, listOf(BatchConfirmationRequestStatus.REQUESTED))) {
			throw invalidBatchStatus("이미 처리 대기 중인 확정 요청이 있습니다.")
		}
		notificationService.markBatchNotificationsHandled(
			tenantId = batch.tenantId,
			batchIds = listOfNotNull(batch.parentBatchId),
			eventTypes = setOf(
				com.company.oms.common.persistence.NotificationEventType.BATCH_CONFIRMATION_NEEDS_MORE_INFO,
				com.company.oms.common.persistence.NotificationEventType.BATCH_CONFIRMATION_REJECTED,
			),
		)

		val beforeStatus = batch.status
		val resolvedActorId = resolveActorId(actorId)
		val request = confirmationRequestRepository.save(
			BatchConfirmationRequestEntity(
				tenantId = batch.tenantId,
				clientId = batch.clientId,
				batchId = batchId,
				status = BatchConfirmationRequestStatus.REQUESTED,
				requestedBy = resolvedActorId,
				requestedAt = LocalDateTime.now(),
				requestMemo = memo,
			),
		)
		batch.status = BatchStatus.CONFIRMATION_REQUESTED
		audit(batch, "CONFIRMATION_REQUESTED", beforeStatus, BatchStatus.CONFIRMATION_REQUESTED, resolvedActorId, memo)
		notificationService.notifyBatchConfirmationRequested(batch, request.id ?: 0)

		return request.toResponse(batch)
	}

	@Transactional(readOnly = true)
	fun listRequests(
		tenantId: Long,
		clientId: Long?,
		status: BatchConfirmationRequestStatus?,
		page: Int,
		size: Int,
	): PageResponse<BatchConfirmationRequestResponse> {
		val pageable = PageRequest.of(
			page.coerceAtLeast(0),
			size.coerceIn(1, 200),
			Sort.by(Sort.Direction.DESC, "requestedAt").and(Sort.by(Sort.Direction.DESC, "id")),
		)
		val result = confirmationRequestRepository.findAll(
			confirmationRequestSpec(tenantId, clientId, status),
			pageable,
		)
		val batchesById = uploadBatchRepository.findAllById(result.content.map { it.batchId }).associateBy { it.id ?: 0 }
		return PageResponse(
			items = result.content.map { request ->
				request.toResponse(requireNotNull(batchesById[request.batchId]) { "Batch not found for confirmation request." })
			},
			page = result.number,
			size = result.size,
			totalElements = result.totalElements,
			totalPages = result.totalPages,
		)
	}

	@Transactional(readOnly = true)
	fun getRequest(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
	): BatchConfirmationRequestResponse {
		val request = getRequestForScope(tenantId, clientId, requestId)
		val batch = getBatchForScope(tenantId, clientId, request.batchId)
		return request.toResponse(batch)
	}

	@Transactional
	fun markNeedsMoreInfo(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
		actorId: Long?,
		comment: String?,
		supplementType: BatchSupplementRequestType?,
	): BatchConfirmationRequestResponse {
		val request = getRequestForScope(tenantId, clientId, requestId)
		val batch = getBatchForScope(tenantId, clientId, request.batchId)
		requireRequestPending(request)
		requireBatchConfirmationRequested(batch)

		val beforeStatus = batch.status
		val resolvedActorId = resolveActorId(actorId)
		val now = LocalDateTime.now()
		request.status = BatchConfirmationRequestStatus.NEEDS_MORE_INFO
		request.reviewedBy = resolvedActorId
		request.reviewedAt = now
		request.reviewComment = comment
		request.supplementType = supplementType ?: BatchSupplementRequestType.CLARIFICATION
		batch.status = BatchStatus.NEEDS_MORE_INFO
		audit(batch, "CONFIRMATION_NEEDS_MORE_INFO", beforeStatus, BatchStatus.NEEDS_MORE_INFO, resolvedActorId, comment)
		notificationService.markBatchConfirmationRequestNotificationHandled(batch.tenantId, request.id ?: 0)
		notificationService.notifyBatchConfirmationNeedsMoreInfo(batch, comment)

		return request.toResponse(batch)
	}

	@Transactional
	fun reject(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
		actorId: Long?,
		comment: String?,
	): BatchConfirmationRequestResponse {
		val request = getRequestForScope(tenantId, clientId, requestId)
		val batch = getBatchForScope(tenantId, clientId, request.batchId)
		requireRequestPending(request)
		requireBatchConfirmationRequested(batch)
		val normalizedComment = comment?.trim()?.takeIf { it.isNotBlank() }
			?: throw OmsException(
				errorCode = ErrorCode.INVALID_REQUEST,
				message = "반려 사유를 입력해 주세요.",
				status = HttpStatus.BAD_REQUEST,
			)

		val beforeStatus = batch.status
		val resolvedActorId = resolveActorId(actorId)
		val now = LocalDateTime.now()
		request.status = BatchConfirmationRequestStatus.REJECTED
		request.reviewedBy = resolvedActorId
		request.reviewedAt = now
		request.reviewComment = normalizedComment
		batch.status = BatchStatus.REJECTED
		audit(batch, "CONFIRMATION_REJECTED", beforeStatus, BatchStatus.REJECTED, resolvedActorId, normalizedComment)
		notificationService.markBatchConfirmationRequestNotificationHandled(batch.tenantId, request.id ?: 0)
		notificationService.notifyBatchConfirmationRejected(batch, normalizedComment)

		return request.toResponse(batch)
	}

	@Transactional
	fun approve(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
		actorId: Long?,
		comment: String?,
	): BatchConfirmationRequestResponse {
		val request = getRequestForScope(tenantId, clientId, requestId)
		val batch = getBatchForScope(tenantId, clientId, request.batchId)
		requireRequestPending(request)
		requireBatchConfirmationRequested(batch)
		if (validationErrorRepository.existsByBatchIdAndSeverityAndResolvedYn(batch.id ?: 0, ValidationSeverity.ERROR, false)) {
			throw OmsException(ErrorCode.VALIDATION_ERROR_EXISTS, status = HttpStatus.BAD_REQUEST)
		}

		val beforeStatus = batch.status
		val resolvedActorId = resolveActorId(actorId)
		val now = LocalDateTime.now()
		request.status = BatchConfirmationRequestStatus.APPROVED
		request.reviewedBy = resolvedActorId
		request.reviewedAt = now
		request.reviewComment = comment
		batch.status = BatchStatus.CONFIRMED
		batch.confirmedAt = now
		batch.confirmedBy = resolvedActorId
		audit(batch, "CONFIRMED", beforeStatus, BatchStatus.CONFIRMED, resolvedActorId, comment)
		markParentBatchSuperseded(batch, now, resolvedActorId)
		notificationService.markBatchConfirmationRequestNotificationHandled(batch.tenantId, request.id ?: 0)
		notificationService.markBatchNotificationsHandled(
			tenantId = batch.tenantId,
			batchIds = listOfNotNull(batch.id, batch.parentBatchId),
			eventTypes = setOf(
				com.company.oms.common.persistence.NotificationEventType.BATCH_CONFIRMATION_NEEDS_MORE_INFO,
				com.company.oms.common.persistence.NotificationEventType.BATCH_CONFIRMATION_REJECTED,
			),
		)
		notificationService.notifyBatchConfirmationApproved(batch)

		return request.toResponse(batch)
	}

	private fun getRequestForScope(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
	): BatchConfirmationRequestEntity =
		confirmationRequestRepository.findById(requestId)
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.orElseThrow {
				OmsException(ErrorCode.NOT_FOUND, message = "확정 요청을 찾을 수 없습니다.", status = HttpStatus.NOT_FOUND)
			}

	private fun getBatchForScope(
		tenantId: Long,
		clientId: Long?,
		batchId: Long,
	): UploadBatchEntity =
		uploadBatchRepository.findById(batchId)
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.orElseThrow {
				OmsException(ErrorCode.BATCH_NOT_FOUND, status = HttpStatus.NOT_FOUND)
			}

	private fun requireRequestPending(request: BatchConfirmationRequestEntity) {
		if (request.status != BatchConfirmationRequestStatus.REQUESTED) {
			throw invalidBatchStatus("처리 대기 중인 확정 요청만 변경할 수 있습니다.")
		}
	}

	private fun requireBatchConfirmationRequested(batch: UploadBatchEntity) {
		if (batch.status != BatchStatus.CONFIRMATION_REQUESTED) {
			throw invalidBatchStatus("CONFIRMATION_REQUESTED 상태의 배치만 확정 요청을 처리할 수 있습니다.")
		}
	}

	private fun invalidBatchStatus(message: String): OmsException =
		OmsException(ErrorCode.INVALID_BATCH_STATUS, message = message, status = HttpStatus.BAD_REQUEST)

	private fun markParentBatchSuperseded(
		batch: UploadBatchEntity,
		now: LocalDateTime,
		actorId: Long?,
	) {
		val parentBatchId = batch.parentBatchId ?: return
		val parentBatch = uploadBatchRepository.findById(parentBatchId)
			.filter { it.tenantId == batch.tenantId && it.clientId == batch.clientId }
			.orElse(null)
			?: return
		if (parentBatch.status in setOf(BatchStatus.CONFIRMED, BatchStatus.CANCELLED, BatchStatus.ROLLED_BACK)) {
			return
		}

		val beforeStatus = parentBatch.status
		parentBatch.status = BatchStatus.CANCELLED
		parentBatch.cancelledAt = now
		audit(parentBatch, "SUPERSEDED_BY_SUPPLEMENT", beforeStatus, BatchStatus.CANCELLED, actorId, "confirmed supplement batch ${batch.batchNo}")
	}

	private fun resolveActorId(actorId: Long?): Long? =
		actorId?.takeIf { userRepository.existsById(it) }

	private fun audit(
		batch: UploadBatchEntity,
		action: String,
		beforeStatus: BatchStatus?,
		afterStatus: BatchStatus?,
		actorId: Long?,
		message: String?,
	) {
		batchAuditLogRepository.save(
			BatchAuditLogEntity(
				tenantId = batch.tenantId,
				clientId = batch.clientId,
				batchId = batch.id,
				action = action,
				beforeStatus = beforeStatus,
				afterStatus = afterStatus,
				actorId = actorId,
				requestId = RequestContext.getRequestId(),
				message = message,
			),
		)
	}
}

private fun confirmationRequestSpec(
	tenantId: Long,
	clientId: Long?,
	status: BatchConfirmationRequestStatus?,
): Specification<BatchConfirmationRequestEntity> =
	Specification { root, _, criteriaBuilder ->
		val predicates = mutableListOf(criteriaBuilder.equal(root.get<Long>("tenantId"), tenantId))
		if (clientId != null) {
			predicates += criteriaBuilder.equal(root.get<Long>("clientId"), clientId)
		}
		if (status != null) {
			predicates += criteriaBuilder.equal(root.get<BatchConfirmationRequestStatus>("status"), status)
		}
		criteriaBuilder.and(*predicates.toTypedArray())
	}

private fun BatchConfirmationRequestEntity.toResponse(batch: UploadBatchEntity): BatchConfirmationRequestResponse =
	BatchConfirmationRequestResponse(
		id = id ?: 0,
		tenantId = tenantId,
		clientId = clientId,
		batchId = batchId,
		batchNo = batch.batchNo,
		batchStatus = batch.status,
		deliveryDate = batch.deliveryDate,
		errorCount = batch.errorCount,
		warningCount = batch.warningCount,
		infoCount = batch.infoCount,
		status = status,
		requestedBy = requestedBy,
		requestedAt = requestedAt,
		requestMemo = requestMemo,
		reviewedBy = reviewedBy,
		reviewedAt = reviewedAt,
		reviewComment = reviewComment,
		supplementType = supplementType,
	)
