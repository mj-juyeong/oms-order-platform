package com.company.oms.auth

interface AuthContext {
    fun currentUser(): CurrentUser?
}
