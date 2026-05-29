package com.company.oms.auth

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

object ApiKeyHash {
	private val secureRandom = SecureRandom()

	fun generatePlainKey(): String {
		val bytes = ByteArray(32)
		secureRandom.nextBytes(bytes)
		return "oms_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
	}

	fun sha256Hex(value: String): String {
		val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
		return digest.joinToString("") { "%02x".format(it) }
	}
}
