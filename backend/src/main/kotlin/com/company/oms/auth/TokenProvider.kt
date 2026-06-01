package com.company.oms.auth

interface TokenProvider {
    fun issueToken(user: CurrentUser): String

    fun parseToken(token: String): CurrentUser?

    fun expiresInSeconds(): Long
}
