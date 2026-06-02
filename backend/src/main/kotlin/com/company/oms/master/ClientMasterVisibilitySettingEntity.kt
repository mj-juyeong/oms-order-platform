package com.company.oms.master

import com.company.oms.common.persistence.BaseTimeEntity
import com.company.oms.common.persistence.ClientProductMasterVisibilityMode
import com.company.oms.common.persistence.ClientStoreRouteMasterVisibilityMode
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "client_master_visibility_settings")
class ClientMasterVisibilitySettingEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Enumerated(EnumType.STRING)
	@Column(name = "product_visibility_mode", nullable = false, length = 32)
	var productVisibilityMode: ClientProductMasterVisibilityMode = ClientProductMasterVisibilityMode.SCOPED_ONLY,

	@Enumerated(EnumType.STRING)
	@Column(name = "store_route_visibility_mode", nullable = false, length = 32)
	var storeRouteVisibilityMode: ClientStoreRouteMasterVisibilityMode = ClientStoreRouteMasterVisibilityMode.SCOPED_ONLY,

	@Column(name = "show_price_fields_yn", nullable = false)
	var showPriceFieldsYn: Boolean = false,

	@Column(name = "show_supplier_fields_yn", nullable = false)
	var showSupplierFieldsYn: Boolean = false,

	@Column(name = "show_store_route_internal_fields_yn", nullable = false)
	var showStoreRouteInternalFieldsYn: Boolean = false,

	@Column(name = "updated_by")
	var updatedBy: Long? = null,
) : BaseTimeEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}
