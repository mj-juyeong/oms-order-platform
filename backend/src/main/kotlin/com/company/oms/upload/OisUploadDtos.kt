package com.company.oms.upload

import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.SheetType
import java.time.LocalDate
import java.time.LocalDateTime

data class OisUploadResponse(
	val batchId: Long,
	val tenantId: Long,
	val clientId: Long,
	val status: BatchStatus,
	val batchNo: String,
	val deliveryDate: LocalDate?,
	val fileName: String,
	val sheetResults: List<OisSheetResultResponse>,
	val scanLineCount: Int,
	val plLineCount: Int,
	val labelLineCount: Int,
	val orderLineCount: Int,
)

data class OisBatchSummaryResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val batchNo: String,
	val status: BatchStatus,
	val deliveryDate: LocalDate?,
	val uploadedAt: LocalDateTime,
	val errorCount: Int,
	val warningCount: Int,
	val infoCount: Int,
	val memo: String?,
)

data class OisBatchDetailResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val batchNo: String,
	val status: BatchStatus,
	val deliveryDate: LocalDate?,
	val uploadedAt: LocalDateTime,
	val uploadedFiles: List<OisUploadedFileResponse>,
	val sheetResults: List<OisSheetResultResponse>,
	val errorCount: Int,
	val warningCount: Int,
	val infoCount: Int,
	val memo: String?,
)

data class OisUploadedFileResponse(
	val id: Long,
	val fileType: String,
	val originalFileName: String,
	val fileHash: String,
	val fileSize: Long,
	val contentType: String?,
)

data class OisSheetResultResponse(
	val id: Long,
	val sheetName: String,
	val sheetType: SheetType,
	val suffixValue: String?,
	val dataRowCount: Int,
	val status: String,
	val message: String?,
)

