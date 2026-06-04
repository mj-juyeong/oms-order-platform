package com.company.oms.master

import com.company.oms.common.persistence.ClientMasterScopeSource
import com.company.oms.common.persistence.ClientMasterScopeStatus
import com.company.oms.common.persistence.ClientProductMasterVisibilityMode
import com.company.oms.common.persistence.ClientStoreRouteMasterVisibilityMode
import java.math.BigDecimal
import java.time.LocalDateTime

data class ClientMasterVisibilitySettingRequest(
	val tenantId: Long,
	val clientId: Long,
	val productVisibilityMode: ClientProductMasterVisibilityMode = ClientProductMasterVisibilityMode.SCOPED_ONLY,
	val storeRouteVisibilityMode: ClientStoreRouteMasterVisibilityMode = ClientStoreRouteMasterVisibilityMode.SCOPED_ONLY,
	val showPriceFieldsYn: Boolean = false,
	val showSupplierFieldsYn: Boolean = false,
	val showStoreRouteInternalFieldsYn: Boolean = false,
)

data class ClientMasterVisibilitySettingResponse(
	val tenantId: Long,
	val clientId: Long,
	val productVisibilityMode: ClientProductMasterVisibilityMode,
	val storeRouteVisibilityMode: ClientStoreRouteMasterVisibilityMode,
	val showPriceFieldsYn: Boolean,
	val showSupplierFieldsYn: Boolean,
	val showStoreRouteInternalFieldsYn: Boolean,
	val updatedBy: Long?,
	val updatedAt: LocalDateTime?,
)

data class ClientProductMasterScopeUpsertRequest(
	val tenantId: Long,
	val clientId: Long,
	val productMasterItemId: Long,
	val activeYn: Boolean = true,
	val source: ClientMasterScopeSource = ClientMasterScopeSource.MANUAL,
)

data class ClientStoreRouteMasterScopeUpsertRequest(
	val tenantId: Long,
	val clientId: Long,
	val storeRouteMasterItemId: Long,
	val activeYn: Boolean = true,
	val source: ClientMasterScopeSource = ClientMasterScopeSource.MANUAL,
)

data class ClientMasterScopeResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val masterItemId: Long,
	val status: ClientMasterScopeStatus,
	val source: ClientMasterScopeSource,
)

data class ClientProductMasterScopeItemResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val productMasterItemId: Long,
	val status: ClientMasterScopeStatus,
	val source: ClientMasterScopeSource,
	val product: ClientPublicProductMasterItemResponse?,
)

data class ClientStoreRouteMasterScopeItemResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val storeRouteMasterItemId: Long,
	val status: ClientMasterScopeStatus,
	val source: ClientMasterScopeSource,
	val storeRoute: ClientPublicStoreRouteMasterItemResponse?,
)

data class ClientPublicProductMasterItemResponse(
	val id: Long,
	val ezadminCode: String,
	val productName: String?,
	val customerProductCode: String?,
	val boxQty: BigDecimal?,
	val outboundUnit: String?,
	val temperatureType: String?,
	val cbm: BigDecimal?,
	val activeYn: Boolean,
	val latestConfirmedBatchId: Long?,
	val latestConfirmedBatchNo: String?,
	val latestConfirmedBatchAt: LocalDateTime?,
)

data class ClientPublicStoreRouteMasterItemResponse(
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
	val internalFieldsVisible: Boolean,
	val latestConfirmedBatchId: Long?,
	val latestConfirmedBatchNo: String?,
	val latestConfirmedBatchAt: LocalDateTime?,
)

data class ClientPublicProductMasterDetailResponse(
	val item: ClientPublicProductMasterItemResponse,
	val lastUpload: MasterDetailUploadResponse?,
	val usage: MasterUsageSummaryResponse,
	val recentBatches: List<MasterRelatedBatchResponse>,
	val recentOrders: List<MasterRelatedOrderResponse>,
	val validationErrors: List<MasterRelatedValidationErrorResponse>,
)

data class ClientPublicStoreRouteMasterDetailResponse(
	val item: ClientPublicStoreRouteMasterItemResponse,
	val lastUpload: MasterDetailUploadResponse?,
	val usage: MasterUsageSummaryResponse,
	val recentBatches: List<MasterRelatedBatchResponse>,
	val recentOrders: List<MasterRelatedOrderResponse>,
	val validationErrors: List<MasterRelatedValidationErrorResponse>,
)
