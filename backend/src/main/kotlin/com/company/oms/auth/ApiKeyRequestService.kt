package com.company.oms.auth

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.ApiKeyRequestStatus
import com.company.oms.common.response.PageResponse
import com.company.oms.common.scope.ClientRepository
import com.company.oms.notification.NotificationService
import org.springframework.context.annotation.Profile
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

@Service
@Profile("local")
class ApiKeyRequestService(
	private val repository: ApiKeyRequestRepository,
	private val eventRepository: ApiKeyRequestEventRepository,
	private val clientRepository: ClientRepository,
	private val apiKeyService: ApiKeyService,
	private val notificationService: NotificationService,
) {
	private val defaultValidDays = 90L

	@Transactional
	fun createRequest(
		tenantId: Long,
		clientId: Long?,
		scopeType: ApiKeyScopeType,
		request: ApiKeyRequestCreateRequest,
		actorId: Long?,
	): ApiKeyRequestResponse {
		val entity =
			repository.save(
				ApiKeyRequestEntity(
					tenantId = tenantId,
					clientId = clientId,
					scopeType = scopeType,
					name = requiredText(request.name, "API Key 이름을 입력해 주세요.", 100),
					purpose = requiredText(request.purpose, "사용 목적을 입력해 주세요.", 500),
					systemName = requiredText(request.systemName, "사용 시스템명을 입력해 주세요.", 100),
					contactName = optionalText(request.contactName, 100),
					contactEmail = optionalText(request.contactEmail, 255),
					contactPhone = optionalText(request.contactPhone, 50),
					allowedScope = scopesToJson(validateScopes(request.allowedScope)),
					requestedExpiresAt = validateRequestedExpiresAt(request.requestedExpiresAt),
					status = ApiKeyRequestStatus.REQUESTED,
					requestedBy = actorId,
					requestedAt = LocalDateTime.now(),
				),
		)
		recordEvent(entity, "REQUESTED", actorId, "API Key 발급 요청을 등록했습니다.", null)
		notificationService.notifyApiKeyRequested(entity)
		return entity.toResponse(clientName(entity.clientId))
	}

	@Transactional(readOnly = true)
	fun listRequests(
		tenantId: Long,
		clientId: Long?,
		status: ApiKeyRequestStatus?,
		page: Int,
		size: Int,
	): PageResponse<ApiKeyRequestResponse> {
		val pageable =
			PageRequest.of(
				page.coerceAtLeast(0),
				size.coerceIn(1, 200),
				Sort.by(Sort.Direction.DESC, "requestedAt").and(Sort.by(Sort.Direction.DESC, "id")),
			)
		val result = repository.findAll(requestSpec(tenantId, clientId, status), pageable)
		return PageResponse(
			items = result.content.map { it.toResponse(clientName(it.clientId)) },
			page = result.number,
			size = result.size,
			totalElements = result.totalElements,
			totalPages = result.totalPages,
		)
	}

	@Transactional
	fun approve(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
		review: ApiKeyRequestReviewRequest?,
		actorId: Long?,
	): ApiKeyRequestResponse {
		val entity = requestForScope(tenantId, clientId, requestId)
		if (entity.status != ApiKeyRequestStatus.REQUESTED) {
			throw invalidRequest("요청 대기 상태의 API Key 요청만 승인할 수 있습니다.")
		}

		val expiresAt = entity.requestedExpiresAt ?: LocalDate.now().plusDays(defaultValidDays).atTime(LocalTime.MAX.withNano(0))
		val issuedApiKey =
			apiKeyService.issueApiKey(
				tenantId = entity.tenantId,
				clientId = entity.clientId,
				scopeType = entity.scopeType,
				name = entity.name,
				allowedScope = apiKeyService.parseScopes(entity.allowedScope),
				expiresAt = expiresAt,
				createdBy = actorId,
			)

		entity.status = ApiKeyRequestStatus.ISSUED
		entity.reviewedBy = actorId
		entity.reviewedAt = LocalDateTime.now()
		entity.reviewComment = optionalText(review?.comment, 2000) ?: "API Key 요청을 승인했습니다."
		entity.issuedApiKeyId = issuedApiKey.id
		entity.issuedAt = LocalDateTime.now()
		entity.issuedApiKeySecret = issuedApiKey.apiKey
		entity.issuedApiKeyRevealedAt = null
		val saved = repository.save(entity)
		recordEvent(saved, "ISSUED", actorId, saved.reviewComment, issuedApiKey.id)
		notificationService.notifyApiKeyIssued(saved)
		return saved.toResponse(clientName(saved.clientId))
	}

	@Transactional
	fun reject(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
		review: ApiKeyRequestReviewRequest?,
		actorId: Long?,
	): ApiKeyRequestResponse {
		val entity = requestForScope(tenantId, clientId, requestId)
		if (entity.status != ApiKeyRequestStatus.REQUESTED) {
			throw invalidRequest("요청 대기 상태의 API Key 요청만 반려할 수 있습니다.")
		}
		val comment = optionalText(review?.comment, 2000)
			?: throw invalidRequest("반려 사유를 입력해 주세요.")
		entity.status = ApiKeyRequestStatus.REJECTED
		entity.reviewedBy = actorId
		entity.reviewedAt = LocalDateTime.now()
		entity.reviewComment = comment
		val saved = repository.save(entity)
		recordEvent(saved, "REJECTED", actorId, comment, null)
		notificationService.notifyApiKeyRejected(saved, comment)
		return saved.toResponse(clientName(saved.clientId))
	}

	@Transactional
	fun cancel(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
		currentUser: CurrentUser,
	): ApiKeyRequestResponse {
		val entity = requestForScope(tenantId, clientId, requestId)
		validateCancelPermission(entity, currentUser)
		if (entity.status != ApiKeyRequestStatus.REQUESTED) {
			throw invalidRequest("요청 대기 상태의 API Key 요청만 취소할 수 있습니다.")
		}
		entity.status = ApiKeyRequestStatus.CANCELED
		entity.reviewedBy = currentUser.userId
		entity.reviewedAt = LocalDateTime.now()
		entity.reviewComment = "요청자가 API Key 발급 요청을 취소했습니다."
		val saved = repository.save(entity)
		recordEvent(saved, "CANCELED", currentUser.userId, saved.reviewComment, null)
		return saved.toResponse(clientName(saved.clientId))
	}

	@Transactional
	fun revealIssuedApiKey(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
		currentUser: CurrentUser,
	): ApiKeyRequestRevealResponse {
		val entity = requestForScope(tenantId, clientId, requestId)
		validateRevealPermission(entity, currentUser)
		if (entity.status != ApiKeyRequestStatus.ISSUED || entity.issuedApiKeyId == null) {
			throw invalidRequest("승인 완료된 API Key 요청만 열람할 수 있습니다.")
		}
		val secret =
			entity.issuedApiKeySecret
				?.takeIf { it.isNotBlank() }
				?: throw invalidRequest(
					if (entity.issuedApiKeyRevealedAt != null) {
						"이미 1회 열람이 완료된 API Key입니다."
					} else {
						"API Key 원문이 저장되어 있지 않아 조회할 수 없습니다. 새 Key를 발급해 주세요."
					},
				)
		val revealedAt = LocalDateTime.now()
		entity.issuedApiKeySecret = null
		entity.issuedApiKeyRevealedAt = revealedAt
		repository.save(entity)
		recordEvent(entity, "REVEALED", currentUser.userId, "API Key 원문 1회 열람", entity.issuedApiKeyId)
		return ApiKeyRequestRevealResponse(
			requestId = requireNotNull(entity.id),
			apiKeyId = requireNotNull(entity.issuedApiKeyId),
			apiKey = secret,
			revealedAt = revealedAt,
		)
	}

	private fun requestForScope(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
	): ApiKeyRequestEntity =
		repository.findById(requestId)
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.orElseThrow {
				OmsException(ErrorCode.NOT_FOUND, message = "API Key 요청을 찾을 수 없습니다.", status = HttpStatus.NOT_FOUND)
			}

	private fun recordEvent(
		request: ApiKeyRequestEntity,
		eventType: String,
		actorId: Long?,
		comment: String?,
		apiKeyId: Long?,
	) {
		eventRepository.save(
			ApiKeyRequestEventEntity(
				requestId = requireNotNull(request.id),
				tenantId = request.tenantId,
				clientId = request.clientId,
				eventType = eventType,
				actorId = actorId,
				comment = comment,
				apiKeyId = apiKeyId,
				occurredAt = LocalDateTime.now(),
			),
		)
	}

	private fun validateScopes(scopes: Set<String>): Set<String> {
		val normalized = scopes.map { it.trim() }.filter { it.isNotBlank() }.toSet()
		if (normalized.isEmpty() || normalized.any { it !in setOf("WOS_SCAN_READ", "PL_READ") }) {
			throw OmsException(ErrorCode.INVALID_SCOPE)
		}
		return normalized
	}

	private fun validateRequestedExpiresAt(expiresAt: LocalDateTime?): LocalDateTime? {
		if (expiresAt != null && !expiresAt.isAfter(LocalDateTime.now())) {
			throw OmsException(ErrorCode.INVALID_EXPIRES_AT)
		}
		return expiresAt
	}

	private fun requiredText(
		value: String?,
		message: String,
		maxLength: Int,
	): String =
		optionalText(value, maxLength) ?: throw invalidRequest(message)

	private fun optionalText(
		value: String?,
		maxLength: Int,
	): String? =
		value?.trim()?.takeIf { it.isNotBlank() }?.take(maxLength)

	private fun invalidRequest(message: String): OmsException =
		OmsException(ErrorCode.INVALID_REQUEST, message = message, status = HttpStatus.BAD_REQUEST)

	private fun validateCancelPermission(
		request: ApiKeyRequestEntity,
		currentUser: CurrentUser,
	) {
		if (UserRole.ADMIN in currentUser.roles) {
			return
		}
		if (currentUser.userId != null && currentUser.userId == request.requestedBy) {
			return
		}
		throw OmsException(ErrorCode.FORBIDDEN, status = HttpStatus.FORBIDDEN)
	}

	private fun validateRevealPermission(
		request: ApiKeyRequestEntity,
		currentUser: CurrentUser,
	) {
		if (currentUser.userId != null && currentUser.userId == request.requestedBy) {
			return
		}
		throw OmsException(ErrorCode.FORBIDDEN, status = HttpStatus.FORBIDDEN)
	}

	private fun scopesToJson(scopes: Set<String>): String =
		scopes.joinToString(prefix = "[", postfix = "]") { "\"$it\"" }

	private fun clientName(clientId: Long?): String? =
		clientId?.let { clientRepository.findById(it).orElse(null)?.name }

	private fun ApiKeyRequestEntity.toResponse(clientName: String?): ApiKeyRequestResponse =
		ApiKeyRequestResponse(
			id = requireNotNull(id),
			tenantId = tenantId,
			clientId = clientId,
			scopeType = scopeType,
			clientName = clientName,
			name = name,
			purpose = purpose,
			systemName = systemName,
			contactName = contactName,
			contactEmail = contactEmail,
			contactPhone = contactPhone,
			allowedScope = apiKeyService.parseScopes(allowedScope),
			requestedExpiresAt = requestedExpiresAt,
			status = status,
			requestedBy = requestedBy,
			requestedAt = requestedAt,
			reviewedBy = reviewedBy,
			reviewedAt = reviewedAt,
			reviewComment = reviewComment,
			issuedApiKeyId = issuedApiKeyId,
			issuedAt = issuedAt,
			keyRevealAvailable = !issuedApiKeySecret.isNullOrBlank(),
			keyRevealedAt = issuedApiKeyRevealedAt,
		)
}

private fun requestSpec(
	tenantId: Long,
	clientId: Long?,
	status: ApiKeyRequestStatus?,
): Specification<ApiKeyRequestEntity> =
	Specification { root, _, criteriaBuilder ->
		val predicates = mutableListOf(criteriaBuilder.equal(root.get<Long>("tenantId"), tenantId))
		if (clientId != null) {
			predicates += criteriaBuilder.equal(root.get<Long>("clientId"), clientId)
		}
		if (status != null) {
			predicates += criteriaBuilder.equal(root.get<ApiKeyRequestStatus>("status"), status)
		}
		criteriaBuilder.and(*predicates.toTypedArray())
	}
