package com.company.oms.auth

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
@Profile("local")
class HeaderAuthFilter(
	private val tokenProvider: TokenProvider,
	private val authUserFactory: AuthUserFactory,
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
		bearerToken(request)?.let { token ->
			tokenProvider.parseToken(token)?.userId?.let { userId ->
				return authUserFactory.activeUserFromId(userId)
			}
		}

		val userId = request.getHeader("X-User-Id")?.toLongOrNull() ?: return null
		return authUserFactory.activeUserFromId(userId)
	}

	private fun bearerToken(request: HttpServletRequest): String? {
		val authorization = request.getHeader("Authorization") ?: return null
		if (!authorization.startsWith("Bearer ", ignoreCase = true)) {
			return null
		}
		return authorization.substringAfter(" ").trim().takeIf { it.isNotBlank() }
	}
}
