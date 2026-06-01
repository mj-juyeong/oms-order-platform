package com.company.oms.master

import com.company.oms.common.persistence.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "client_store_code_mappings")
class ClientStoreCodeMappingEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "client_store_code", nullable = false, length = 64)
	var clientStoreCode: String = "",

	@Column(name = "baljugo_code", nullable = false, length = 64)
	var baljugoCode: String = "",

	@Column(name = "active_yn", nullable = false)
	var activeYn: Boolean = true,

	@Column(name = "memo", length = 500)
	var memo: String? = null,
) : BaseTimeEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}
