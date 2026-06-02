package com.company.oms.batch

import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
import com.company.oms.common.persistence.BatchConfirmationRequestStatus
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
@RequestMapping("/api/v1/batch-confirmation-requests")
@Profile("local")
class BatchConfirmationRequestController(
	private val accessScopeService: AccessScopeService,
	private val confirmationRequestService: BatchConfirmationRequestService,
) {
	@GetMapping
	fun listRequests(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam(required = false) status: BatchConfirmationRequestStatus?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<BatchConfirmationRequestResponse> {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return confirmationRequestService.listRequests(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			status = status,
			page = page,
			size = size,
		)
	}

	@GetMapping("/{requestId}")
	fun getRequest(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable requestId: Long,
	): BatchConfirmationRequestResponse {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return confirmationRequestService.getRequest(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			requestId = requestId,
		)
	}

	@PostMapping("/{requestId}/approve")
	fun approve(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable requestId: Long,
		@RequestBody(required = false) request: BatchConfirmationReviewRequest?,
	): BatchConfirmationRequestResponse {
		val currentUser = accessScopeService.requireTenantOperator()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return confirmationRequestService.approve(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			requestId = requestId,
			actorId = request?.actorId ?: currentUser.userId,
			comment = request?.comment,
		)
	}

	@PostMapping("/{requestId}/reject")
	fun reject(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable requestId: Long,
		@RequestBody(required = false) request: BatchConfirmationReviewRequest?,
	): BatchConfirmationRequestResponse {
		val currentUser = accessScopeService.requireTenantOperator()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return confirmationRequestService.reject(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			requestId = requestId,
			actorId = request?.actorId ?: currentUser.userId,
			comment = request?.comment,
		)
	}

	@PostMapping("/{requestId}/needs-more-info")
	fun needsMoreInfo(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable requestId: Long,
		@RequestBody(required = false) request: BatchConfirmationReviewRequest?,
	): BatchConfirmationRequestResponse {
		val currentUser = accessScopeService.requireTenantOperator()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return confirmationRequestService.markNeedsMoreInfo(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			requestId = requestId,
			actorId = request?.actorId ?: currentUser.userId,
			comment = request?.comment,
			supplementType = request?.supplementType,
		)
	}
}
