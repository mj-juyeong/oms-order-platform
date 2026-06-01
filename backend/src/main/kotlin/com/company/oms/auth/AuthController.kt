package com.company.oms.auth

import org.springframework.context.annotation.Profile
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
@Profile("local")
class AuthController(
	private val authLoginService: AuthLoginService,
) {

	@PostMapping("/api/v1/auth/login")
	fun login(
		@RequestBody request: LoginRequest,
	): LoginResponse = authLoginService.login(request)

	@PostMapping("/api/v1/auth/logout")
	fun logout(): LogoutResponse = authLoginService.logout()
}
