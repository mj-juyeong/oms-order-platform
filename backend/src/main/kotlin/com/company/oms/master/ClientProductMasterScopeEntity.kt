package com.company.oms.master

import com.company.oms.common.persistence.BaseTimeEntity
import com.company.oms.common.persistence.ClientMasterScopeSource
import com.company.oms.common.persistence.ClientMasterScopeStatus
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "client_product_master_scopes")
class ClientProductMasterScopeEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "product_master_item_id", nullable = false)
	var productMasterItemId: Long = 0,

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 16)
	var status: ClientMasterScopeStatus = ClientMasterScopeStatus.ACTIVE,

	@Enumerated(EnumType.STRING)
	@Column(name = "source", nullable = false, length = 32)
	var source: ClientMasterScopeSource = ClientMasterScopeSource.MANUAL,

	@Column(name = "created_by")
	var createdBy: Long? = null,
) : BaseTimeEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}
