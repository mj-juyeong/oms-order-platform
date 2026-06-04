package com.company.oms.auth

import com.company.oms.common.persistence.ApiKeyRequestStatus
import com.company.oms.common.response.PageResponse
import org.springframework.context.annotation.Profile
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/api-key-requests")
@Profile("local")
class ApiKeyRequestController(
	private val accessScopeService: AccessScopeService,
	private val service: ApiKeyRequestService,
) {
	@PostMapping
	fun createRequest(
		@RequestBody request: ApiKeyRequestCreateRequest,
	): ApiKeyRequestResponse {
		val currentUser = accessScopeService.requireTenantOperator()
		val scope =
			when (request.scopeType) {
				ApiKeyScopeType.TENANT ->
					ResolvedAccessScope(
						tenantId = accessScopeService.resolveTenantId(request.tenantId),
						clientId = null,
						isAllClients = true,
						supportMode = false,
						userScopeType = currentUser.userScopeType!!,
					)
				ApiKeyScopeType.CLIENT -> accessScopeService.resolveRequiredClientScope(request.tenantId, request.clientId)
			}
		return service.createRequest(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			scopeType = request.scopeType,
			request = request,
			actorId = currentUser.userId,
		)
	}

	@GetMapping
	fun listRequests(
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam(required = false) status: ApiKeyRequestStatus?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ApiKeyRequestResponse> {
		accessScopeService.requireTenantOperator()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return service.listRequests(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			status = status,
			page = page,
			size = size,
		)
	}

	@PostMapping("/{requestId}/approve")
	fun approve(
		@PathVariable requestId: Long,
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestBody(required = false) request: ApiKeyRequestReviewRequest?,
	): ApiKeyRequestResponse {
		val currentUser = accessScopeService.requireTenantAdmin()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return service.approve(scope.tenantId, scope.clientId, requestId, request, currentUser.userId)
	}

	@PostMapping("/{requestId}/reject")
	fun reject(
		@PathVariable requestId: Long,
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestBody(required = false) request: ApiKeyRequestReviewRequest?,
	): ApiKeyRequestResponse {
		val currentUser = accessScopeService.requireTenantAdmin()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return service.reject(scope.tenantId, scope.clientId, requestId, request, currentUser.userId)
	}

	@PostMapping("/{requestId}/cancel")
	fun cancel(
		@PathVariable requestId: Long,
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
	): ApiKeyRequestResponse {
		val currentUser = accessScopeService.requireTenantOperator()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return service.cancel(scope.tenantId, scope.clientId, requestId, currentUser)
	}

	@PostMapping("/{requestId}/reveal-issued-key")
	fun revealIssuedKey(
		@PathVariable requestId: Long,
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
	): ApiKeyRequestRevealResponse {
		val currentUser = accessScopeService.requireTenantOperator()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return service.revealIssuedApiKey(scope.tenantId, scope.clientId, requestId, currentUser)
	}
}
