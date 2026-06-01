package com.company.oms.order

import com.company.oms.common.persistence.BatchStatus
import java.math.BigDecimal
import java.time.LocalDate

data class OrderLineResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val batchId: Long,
	val sourcePlLineId: Long,
	val orderNo: String?,
	val storeCode: String?,
	val storeName: String?,
	val brandName: String?,
	val productCode: String?,
	val productName: String?,
	val unit: String?,
	val orderQty: BigDecimal?,
	val dueDate: LocalDate?,
	val vehicleName: String?,
	val deliveryRound: String?,
	val area: String?,
	val batchStatus: BatchStatus?,
	val confirmed: Boolean,
)

fun OrderLineEntity.toResponse(
	batchStatus: BatchStatus?,
	fallbackStoreName: String? = null,
): OrderLineResponse =
	OrderLineResponse(
		id = requireNotNull(id),
		tenantId = tenantId,
		clientId = clientId,
		batchId = batchId,
		sourcePlLineId = sourcePlLineId,
		orderNo = orderNo,
		storeCode = storeCode,
		storeName = storeName?.takeIf(String::isNotBlank) ?: fallbackStoreName,
		brandName = brandName,
		productCode = productCode,
		productName = productName,
		unit = unit,
		orderQty = orderQty,
		dueDate = dueDate,
		vehicleName = vehicleName,
		deliveryRound = deliveryRound,
		area = area,
		batchStatus = batchStatus,
		confirmed = batchStatus == BatchStatus.CONFIRMED,
	)
