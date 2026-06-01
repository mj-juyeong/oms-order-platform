package com.company.oms.common.scope

data class ClientSummaryResponse(
	val id: Long,
	val tenantId: Long,
	val code: String,
	val name: String,
	val externalCode: String?,
	val status: String,
)

data class ClientResolveCandidateResponse(
	val client: ClientSummaryResponse,
	val score: Int,
	val matchedText: String,
	val matchType: String,
	val reason: String,
)

data class CreateClientRequest(
	val tenantId: Long? = null,
	val name: String,
	val code: String? = null,
	val externalCode: String? = null,
)

data class UpdateClientRequest(
	val code: String? = null,
	val name: String? = null,
	val externalCode: String? = null,
	val status: String? = null,
)

data class ClientMutationResponse(
	val id: Long,
	val updated: Boolean = true,
)
