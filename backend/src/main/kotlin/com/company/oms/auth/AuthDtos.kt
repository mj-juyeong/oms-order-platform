package com.company.oms.auth

import com.company.oms.common.persistence.UserScopeType
import java.time.LocalDateTime

data class LoginRequest(
	val loginId: String,
	val password: String,
)

data class LoginResponse(
	val accessToken: String,
	val tokenType: String = "Bearer",
	val expiresInSeconds: Long,
	val user: CurrentUserResponse,
)

data class LogoutResponse(
	val loggedOut: Boolean,
)

data class CurrentUserResponse(
	val id: Long?,
	val loginId: String?,
	val name: String?,
	val userScopeType: UserScopeType?,
	val tenantId: Long?,
	val clientId: Long?,
	val roles: Set<UserRole>,
)

data class UserResponse(
	val id: Long,
	val loginId: String,
	val name: String,
	val email: String?,
	val userScopeType: UserScopeType,
	val tenantId: Long?,
	val tenantName: String?,
	val clientId: Long?,
	val clientName: String?,
	val status: String,
	val roles: Set<String>,
	val lastLoginAt: LocalDateTime?,
)

data class CreateUserRequest(
	val loginId: String,
	val name: String,
	val email: String? = null,
	val userScopeType: UserScopeType,
	val tenantId: Long? = null,
	val clientId: Long? = null,
	val password: String,
	val roleCodes: Set<String>,
)

data class UpdateUserRequest(
	val name: String? = null,
	val email: String? = null,
	val userScopeType: UserScopeType? = null,
	val tenantId: Long? = null,
	val clientId: Long? = null,
	val status: String? = null,
	val roleCodes: Set<String>? = null,
)

data class UserMutationResponse(
	val id: Long,
	val updated: Boolean = true,
)
