package com.company.oms.auth

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import java.io.Serializable

@Embeddable
data class UserRoleId(
	@Column(name = "user_id", nullable = false)
	var userId: Long = 0,

	@Column(name = "role_id", nullable = false)
	var roleId: Long = 0,
) : Serializable
