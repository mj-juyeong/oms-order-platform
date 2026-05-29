package com.company.oms.auth

import com.company.oms.common.persistence.CreatedAtEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "roles")
class RoleEntity(
	@Column(name = "code", nullable = false, length = 64)
	var code: String = "",

	@Column(name = "name", nullable = false, length = 100)
	var name: String = "",

	@Column(name = "description", length = 500)
	var description: String? = null,
) : CreatedAtEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

