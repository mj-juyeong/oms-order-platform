package com.company.oms.auth

data class CurrentUser(
    val userId: Long?,
    val tenantId: Long?,
    val clientId: Long?,
    val loginId: String?,
    val roles: Set<UserRole> = emptySet(),
)
