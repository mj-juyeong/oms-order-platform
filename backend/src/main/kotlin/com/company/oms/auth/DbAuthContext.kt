package com.company.oms.auth

import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Component

@Component
@Profile("local")
class DbAuthContext : AuthContext {
	override fun currentUser(): CurrentUser? = RequestUserContext.get()
}
