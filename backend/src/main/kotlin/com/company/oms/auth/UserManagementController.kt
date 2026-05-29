package com.company.oms.auth

import com.company.oms.common.persistence.UserScopeType
import com.company.oms.common.response.PageResponse
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
@Profile("local")
class UserManagementController(
	private val userManagementService: UserManagementService,
) {

	@GetMapping("/api/v1/auth/me")
	fun me(): CurrentUserResponse = userManagementService.me()

	@GetMapping("/api/v1/users")
	fun listUsers(
		@RequestParam(required = false) userScopeType: UserScopeType?,
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam(required = false) status: String?,
		@RequestParam(required = false) keyword: String?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<UserResponse> =
		userManagementService.listUsers(
			userScopeType = userScopeType,
			tenantId = tenantId,
			clientId = clientId,
			status = status,
			keyword = keyword,
			page = page,
			size = size,
		)

	@PostMapping("/api/v1/users")
	fun createUser(
		@RequestBody request: CreateUserRequest,
	): UserMutationResponse = userManagementService.createUser(request)

	@PatchMapping("/api/v1/users/{userId}")
	fun updateUser(
		@PathVariable userId: Long,
		@RequestBody request: UpdateUserRequest,
	): UserMutationResponse = userManagementService.updateUser(userId, request)
}
