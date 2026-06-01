package com.company.oms.auth

import com.company.oms.common.persistence.UserScopeType
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Component
import tools.jackson.databind.ObjectMapper
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.time.Instant
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

@Component
@Profile("local")
class JwtTokenProvider(
	private val objectMapper: ObjectMapper,
	@Value("\${oms.auth.jwt.secret:oms-local-development-jwt-secret-change-me}")
	private val secret: String,
	@Value("\${oms.auth.jwt.expiration-seconds:7200}")
	private val expirationSeconds: Long,
) : TokenProvider {

	private val encoder = Base64.getUrlEncoder().withoutPadding()
	private val decoder = Base64.getUrlDecoder()

	override fun issueToken(user: CurrentUser): String {
		val now = Instant.now().epochSecond
		val header =
			mapOf(
				"alg" to "HS256",
				"typ" to "JWT",
			)
		val payload =
			mapOf(
				"sub" to user.userId,
				"loginId" to user.loginId,
				"userScopeType" to user.userScopeType?.name,
				"tenantId" to user.tenantId,
				"clientId" to user.clientId,
				"roles" to user.roles.map { it.name }.sorted(),
				"iat" to now,
				"exp" to now + expirationSeconds,
			)
		val unsignedToken = "${encodeJson(header)}.${encodeJson(payload)}"
		return "$unsignedToken.${sign(unsignedToken)}"
	}

	override fun parseToken(token: String): CurrentUser? {
		val parts = token.split(".")
		if (parts.size != 3) {
			return null
		}
		val unsignedToken = "${parts[0]}.${parts[1]}"
		if (!MessageDigest.isEqual(sign(unsignedToken).toByteArray(), parts[2].toByteArray())) {
			return null
		}

		val claims = runCatching {
			@Suppress("UNCHECKED_CAST")
			objectMapper.readValue(String(decoder.decode(parts[1]), StandardCharsets.UTF_8), Map::class.java) as Map<String, Any?>
		}.getOrNull() ?: return null

		val expiresAt = claimLong(claims["exp"]) ?: return null
		if (expiresAt <= Instant.now().epochSecond) {
			return null
		}

		val userId = claimLong(claims["sub"]) ?: return null
		val roles =
			(claims["roles"] as? List<*>)
				.orEmpty()
				.mapNotNull { runCatching { UserRole.valueOf(it.toString()) }.getOrNull() }
				.toSet()

		return CurrentUser(
			userId = userId,
			tenantId = claimLong(claims["tenantId"]),
			clientId = claimLong(claims["clientId"]),
			loginId = claims["loginId"]?.toString(),
			userScopeType = claims["userScopeType"]?.toString()?.let { runCatching { UserScopeType.valueOf(it) }.getOrNull() },
			roles = roles,
		)
	}

	override fun expiresInSeconds(): Long = expirationSeconds

	private fun encodeJson(value: Any): String =
		encoder.encodeToString(objectMapper.writeValueAsString(value).toByteArray(StandardCharsets.UTF_8))

	private fun sign(value: String): String {
		val mac = Mac.getInstance("HmacSHA256")
		mac.init(SecretKeySpec(secret.toByteArray(StandardCharsets.UTF_8), "HmacSHA256"))
		return encoder.encodeToString(mac.doFinal(value.toByteArray(StandardCharsets.UTF_8)))
	}

	private fun claimLong(value: Any?): Long? =
		when (value) {
			is Number -> value.toLong()
			is String -> value.toLongOrNull()
			else -> null
		}
}
