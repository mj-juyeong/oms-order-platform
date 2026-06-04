package com.company.oms.auth

import com.company.oms.common.persistence.ApiKeyRequestStatus
import java.time.LocalDateTime

data class ApiKeyRequestCreateRequest(
	val tenantId: Long? = null,
	val clientId: Long? = null,
	val scopeType: ApiKeyScopeType = ApiKeyScopeType.TENANT,
	val name: String,
	val purpose: String,
	val systemName: String,
	val contactName: String? = null,
	val contactEmail: String? = null,
	val contactPhone: String? = null,
	val allowedScope: Set<String>,
	val requestedExpiresAt: LocalDateTime? = null,
)

data class ApiKeyRequestReviewRequest(
	val comment: String? = null,
)

data class ApiKeyRequestResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long?,
	val scopeType: ApiKeyScopeType,
	val clientName: String?,
	val name: String,
	val purpose: String,
	val systemName: String,
	val contactName: String?,
	val contactEmail: String?,
	val contactPhone: String?,
	val allowedScope: Set<String>,
	val requestedExpiresAt: LocalDateTime?,
	val status: ApiKeyRequestStatus,
	val requestedBy: Long?,
	val requestedAt: LocalDateTime,
	val reviewedBy: Long?,
	val reviewedAt: LocalDateTime?,
	val reviewComment: String?,
	val issuedApiKeyId: Long?,
	val issuedAt: LocalDateTime?,
	val keyRevealAvailable: Boolean,
	val keyRevealedAt: LocalDateTime?,
)

data class ApiKeyRequestApprovalResponse(
	val request: ApiKeyRequestResponse,
)

data class ApiKeyRequestRevealResponse(
	val requestId: Long,
	val apiKeyId: Long,
	val apiKey: String,
	val revealedAt: LocalDateTime,
)
