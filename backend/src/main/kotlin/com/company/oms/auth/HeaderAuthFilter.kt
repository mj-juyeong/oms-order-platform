package com.company.oms.auth

import com.company.oms.common.persistence.UserScopeType
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
@Profile("local")
class HeaderAuthFilter(
	private val userRepository: UserRepository,
	private val userRoleRepository: UserRoleRepository,
	private val roleRepository: RoleRepository,
) : OncePerRequestFilter() {

	override fun doFilterInternal(
		request: HttpServletRequest,
		response: HttpServletResponse,
		filterChain: FilterChain,
	) {
		try {
			RequestUserContext.set(resolveCurrentUser(request))
			filterChain.doFilter(request, response)
		} finally {
			RequestUserContext.clear()
		}
	}

	private fun resolveCurrentUser(request: HttpServletRequest): CurrentUser? {
		val userId = request.getHeader("X-User-Id")?.toLongOrNull() ?: return null
		val user = userRepository.findById(userId).orElse(null) ?: return null
		if (user.status != "ACTIVE") {
			return null
		}
		val roleIds = userRoleRepository.findAllById_UserId(userId).map { it.id.roleId }.toSet()
		val roles =
			roleIds
				.mapNotNull { roleRepository.findById(it).orElse(null)?.code }
				.mapNotNull { runCatching { UserRole.valueOf(it) }.getOrNull() }
				.toSet()

		return CurrentUser(
			userId = user.id,
			tenantId = user.tenantId,
			clientId = user.clientId,
			loginId = user.loginId,
			userScopeType = user.userScopeType.takeIf { it in UserScopeType.entries },
			roles = roles,
		)
	}
}
