package com.company.oms.auth

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import com.company.oms.common.scope.ClientRepository
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Profile("local")
class ApiKeyService(
	private val accessScopeService: AccessScopeService,
	private val apiKeyRepository: ApiKeyRepository,
	private val clientRepository: ClientRepository,
) {
	private val allowedScopes = setOf("WOS_SCAN_READ", "PL_READ")

	@Transactional(readOnly = true)
	fun listApiKeys(
		tenantId: Long,
		clientId: Long?,
		status: String?,
		page: Int,
		size: Int,
	): PageResponse<ApiKeyResponse> {
		accessScopeService.requireTenantAdmin()
		val resolvedTenantId = accessScopeService.requireTenantAccess(tenantId)
		if (clientId != null) {
			accessScopeService.requireClientAccess(resolvedTenantId, clientId)
		}
		val rows =
			if (status == null) {
				apiKeyRepository.findAllByTenantId(resolvedTenantId)
			} else {
				apiKeyRepository.findAllByTenantIdAndStatus(resolvedTenantId, status)
			}
		return rows
			.filter { clientId == null || it.clientId == clientId }
			.sortedBy { it.id ?: 0 }
			.map { it.toResponse(clientName(it.clientId)) }
			.toPageResponse(page, size)
	}

	@Transactional
	fun createApiKey(request: CreateApiKeyRequest): CreateApiKeyResponse {
		val currentUser = accessScopeService.requireTenantAdmin()
		if (request.scopeType == ApiKeyScopeType.CLIENT && request.clientId == null) {
			throw OmsException(
				errorCode = ErrorCode.INVALID_REQUEST,
				message = "1차 MVP의 외부 API Key는 고객사(clientId) 단위로 발급해야 합니다.",
			)
		}
		if (request.scopeType == ApiKeyScopeType.TENANT && request.clientId != null) {
			throw OmsException(
				errorCode = ErrorCode.INVALID_REQUEST,
				message = "TENANT API Key must not include clientId.",
			)
		}
		val resolvedTenantId = accessScopeService.requireTenantAccess(request.tenantId)
		if (request.scopeType == ApiKeyScopeType.CLIENT) {
			accessScopeService.requireClientAccess(resolvedTenantId, requireNotNull(request.clientId))
		}
		return issueApiKey(
			tenantId = resolvedTenantId,
			clientId = request.clientId,
			scopeType = request.scopeType,
			name = request.name,
			allowedScope = request.allowedScope,
			expiresAt = request.expiresAt,
			createdBy = currentUser.userId,
		)
	}

	@Transactional
	fun issueApiKey(
		tenantId: Long,
		clientId: Long?,
		scopeType: ApiKeyScopeType,
		name: String,
		allowedScope: Set<String>,
		expiresAt: LocalDateTime?,
		createdBy: Long?,
	): CreateApiKeyResponse {
		val trimmedName = name.trim().takeIf { it.isNotBlank() }
			?: throw OmsException(ErrorCode.INVALID_REQUEST, message = "API Key 이름을 입력해 주세요.")
		validateScopes(allowedScope)
		validateExpiresAt(expiresAt)

		val plainKey = ApiKeyHash.generatePlainKey()
		val entity =
			apiKeyRepository.save(
				ApiKeyEntity(
					tenantId = tenantId,
					clientId = clientId,
					scopeType = scopeType,
					name = trimmedName,
					keyHash = ApiKeyHash.sha256Hex(plainKey),
					status = "ACTIVE",
					allowedScope = scopesToJson(allowedScope),
					expiresAt = expiresAt,
					createdBy = createdBy,
				),
			)
		return CreateApiKeyResponse(
			id = requireNotNull(entity.id),
			apiKey = plainKey,
			status = entity.status,
		)
	}

	@Transactional
	fun updateApiKey(
		apiKeyId: Long,
		request: UpdateApiKeyRequest,
	): ApiKeyMutationResponse {
		val currentUser = accessScopeService.requireTenantAdmin()
		val apiKey = findApiKey(apiKeyId)
		if (apiKey.tenantId != currentUser.tenantId) {
			throw OmsException(ErrorCode.FORBIDDEN, status = HttpStatus.FORBIDDEN)
		}
		request.name?.let { apiKey.name = it }
		request.status?.let { apiKey.status = it }
		request.allowedScope?.let {
			validateScopes(it)
			apiKey.allowedScope = scopesToJson(it)
		}
		request.expiresAt?.let {
			validateExpiresAt(it)
			apiKey.expiresAt = it
		}
		return ApiKeyMutationResponse(id = apiKeyId, status = apiKey.status)
	}

	@Transactional
	fun revokeApiKey(
		apiKeyId: Long,
		request: RevokeApiKeyRequest,
	): ApiKeyMutationResponse {
		val currentUser = accessScopeService.requireTenantAdmin()
		val apiKey = findApiKey(apiKeyId)
		if (apiKey.tenantId != currentUser.tenantId) {
			throw OmsException(ErrorCode.FORBIDDEN, status = HttpStatus.FORBIDDEN)
		}
		apiKey.status = "REVOKED"
		return ApiKeyMutationResponse(id = apiKeyId, status = apiKey.status)
	}

	private fun findApiKey(apiKeyId: Long): ApiKeyEntity =
		apiKeyRepository.findById(apiKeyId).orElseThrow {
			OmsException(ErrorCode.API_KEY_NOT_FOUND, status = HttpStatus.NOT_FOUND)
		}

	private fun validateScopes(scopes: Set<String>) {
		if (scopes.isEmpty() || scopes.any { it !in allowedScopes }) {
			throw OmsException(ErrorCode.INVALID_SCOPE)
		}
	}

	private fun validateExpiresAt(expiresAt: LocalDateTime?) {
		if (expiresAt != null && !expiresAt.isAfter(LocalDateTime.now())) {
			throw OmsException(ErrorCode.INVALID_EXPIRES_AT)
		}
	}

	private fun scopesToJson(scopes: Set<String>): String =
		scopes.joinToString(prefix = "[", postfix = "]") { "\"$it\"" }

	private fun clientName(clientId: Long?): String? =
		clientId?.let { id -> clientRepository.findById(id).orElse(null)?.name }

	private fun ApiKeyEntity.toResponse(clientName: String?): ApiKeyResponse =
		ApiKeyResponse(
			id = requireNotNull(id),
			tenantId = tenantId,
			clientId = clientId,
			scopeType = scopeType,
			clientName = clientName,
			name = name,
			status = status,
			allowedScope = parseScopes(allowedScope),
			expiresAt = expiresAt,
			lastUsedAt = lastUsedAt,
			createdBy = createdBy,
		)

	fun parseScopes(value: String?): Set<String> =
		value
			?.removePrefix("[")
			?.removeSuffix("]")
			?.split(",")
			?.map { it.trim().trim('"') }
			?.filter { it.isNotBlank() }
			?.toSet()
			?: emptySet()
}
