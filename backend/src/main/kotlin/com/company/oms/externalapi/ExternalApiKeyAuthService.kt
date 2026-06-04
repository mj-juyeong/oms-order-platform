package com.company.oms.externalapi

import com.company.oms.auth.ApiKeyEntity
import com.company.oms.auth.ApiKeyHash
import com.company.oms.auth.ApiKeyRepository
import com.company.oms.auth.ApiKeyScopeType
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import jakarta.servlet.http.HttpServletRequest
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Profile("local")
class ExternalApiKeyAuthService(
	private val apiKeyRepository: ApiKeyRepository,
) {

	@Transactional
	fun requireApiKey(
		request: HttpServletRequest,
		requiredScope: String,
	): ApiKeyEntity {
		val rawApiKey =
			request.getHeader("X-Api-Key")
				?: throw OmsException(ErrorCode.INVALID_API_KEY, status = HttpStatus.UNAUTHORIZED)
		val apiKey =
			apiKeyRepository.findByKeyHash(ApiKeyHash.sha256Hex(rawApiKey))
				?: throw OmsException(ErrorCode.INVALID_API_KEY, status = HttpStatus.UNAUTHORIZED)

		if (apiKey.status != "ACTIVE") {
			throw OmsException(ErrorCode.INVALID_API_KEY, status = HttpStatus.UNAUTHORIZED)
		}
		if (apiKey.expiresAt != null && !apiKey.expiresAt!!.isAfter(LocalDateTime.now())) {
			throw OmsException(ErrorCode.INVALID_API_KEY, status = HttpStatus.UNAUTHORIZED)
		}
		if (apiKey.scopeType == ApiKeyScopeType.CLIENT && apiKey.clientId == null) {
			throw OmsException(
				errorCode = ErrorCode.FORBIDDEN,
				message = "1차 MVP 외부 API는 고객사 단위 API Key만 사용할 수 있습니다.",
				status = HttpStatus.FORBIDDEN,
			)
		}
		if (requiredScope !in parseScopes(apiKey.allowedScope)) {
			throw OmsException(ErrorCode.FORBIDDEN, status = HttpStatus.FORBIDDEN)
		}

		apiKey.lastUsedAt = LocalDateTime.now()
		return apiKey
	}

	private fun parseScopes(value: String?): Set<String> =
		value
			?.removePrefix("[")
			?.removeSuffix("]")
			?.split(",")
			?.map { it.trim().trim('"') }
			?.filter { it.isNotBlank() }
			?.toSet()
			?: emptySet()
}
