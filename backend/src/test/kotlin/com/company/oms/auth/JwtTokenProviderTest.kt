package com.company.oms.auth

import com.company.oms.common.persistence.UserScopeType
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import tools.jackson.databind.ObjectMapper

class JwtTokenProviderTest {

	@Test
	fun issueAndParseTokenPreservesTenantUserClaims() {
		val provider =
			JwtTokenProvider(
				objectMapper = ObjectMapper(),
				secret = "test-secret",
				expirationSeconds = 3600,
			)

		val token =
			provider.issueToken(
				CurrentUser(
					userId = 10,
					tenantId = 20,
					clientId = null,
					loginId = "ops01",
					userScopeType = UserScopeType.TENANT,
					roles = setOf(UserRole.OPERATOR),
				),
			)

		val parsed = assertNotNull(provider.parseToken(token))
		assertEquals(10, parsed.userId)
		assertEquals(20, parsed.tenantId)
		assertEquals(null, parsed.clientId)
		assertEquals("ops01", parsed.loginId)
		assertEquals(UserScopeType.TENANT, parsed.userScopeType)
		assertEquals(setOf(UserRole.OPERATOR), parsed.roles)
		assertEquals(3600, provider.expiresInSeconds())
	}
}
