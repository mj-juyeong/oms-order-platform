package com.company.oms.common.scope

import com.company.oms.common.persistence.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "clients")
class ClientEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "code", nullable = false, length = 64)
	var code: String = "",

	@Column(name = "name", nullable = false, length = 255)
	var name: String = "",

	@Column(name = "status", nullable = false, length = 32)
	var status: String = "ACTIVE",
) : BaseTimeEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

