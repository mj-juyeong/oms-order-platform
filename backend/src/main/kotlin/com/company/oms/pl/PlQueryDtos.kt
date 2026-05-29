package com.company.oms.pl

import com.company.oms.common.persistence.PlType
import java.math.BigDecimal
import java.time.LocalDate

data class PlLineResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val batchId: Long,
	val sheetName: String,
	val plType: PlType,
	val orderNo: String?,
	val storeCode: String?,
	val storeName: String?,
	val brandName: String?,
	val productCode: String?,
	val productName: String?,
	val unit: String?,
	val storageTemperature: String?,
	val dueDate: LocalDate?,
	val orderQty: BigDecimal?,
	val vehicleName: String?,
	val cbm: BigDecimal?,
	val qrCode: String?,
	val boxQty: BigDecimal?,
	val rowNo: Int,
	val rawRowJson: String?,
)

fun PlLineEntity.toResponse(): PlLineResponse =
	PlLineResponse(
		id = requireNotNull(id),
		tenantId = tenantId,
		clientId = clientId,
		batchId = batchId,
		sheetName = sheetName,
		plType = plType,
		orderNo = orderNo,
		storeCode = storeCode,
		storeName = storeName,
		brandName = brandName,
		productCode = productCode,
		productName = productName,
		unit = unit,
		storageTemperature = storageTemperature,
		dueDate = dueDate,
		orderQty = orderQty,
		vehicleName = vehicleName,
		cbm = cbm,
		qrCode = qrCode,
		boxQty = boxQty,
		rowNo = rowNo,
		rawRowJson = rawRowJson,
	)
