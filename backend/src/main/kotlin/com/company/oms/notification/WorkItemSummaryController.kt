package com.company.oms.notification

import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
import org.springframework.context.annotation.Profile
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/work-items")
@Profile("local")
class WorkItemSummaryController(
	private val accessScopeService: AccessScopeService,
	private val workItemSummaryService: WorkItemSummaryService,
) {
	@GetMapping("/summary")
	fun summarize(
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
	): WorkItemSummaryResponse {
		val currentUser = accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return workItemSummaryService.summarize(
			currentUser = currentUser,
			tenantId = scope.tenantId,
			clientId = scope.clientId,
		)
	}
}
