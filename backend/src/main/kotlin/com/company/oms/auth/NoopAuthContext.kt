package com.company.oms.auth

import org.springframework.stereotype.Component

@Component
class NoopAuthContext : AuthContext {
    override fun currentUser(): CurrentUser? = null
}
