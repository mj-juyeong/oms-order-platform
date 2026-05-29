package com.company.oms.scan

import java.math.BigDecimal
import java.time.LocalDate

data class ScanLineResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val batchId: Long,
	val sheetName: String,
	val scanCenter: String?,
	val deliveryDate: LocalDate?,
	val bus: String?,
	val barcode: String?,
	val orderBusinessSiteCode: String?,
	val storeName: String?,
	val productCode: String?,
	val productName: String?,
	val labelQty: BigDecimal?,
	val unit: String?,
	val boxSequence: String?,
	val temperatureType: String?,
	val rowNo: Int,
	val rawRowJson: String?,
)

fun ScanLineEntity.toResponse(): ScanLineResponse =
	ScanLineResponse(
		id = requireNotNull(id),
		tenantId = tenantId,
		clientId = clientId,
		batchId = batchId,
		sheetName = sheetName,
		scanCenter = scanCenter,
		deliveryDate = deliveryDate,
		bus = bus,
		barcode = barcode,
		orderBusinessSiteCode = orderBusinessSiteCode,
		storeName = storeName,
		productCode = productCode,
		productName = productName,
		labelQty = labelQty,
		unit = unit,
		boxSequence = boxSequence,
		temperatureType = temperatureType,
		rowNo = rowNo,
		rawRowJson = rawRowJson,
	)
