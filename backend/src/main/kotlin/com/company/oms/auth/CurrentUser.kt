package com.company.oms.auth

import com.company.oms.common.persistence.UserScopeType

data class CurrentUser(
    val userId: Long?,
    val tenantId: Long?,
    val clientId: Long?,
    val loginId: String?,
    val userScopeType: UserScopeType? = null,
    val roles: Set<UserRole> = emptySet(),
)
