package com.company.oms.master

import com.company.oms.common.persistence.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "store_route_master_items")
class StoreRouteMasterItemEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "baljugo_code", nullable = false, length = 64)
	var baljugoCode: String = "",

	@Column(name = "customer_code", length = 128)
	var customerCode: String? = null,

	@Column(name = "brand_name", length = 255)
	var brandName: String? = null,

	@Column(name = "store_name", length = 255)
	var storeName: String? = null,

	@Column(name = "area", length = 100)
	var area: String? = null,

	@Column(name = "delivery_day", length = 64)
	var deliveryDay: String? = null,

	@Column(name = "delivery_round", length = 64)
	var deliveryRound: String? = null,

	@Column(name = "vehicle_name", length = 255)
	var vehicleName: String? = null,

	@Column(name = "driver_name", length = 255)
	var driverName: String? = null,

	@Column(name = "address", length = 500)
	var address: String? = null,

	@Column(name = "active_yn", nullable = false)
	var activeYn: Boolean = true,

	@Column(name = "last_master_upload_batch_id")
	var lastMasterUploadBatchId: Long? = null,

	@Column(name = "row_no")
	var rowNo: Int? = null,

	@Column(name = "raw_row_json", columnDefinition = "json")
	var rawRowJson: String? = null,
) : BaseTimeEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}
