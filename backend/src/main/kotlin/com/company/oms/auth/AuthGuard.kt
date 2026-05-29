package com.company.oms.auth

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component

@Component
@Profile("local")
class AuthGuard(
	private val authContext: AuthContext,
) {

	fun requireUser(): CurrentUser =
		authContext.currentUser()
			?: throw OmsException(ErrorCode.UNAUTHORIZED, status = HttpStatus.UNAUTHORIZED)

	fun requireAnyRole(vararg roles: UserRole): CurrentUser {
		val currentUser = requireUser()
		if (currentUser.roles.none { it in roles }) {
			throw OmsException(ErrorCode.FORBIDDEN, status = HttpStatus.FORBIDDEN)
		}
		return currentUser
	}

	fun requireAdmin(): CurrentUser =
		requireAnyRole(UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
}
