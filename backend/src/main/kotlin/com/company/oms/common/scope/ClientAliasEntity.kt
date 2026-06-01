package com.company.oms.common.scope

import com.company.oms.common.persistence.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "client_aliases")
class ClientAliasEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "alias_name", nullable = false, length = 255)
	var aliasName: String = "",

	@Column(name = "normalized_alias", nullable = false, length = 255)
	var normalizedAlias: String = "",

	@Column(name = "source", nullable = false, length = 32)
	var source: String = "ADMIN",

	@Column(name = "active_yn", nullable = false)
	var activeYn: Boolean = true,
) : BaseTimeEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}
