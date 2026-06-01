package com.company.oms.common.scope

data class TenantSummaryResponse(
	val id: Long,
	val code: String,
	val name: String,
	val status: String,
)

data class CreateTenantRequest(
	val name: String,
	val code: String? = null,
)

data class UpdateTenantRequest(
	val code: String? = null,
	val name: String? = null,
	val status: String? = null,
)

data class TenantMutationResponse(
	val id: Long,
	val updated: Boolean = true,
)
