package com.company.oms.auth

import com.company.oms.common.persistence.BaseTimeEntity
import com.company.oms.common.persistence.UserScopeType
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
@Table(name = "users")
class UserEntity(
	@Enumerated(EnumType.STRING)
	@Column(name = "user_scope_type", nullable = false, length = 16)
	var userScopeType: UserScopeType = UserScopeType.TENANT,

	@Column(name = "tenant_id")
	var tenantId: Long? = null,

	@Column(name = "client_id")
	var clientId: Long? = null,

	@Column(name = "login_id", nullable = false, length = 100)
	var loginId: String = "",

	@Column(name = "name", nullable = false, length = 100)
	var name: String = "",

	@Column(name = "email", length = 255)
	var email: String? = null,

	@Column(name = "password_hash", nullable = false, length = 255)
	var passwordHash: String = "",

	@Column(name = "status", nullable = false, length = 32)
	var status: String = "ACTIVE",

	@Column(name = "last_login_at")
	var lastLoginAt: LocalDateTime? = null,
) : BaseTimeEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

