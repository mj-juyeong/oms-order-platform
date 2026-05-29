package com.company.oms.auth

import java.time.LocalDateTime

data class ApiKeyResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long?,
	val name: String,
	val status: String,
	val allowedScope: Set<String>,
	val expiresAt: LocalDateTime?,
	val lastUsedAt: LocalDateTime?,
	val createdBy: Long?,
)

data class CreateApiKeyRequest(
	val tenantId: Long,
	val clientId: Long? = null,
	val name: String,
	val allowedScope: Set<String>,
	val expiresAt: LocalDateTime? = null,
)

data class CreateApiKeyResponse(
	val id: Long,
	val apiKey: String,
	val status: String,
)

data class UpdateApiKeyRequest(
	val name: String? = null,
	val status: String? = null,
	val allowedScope: Set<String>? = null,
	val expiresAt: LocalDateTime? = null,
)

data class RevokeApiKeyRequest(
	val reason: String? = null,
)

data class ApiKeyMutationResponse(
	val id: Long,
	val status: String,
	val updated: Boolean = true,
)
