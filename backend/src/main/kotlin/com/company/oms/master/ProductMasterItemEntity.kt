package com.company.oms.master

import com.company.oms.common.persistence.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal

@Entity
@Table(name = "product_master_items")
class ProductMasterItemEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "ezadmin_code", nullable = false, length = 64)
	var ezadminCode: String = "",

	@Column(name = "product_name", length = 255)
	var productName: String? = null,

	@Column(name = "customer_product_code", length = 64)
	var customerProductCode: String? = null,

	@Column(name = "box_qty", precision = 18, scale = 3)
	var boxQty: BigDecimal? = null,

	@Column(name = "outbound_unit", length = 64)
	var outboundUnit: String? = null,

	@Column(name = "temperature_type", length = 64)
	var temperatureType: String? = null,

	@Column(name = "cbm", precision = 18, scale = 6)
	var cbm: BigDecimal? = null,

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

