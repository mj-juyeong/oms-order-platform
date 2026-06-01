package com.company.oms.label

import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.LabelType
import java.math.BigDecimal

data class LabelLineResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val batchId: Long,
	val batchStatus: BatchStatus?,
	val sheetName: String,
	val labelType: LabelType,
	val orderNo: String?,
	val storeCode: String?,
	val storeName: String?,
	val brandName: String?,
	val productCode: String?,
	val productName: String?,
	val orderQty: BigDecimal?,
	val sequenceNo: String?,
	val matchingCode: String?,
	val qrCode: String?,
	val boxSequence: String?,
	val totalBoxQty: BigDecimal?,
	val rowNo: Int,
	val rawRowJson: String?,
)

fun LabelLineEntity.toResponse(
	batchStatus: BatchStatus? = null,
	fallbackStoreName: String? = null,
): LabelLineResponse =
	LabelLineResponse(
		id = requireNotNull(id),
		tenantId = tenantId,
		clientId = clientId,
		batchId = batchId,
		batchStatus = batchStatus,
		sheetName = sheetName,
		labelType = labelType,
		orderNo = orderNo,
		storeCode = storeCode,
		storeName = storeName?.takeIf(String::isNotBlank) ?: fallbackStoreName,
		brandName = brandName,
		productCode = productCode,
		productName = productName,
		orderQty = orderQty,
		sequenceNo = sequenceNo,
		matchingCode = matchingCode,
		qrCode = qrCode,
		boxSequence = boxSequence,
		totalBoxQty = totalBoxQty,
		rowNo = rowNo,
		rawRowJson = rawRowJson,
	)
