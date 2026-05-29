package com.company.oms.label

import com.company.oms.common.persistence.CreatedAtEntity
import com.company.oms.common.persistence.LabelType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal

@Entity
@Table(name = "label_lines")
class LabelLineEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "batch_id", nullable = false)
	var batchId: Long = 0,

	@Column(name = "sheet_name", nullable = false, length = 255)
	var sheetName: String = "",

	@Enumerated(EnumType.STRING)
	@Column(name = "label_type", nullable = false, length = 16)
	var labelType: LabelType = LabelType.EA,

	@Column(name = "order_no", length = 64)
	var orderNo: String? = null,

	@Column(name = "store_code", length = 64)
	var storeCode: String? = null,

	@Column(name = "store_name", length = 255)
	var storeName: String? = null,

	@Column(name = "product_code", length = 64)
	var productCode: String? = null,

	@Column(name = "product_name", length = 255)
	var productName: String? = null,

	@Column(name = "order_qty", precision = 18, scale = 3)
	var orderQty: BigDecimal? = null,

	@Column(name = "sequence_no", length = 64)
	var sequenceNo: String? = null,

	@Column(name = "matching_code", length = 128)
	var matchingCode: String? = null,

	@Column(name = "qr_code", length = 255)
	var qrCode: String? = null,

	@Column(name = "box_sequence", length = 64)
	var boxSequence: String? = null,

	@Column(name = "total_box_qty", precision = 18, scale = 3)
	var totalBoxQty: BigDecimal? = null,

	@Column(name = "row_no", nullable = false)
	var rowNo: Int = 0,

	@Column(name = "raw_row_json", columnDefinition = "json")
	var rawRowJson: String? = null,
) : CreatedAtEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

