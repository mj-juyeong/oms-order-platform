package com.company.oms.auth

import com.company.oms.common.persistence.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "api_keys")
class ApiKeyEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id")
	var clientId: Long? = null,

	@Enumerated(EnumType.STRING)
	@Column(name = "scope_type", nullable = false, length = 32)
	var scopeType: ApiKeyScopeType = ApiKeyScopeType.CLIENT,

	@Column(name = "name", nullable = false, length = 100)
	var name: String = "",

	@Column(name = "key_hash", nullable = false, length = 255)
	var keyHash: String = "",

	@Column(name = "status", nullable = false, length = 32)
	var status: String = "ACTIVE",

	@Column(name = "allowed_scope", columnDefinition = "json")
	var allowedScope: String? = null,

	@Column(name = "expires_at")
	var expiresAt: LocalDateTime? = null,

	@Column(name = "last_used_at")
	var lastUsedAt: LocalDateTime? = null,

	@Column(name = "created_by")
	var createdBy: Long? = null,
) : BaseTimeEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

enum class ApiKeyScopeType {
	TENANT,
	CLIENT,
}
