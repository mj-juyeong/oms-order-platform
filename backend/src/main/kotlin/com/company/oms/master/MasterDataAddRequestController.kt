package com.company.oms.master

import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
import com.company.oms.common.persistence.MasterDataAddRequestStatus
import com.company.oms.common.persistence.MasterDataAddRequestType
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
@RequestMapping("/api/v1/master-data-add-requests")
@Profile("local")
class MasterDataAddRequestController(
	private val accessScopeService: AccessScopeService,
	private val service: MasterDataAddRequestService,
) {
	@PostMapping
	fun createRequest(
		@RequestBody request: MasterDataAddRequestCreateRequest,
	): MasterDataAddRequestResponse {
		val currentUser = accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)
		val scope = accessScopeService.resolveRequiredClientScope(request.tenantId, request.clientId)
		return service.createRequest(
			tenantId = scope.tenantId,
			clientId = requireNotNull(scope.clientId),
			request = request,
			actorId = currentUser.userId,
		)
	}

	@GetMapping
	fun listRequests(
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam(required = false) status: MasterDataAddRequestStatus?,
		@RequestParam(required = false) requestType: MasterDataAddRequestType?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<MasterDataAddRequestResponse> {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return service.listRequests(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			status = status,
			requestType = requestType,
			page = page,
			size = size,
		)
	}

	@GetMapping("/{requestId}")
	fun getRequest(
		@PathVariable requestId: Long,
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
	): MasterDataAddRequestResponse {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return service.getRequest(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			requestId = requestId,
		)
	}

	@PostMapping("/{requestId}/approve")
	fun approve(
		@PathVariable requestId: Long,
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestBody(required = false) request: MasterDataAddRequestReviewRequest?,
	): MasterDataAddRequestResponse {
		val currentUser = accessScopeService.requireTenantOperator()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return service.approve(scope.tenantId, scope.clientId, requestId, request, currentUser.userId)
	}

	@PostMapping("/{requestId}/apply")
	fun apply(
		@PathVariable requestId: Long,
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestBody(required = false) request: MasterDataAddRequestReviewRequest?,
	): MasterDataAddRequestResponse {
		val currentUser = accessScopeService.requireTenantOperator()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return service.markApplied(scope.tenantId, scope.clientId, requestId, request, currentUser.userId)
	}

	@PostMapping("/{requestId}/needs-more-info")
	fun needsMoreInfo(
		@PathVariable requestId: Long,
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestBody(required = false) request: MasterDataAddRequestReviewRequest?,
	): MasterDataAddRequestResponse {
		val currentUser = accessScopeService.requireTenantOperator()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return service.markNeedsMoreInfo(scope.tenantId, scope.clientId, requestId, request, currentUser.userId)
	}

	@PostMapping("/{requestId}/reject")
	fun reject(
		@PathVariable requestId: Long,
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestBody(required = false) request: MasterDataAddRequestReviewRequest?,
	): MasterDataAddRequestResponse {
		val currentUser = accessScopeService.requireTenantOperator()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return service.reject(scope.tenantId, scope.clientId, requestId, request, currentUser.userId)
	}
}
