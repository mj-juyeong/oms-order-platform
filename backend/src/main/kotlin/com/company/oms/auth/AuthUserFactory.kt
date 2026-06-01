package com.company.oms.auth

import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Component

@Component
@Profile("local")
class AuthUserFactory(
	private val userRepository: UserRepository,
	private val userRoleRepository: UserRoleRepository,
	private val roleRepository: RoleRepository,
) {

	fun activeUserFromId(userId: Long): CurrentUser? {
		val user = userRepository.findById(userId).orElse(null) ?: return null
		if (user.status != "ACTIVE") {
			return null
		}
		return activeUserFromEntity(user)
	}

	fun activeUserFromEntity(user: UserEntity): CurrentUser? {
		val userId = user.id ?: return null
		if (user.status != "ACTIVE") {
			return null
		}
		return CurrentUser(
			userId = userId,
			tenantId = user.tenantId,
			clientId = user.clientId,
			loginId = user.loginId,
			userScopeType = user.userScopeType,
			roles = rolesForUser(userId),
		)
	}

	private fun rolesForUser(userId: Long): Set<UserRole> =
		userRoleRepository.findAllById_UserId(userId)
			.map { it.id.roleId }
			.mapNotNull { roleRepository.findById(it).orElse(null)?.code }
			.mapNotNull { runCatching { UserRole.valueOf(it) }.getOrNull() }
			.toSet()
}
