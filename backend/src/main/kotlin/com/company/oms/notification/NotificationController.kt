package com.company.oms.notification

import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
import com.company.oms.common.persistence.NotificationEventType
import com.company.oms.common.persistence.NotificationSeverity
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
@RequestMapping("/api/v1/notifications")
@Profile("local")
class NotificationController(
	private val accessScopeService: AccessScopeService,
	private val notificationService: NotificationService,
) {
	@GetMapping
	fun listNotifications(
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam(required = false) severity: NotificationSeverity?,
		@RequestParam(required = false) eventType: NotificationEventType?,
		@RequestParam(defaultValue = "UNREAD") readStatus: NotificationReadStatus,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<NotificationResponse> {
		val currentUser = accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return notificationService.listNotifications(
			currentUser = currentUser,
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			severity = severity,
			eventType = eventType,
			readStatus = readStatus,
			page = page,
			size = size,
		)
	}

	@GetMapping("/unread-count")
	fun countUnread(
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
	): NotificationUnreadCountResponse {
		val currentUser = accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return notificationService.countUnread(
			currentUser = currentUser,
			tenantId = scope.tenantId,
			clientId = scope.clientId,
		)
	}

	@PostMapping("/{notificationId}/read")
	fun markRead(
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable notificationId: Long,
	): NotificationResponse {
		val currentUser = accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return notificationService.markRead(
			currentUser = currentUser,
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			notificationId = notificationId,
		)
	}

	@PostMapping("/read-all")
	fun markAllRead(
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestBody(required = false) request: NotificationReadAllRequest?,
	): NotificationUnreadCountResponse {
		val currentUser = accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return notificationService.markAllRead(
			currentUser = currentUser,
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			request = request,
		)
	}
}
