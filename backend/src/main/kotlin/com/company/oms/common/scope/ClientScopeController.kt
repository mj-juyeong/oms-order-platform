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
@RequestMapping("/api/v1/clients")
@Profile("local")
class ClientScopeController(
	private val clientScopeService: ClientScopeService,
) {

	@GetMapping
	fun listClients(
		@RequestParam tenantId: Long,
	): List<ClientSummaryResponse> =
		clientScopeService.listClients(tenantId)

	@GetMapping("/resolve-candidates")
	fun resolveCandidates(
		@RequestParam tenantId: Long,
		@RequestParam sourceText: String,
		@RequestParam(defaultValue = "5") limit: Int,
	): List<ClientResolveCandidateResponse> =
		clientScopeService.resolveCandidates(
			tenantId = tenantId,
			sourceText = sourceText,
			limit = limit,
		)

	@PostMapping
	fun createClient(
		@RequestBody request: CreateClientRequest,
	): ClientMutationResponse =
		clientScopeService.createClient(request)

	@PatchMapping("/{clientId}")
	fun updateClient(
		@PathVariable clientId: Long,
		@RequestParam tenantId: Long,
		@RequestBody request: UpdateClientRequest,
	): ClientMutationResponse =
		clientScopeService.updateClient(
			tenantId = tenantId,
			clientId = clientId,
			request = request,
		)
}
