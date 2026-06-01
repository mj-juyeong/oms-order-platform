package com.company.oms.auth

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import java.time.ZoneId

@Service
@Profile("local")
class AuthLoginService(
	private val userRepository: UserRepository,
	private val passwordEncoder: PasswordEncoder,
	private val authUserFactory: AuthUserFactory,
	private val tokenProvider: TokenProvider,
	private val authGuard: AuthGuard,
) {

	@Transactional
	fun login(request: LoginRequest): LoginResponse {
		val user =
			userRepository.findByLoginId(request.loginId)
				?: throw invalidCredentials()
		if (user.status != "ACTIVE") {
			throw OmsException(ErrorCode.USER_DISABLED, status = HttpStatus.UNAUTHORIZED)
		}
		if (!passwordMatches(request.password, user.passwordHash)) {
			throw invalidCredentials()
		}

		user.lastLoginAt = LocalDateTime.now(ZoneId.of("Asia/Seoul"))
		val currentUser =
			authUserFactory.activeUserFromEntity(user)
				?: throw OmsException(ErrorCode.USER_DISABLED, status = HttpStatus.UNAUTHORIZED)
		return LoginResponse(
			accessToken = tokenProvider.issueToken(currentUser),
			expiresInSeconds = tokenProvider.expiresInSeconds(),
			user = currentUser.toResponse(name = user.name),
		)
	}

	fun logout(): LogoutResponse {
		authGuard.requireUser()
		return LogoutResponse(loggedOut = true)
	}

	private fun invalidCredentials(): OmsException =
		OmsException(ErrorCode.INVALID_CREDENTIALS, status = HttpStatus.UNAUTHORIZED)

	private fun passwordMatches(
		rawPassword: String,
		encodedPassword: String,
	): Boolean =
		runCatching { passwordEncoder.matches(rawPassword, encodedPassword) }
			.getOrDefault(false)

	private fun CurrentUser.toResponse(name: String?): CurrentUserResponse =
		CurrentUserResponse(
			id = userId,
			loginId = loginId,
			name = name,
			userScopeType = userScopeType,
			tenantId = tenantId,
			clientId = clientId,
			roles = roles,
		)
}
