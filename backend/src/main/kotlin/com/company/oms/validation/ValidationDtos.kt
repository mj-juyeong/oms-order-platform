package com.company.oms.validation

import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.UploadDomain
import com.company.oms.common.persistence.ValidationSeverity
import java.time.LocalDateTime

data class BatchValidationResponse(
	val batchId: Long,
	val status: BatchStatus,
	val errorCount: Int,
	val warningCount: Int,
	val infoCount: Int,
	val productMasterCheckedAt: LocalDateTime,
	val storeRouteMasterCheckedAt: LocalDateTime,
)

data class BatchStatusChangeResponse(
	val id: Long,
	val status: BatchStatus,
	val confirmedAt: LocalDateTime? = null,
	val cancelledAt: LocalDateTime? = null,
	val rolledBackAt: LocalDateTime? = null,
)

data class BatchActionRequest(
	val reason: String? = null,
	val actorId: Long? = null,
)

data class ValidationErrorResponse(
	val id: Long,
	val severity: ValidationSeverity,
	val errorCode: String,
	val userTitle: String,
	val userMessage: String,
	val actionGuide: String,
	val domain: UploadDomain,
	val sheetName: String?,
	val rowNo: Int?,
	val columnName: String?,
	val lineTable: String?,
	val lineId: Long?,
	val message: String,
	val originalValue: String?,
	val normalizedValue: String?,
	val targetCode: String?,
	val targetName: String?,
	val orderNo: String?,
	val storeCode: String?,
	val storeName: String?,
	val productCode: String?,
	val productName: String?,
	val orderQty: String?,
	val unit: String?,
	val sourceSummary: String?,
	val resolvedYn: Boolean,
)
