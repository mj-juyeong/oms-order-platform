package com.company.oms.scan

import com.company.oms.common.persistence.CreatedAtEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.LocalDate

@Entity
@Table(name = "scan_lines")
class ScanLineEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "batch_id", nullable = false)
	var batchId: Long = 0,

	@Column(name = "sheet_name", nullable = false, length = 255)
	var sheetName: String = "",

	@Column(name = "scan_center", length = 100)
	var scanCenter: String? = null,

	@Column(name = "delivery_date")
	var deliveryDate: LocalDate? = null,

	@Column(name = "bus", length = 100)
	var bus: String? = null,

	@Column(name = "barcode", length = 128)
	var barcode: String? = null,

	@Column(name = "order_business_site_code", length = 64)
	var orderBusinessSiteCode: String? = null,

	@Column(name = "store_name", length = 255)
	var storeName: String? = null,

	@Column(name = "product_code", length = 64)
	var productCode: String? = null,

	@Column(name = "product_name", length = 255)
	var productName: String? = null,

	@Column(name = "label_qty", precision = 18, scale = 3)
	var labelQty: BigDecimal? = null,

	@Column(name = "unit", length = 32)
	var unit: String? = null,

	@Column(name = "box_sequence", length = 64)
	var boxSequence: String? = null,

	@Column(name = "temperature_type", length = 64)
	var temperatureType: String? = null,

	@Column(name = "row_no", nullable = false)
	var rowNo: Int = 0,

	@Column(name = "raw_row_json", columnDefinition = "json")
	var rawRowJson: String? = null,
) : CreatedAtEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

