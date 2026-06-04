package com.company.oms.master

import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.MasterUploadStatus
import com.company.oms.common.persistence.ValidationSeverity
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

data class MasterUploadSummaryResponse(
	val uploadId: Long,
	val rowCount: Int,
	val insertedCount: Int,
	val updatedCount: Int,
	val unchangedCount: Int,
	val failedCount: Int,
	val status: MasterUploadStatus,
)

data class MasterUploadPreviewResponse(
	val uploadId: Long,
	val rowCount: Int,
	val validCount: Int,
	val failedCount: Int,
	val candidateInsertedCount: Int,
	val candidateUpdatedCount: Int,
	val candidateUnchangedCount: Int,
	val status: MasterUploadStatus,
	val failures: List<MasterUploadRowFailureResponse>,
)

data class MasterUploadRowFailureResponse(
	val rowNo: Int,
	val columnName: String,
	val errorCode: String,
	val message: String,
	val originalValue: String?,
	val keyValue: String?,
	val rawRow: Map<String, String>,
)

data class MasterUploadHistoryResponse(
	val id: Long,
	val masterType: String,
	val fileName: String,
	val rowCount: Int,
	val insertedCount: Int,
	val updatedCount: Int,
	val unchangedCount: Int,
	val failedCount: Int,
	val status: MasterUploadStatus,
	val uploadedAt: LocalDateTime,
	val appliedAt: LocalDateTime?,
	val message: String?,
)

data class ProductMasterItemResponse(
	val id: Long,
	val ezadminCode: String,
	val productName: String?,
	val customerProductCode: String?,
	val boxQty: BigDecimal?,
	val outboundUnit: String?,
	val temperatureType: String?,
	val cbm: BigDecimal?,
	val activeYn: Boolean,
	val lastMasterUploadBatchId: Long?,
	val lastMasterUploadedAt: LocalDateTime?,
	val latestConfirmedBatchId: Long?,
	val latestConfirmedBatchNo: String?,
	val latestConfirmedBatchAt: LocalDateTime?,
	val rowNo: Int?,
)

data class StoreRouteMasterItemResponse(
	val id: Long,
	val baljugoCode: String,
	val customerCode: String?,
	val brandName: String?,
	val storeName: String?,
	val area: String?,
	val deliveryDay: String?,
	val deliveryRound: String?,
	val vehicleName: String?,
	val driverName: String?,
	val address: String?,
	val activeYn: Boolean,
	val lastMasterUploadBatchId: Long?,
	val lastMasterUploadedAt: LocalDateTime?,
	val latestConfirmedBatchId: Long?,
	val latestConfirmedBatchNo: String?,
	val latestConfirmedBatchAt: LocalDateTime?,
	val rowNo: Int?,
)

data class ProductMasterDetailResponse(
	val item: ProductMasterItemResponse,
	val lastUpload: MasterDetailUploadResponse?,
	val usage: MasterUsageSummaryResponse,
	val recentBatches: List<MasterRelatedBatchResponse>,
	val recentOrders: List<MasterRelatedOrderResponse>,
	val validationErrors: List<MasterRelatedValidationErrorResponse>,
)

data class StoreRouteMasterDetailResponse(
	val item: StoreRouteMasterItemResponse,
	val lastUpload: MasterDetailUploadResponse?,
	val usage: MasterUsageSummaryResponse,
	val recentBatches: List<MasterRelatedBatchResponse>,
	val recentOrders: List<MasterRelatedOrderResponse>,
	val validationErrors: List<MasterRelatedValidationErrorResponse>,
)

data class MasterDetailUploadResponse(
	val id: Long,
	val fileName: String,
	val status: MasterUploadStatus,
	val uploadedAt: LocalDateTime,
	val appliedAt: LocalDateTime?,
)

data class MasterUsageSummaryResponse(
	val orderCount: Long,
	val scanLineCount: Long,
	val plLineCount: Long,
	val labelLineCount: Long,
	val validationErrorCount: Long,
	val activeClientScopeCount: Long,
)

data class MasterRelatedBatchResponse(
	val id: Long,
	val batchNo: String,
	val clientId: Long,
	val status: BatchStatus,
	val deliveryDate: LocalDate?,
	val uploadedAt: LocalDateTime,
	val confirmedAt: LocalDateTime?,
)

data class MasterRelatedOrderResponse(
	val id: Long,
	val batchId: Long,
	val clientName: String?,
	val orderNo: String?,
	val storeCode: String?,
	val storeName: String?,
	val productCode: String?,
	val productName: String?,
	val unit: String?,
	val orderQty: BigDecimal?,
	val dueDate: LocalDate?,
	val vehicleName: String?,
	val deliveryRound: String?,
	val area: String?,
	val sourcePlLineId: Long?,
	val batchStatus: BatchStatus?,
	val confirmed: Boolean,
)

data class MasterRelatedValidationErrorResponse(
	val id: Long,
	val batchId: Long,
	val severity: ValidationSeverity,
	val errorCode: String,
	val domain: String,
	val sheetName: String?,
	val rowNo: Int?,
	val columnName: String?,
	val message: String,
	val createdAt: LocalDateTime?,
)

data class ClientProductCodeMappingUpsertRequest(
	val tenantId: Long,
	val clientId: Long,
	val clientProductCode: String,
	val ezadminCode: String,
	val activeYn: Boolean = true,
	val memo: String? = null,
)

data class ClientProductCodeMappingResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val clientProductCode: String,
	val ezadminCode: String,
	val productName: String?,
	val activeYn: Boolean,
	val memo: String?,
)

data class ClientStoreCodeMappingUpsertRequest(
	val tenantId: Long,
	val clientId: Long,
	val clientStoreCode: String,
	val baljugoCode: String,
	val activeYn: Boolean = true,
	val memo: String? = null,
)

data class ClientStoreCodeMappingResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val clientStoreCode: String,
	val baljugoCode: String,
	val storeName: String?,
	val activeYn: Boolean,
	val memo: String?,
)

data class ParsedProductMasterRow(
	val rowNo: Int,
	val ezadminCode: String?,
	val productName: String?,
	val customerProductCode: String?,
	val boxQty: BigDecimal?,
	val outboundUnit: String?,
	val temperatureType: String?,
	val cbm: BigDecimal?,
	val rawRow: Map<String, String>,
)

data class ParsedStoreRouteMasterRow(
	val rowNo: Int,
	val baljugoCode: String?,
	val customerCode: String?,
	val brandName: String?,
	val storeName: String?,
	val area: String?,
	val deliveryDay: String?,
	val deliveryRound: String?,
	val vehicleName: String?,
	val driverName: String?,
	val address: String?,
	val activeYn: Boolean?,
	val rawRow: Map<String, String>,
)
