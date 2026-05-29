package com.company.oms.order

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
@Table(name = "order_lines")
class OrderLineEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "batch_id", nullable = false)
	var batchId: Long = 0,

	@Column(name = "source_pl_line_id", nullable = false)
	var sourcePlLineId: Long = 0,

	@Column(name = "order_no", length = 64)
	var orderNo: String? = null,

	@Column(name = "store_code", length = 64)
	var storeCode: String? = null,

	@Column(name = "store_name", length = 255)
	var storeName: String? = null,

	@Column(name = "brand_name", length = 255)
	var brandName: String? = null,

	@Column(name = "product_code", length = 64)
	var productCode: String? = null,

	@Column(name = "product_name", length = 255)
	var productName: String? = null,

	@Column(name = "unit", length = 64)
	var unit: String? = null,

	@Column(name = "order_qty", precision = 18, scale = 3)
	var orderQty: BigDecimal? = null,

	@Column(name = "due_date")
	var dueDate: LocalDate? = null,

	@Column(name = "vehicle_name", length = 255)
	var vehicleName: String? = null,

	@Column(name = "delivery_round", length = 64)
	var deliveryRound: String? = null,

	@Column(name = "area", length = 100)
	var area: String? = null,
) : CreatedAtEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

