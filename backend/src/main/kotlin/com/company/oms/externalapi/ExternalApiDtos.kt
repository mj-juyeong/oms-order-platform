package com.company.oms.externalapi

import com.company.oms.common.persistence.BatchStatus
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

typealias ExternalApiExcelRowResponse = Map<String, Any?>

enum class ExternalApiChannel(
	val endpoint: String,
	val requiredScope: String,
) {
	WOS_SCAN("/external/v1/wos/scan-upload", "WOS_SCAN_READ"),
	PL("/external/v1/pl/picking-list", "PL_READ"),
}

data class ExternalApiStatusResponse(
	val channel: ExternalApiChannel,
	val endpoint: String,
	val requiredScope: String,
	val tenantId: Long,
	val clientId: Long,
	val batchId: Long,
	val batchNo: String,
	val deliveryDate: LocalDate?,
	val batchStatus: BatchStatus,
	val providable: Boolean,
	val excludedReasonCode: String?,
	val excludedReason: String?,
	val sourceSheets: List<String>,
	val providedRowCount: Int,
	val activeApiKeyCount: Int,
	val hasActiveApiKey: Boolean,
	val latestApiKeyLastUsedAt: LocalDateTime?,
	val latestApiKeyExpiresAt: LocalDateTime?,
	val lastCalledAt: LocalDateTime?,
	val lastStatusCode: Int?,
	val lastRequestId: String?,
	val lastResponseTimeMs: Int?,
	val scanCenterCount: Int? = null,
	val barcodeCount: Int? = null,
	val plEaCount: Int? = null,
	val plBoxCount: Int? = null,
	val totalOrderQty: BigDecimal? = null,
	val storeCount: Int? = null,
	val vehicleCount: Int? = null,
)
