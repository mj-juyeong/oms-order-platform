package com.company.oms.common.scope

import org.springframework.context.annotation.Profile
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/tenants")
@Profile("local")
class TenantManagementController(
	private val tenantManagementService: TenantManagementService,
) {

	@GetMapping
	fun listTenants(
		@RequestParam(required = false) status: String?,
	): List<TenantSummaryResponse> =
		tenantManagementService.listTenants(status)

	@PostMapping
	fun createTenant(
		@RequestBody request: CreateTenantRequest,
	): TenantMutationResponse =
		tenantManagementService.createTenant(request)

	@PatchMapping("/{tenantId}")
	fun updateTenant(
		@PathVariable tenantId: Long,
		@RequestBody request: UpdateTenantRequest,
	): TenantMutationResponse =
		tenantManagementService.updateTenant(tenantId, request)
}

