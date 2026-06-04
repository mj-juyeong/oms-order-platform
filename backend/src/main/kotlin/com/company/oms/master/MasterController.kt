package com.company.oms.master

import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.MasterType
import com.company.oms.common.persistence.MasterUploadStatus
import com.company.oms.common.persistence.UserScopeType
import com.company.oms.common.response.PageResponse
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/v1/masters")
@Profile("local")
class MasterController(
	private val masterUpsertService: MasterUpsertService,
	private val masterDetailService: MasterDetailService,
	private val clientCodeMappingService: ClientCodeMappingService,
	private val accessScopeService: AccessScopeService,
) {

	@PostMapping("/products/uploads", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
	fun uploadProducts(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) uploadedBy: Long?,
		@RequestParam file: MultipartFile,
	): MasterUploadSummaryResponse {
		val resolvedTenantId = requireWritableTenant(tenantId)
		return masterUpsertService.uploadProductMaster(
			tenantId = resolvedTenantId,
			file = file,
			uploadedBy = uploadedBy,
		)
	}

	@PostMapping("/products/uploads/preview", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
	fun previewProductUpload(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) uploadedBy: Long?,
		@RequestParam file: MultipartFile,
	): MasterUploadPreviewResponse {
		val resolvedTenantId = requireWritableTenant(tenantId)
		return masterUpsertService.previewProductMasterUpload(
			tenantId = resolvedTenantId,
			file = file,
			uploadedBy = uploadedBy,
		)
	}

	@PostMapping("/products/uploads/{uploadId}/apply")
	fun applyProductUpload(
		@PathVariable uploadId: Long,
		@RequestParam tenantId: Long,
	): MasterUploadSummaryResponse {
		val resolvedTenantId = requireWritableTenant(tenantId)
		return masterUpsertService.applyProductMasterUpload(
			tenantId = resolvedTenantId,
			uploadId = uploadId,
		)
	}

	@PostMapping("/products/uploads/{uploadId}/cancel")
	fun cancelProductUpload(
		@PathVariable uploadId: Long,
		@RequestParam tenantId: Long,
	): MasterUploadSummaryResponse {
		val resolvedTenantId = requireWritableTenant(tenantId)
		return masterUpsertService.cancelMasterUpload(
			tenantId = resolvedTenantId,
			uploadId = uploadId,
			expectedType = MasterType.PRODUCT,
		)
	}

	@GetMapping("/products/uploads/{uploadId}/row-errors")
	fun listProductUploadRowErrors(
		@PathVariable uploadId: Long,
		@RequestParam tenantId: Long,
	): List<MasterUploadRowFailureResponse> {
		val resolvedTenantId = requireReadableTenant(tenantId)
		return masterUpsertService.listMasterUploadRowFailures(
			tenantId = resolvedTenantId,
			uploadId = uploadId,
			expectedType = MasterType.PRODUCT,
		)
	}

	@GetMapping("/products/uploads")
	fun listProductUploads(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) status: MasterUploadStatus?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<MasterUploadHistoryResponse> {
		val resolvedTenantId = requireReadableTenant(tenantId)
		return masterUpsertService.listProductUploads(
			tenantId = resolvedTenantId,
			status = status,
			page = page,
			size = size,
		)
	}

	@GetMapping("/products")
	fun listProducts(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) ezadminCode: String?,
		@RequestParam(required = false) productName: String?,
		@RequestParam(required = false) operationStatus: String?,
		@RequestParam(required = false) activeYn: Boolean?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ProductMasterItemResponse> {
		val resolvedTenantId = requireReadableTenant(tenantId)
		return masterUpsertService.listProducts(
			tenantId = resolvedTenantId,
			ezadminCode = ezadminCode,
			productName = productName,
			activeYn = activeYn ?: operationStatus.toActiveYn(),
			page = page,
			size = size,
		)
	}

	@GetMapping("/products/{productId}")
	fun getProductDetail(
		@PathVariable productId: Long,
		@RequestParam tenantId: Long,
	): ProductMasterDetailResponse {
		val resolvedTenantId = requireReadableTenant(tenantId)
		return masterDetailService.getProductDetail(resolvedTenantId, productId)
	}

	@PostMapping("/store-routes/uploads", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
	fun uploadStoreRoutes(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) uploadedBy: Long?,
		@RequestParam file: MultipartFile,
	): MasterUploadSummaryResponse {
		val resolvedTenantId = requireWritableTenant(tenantId)
		return masterUpsertService.uploadStoreRouteMaster(
			tenantId = resolvedTenantId,
			file = file,
			uploadedBy = uploadedBy,
		)
	}

	@PostMapping("/store-routes/uploads/preview", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
	fun previewStoreRouteUpload(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) uploadedBy: Long?,
		@RequestParam file: MultipartFile,
	): MasterUploadPreviewResponse {
		val resolvedTenantId = requireWritableTenant(tenantId)
		return masterUpsertService.previewStoreRouteMasterUpload(
			tenantId = resolvedTenantId,
			file = file,
			uploadedBy = uploadedBy,
		)
	}

	@PostMapping("/store-routes/uploads/{uploadId}/apply")
	fun applyStoreRouteUpload(
		@PathVariable uploadId: Long,
		@RequestParam tenantId: Long,
	): MasterUploadSummaryResponse {
		val resolvedTenantId = requireWritableTenant(tenantId)
		return masterUpsertService.applyStoreRouteMasterUpload(
			tenantId = resolvedTenantId,
			uploadId = uploadId,
		)
	}

	@PostMapping("/store-routes/uploads/{uploadId}/cancel")
	fun cancelStoreRouteUpload(
		@PathVariable uploadId: Long,
		@RequestParam tenantId: Long,
	): MasterUploadSummaryResponse {
		val resolvedTenantId = requireWritableTenant(tenantId)
		return masterUpsertService.cancelMasterUpload(
			tenantId = resolvedTenantId,
			uploadId = uploadId,
			expectedType = MasterType.STORE_ROUTE,
		)
	}

	@GetMapping("/store-routes/uploads/{uploadId}/row-errors")
	fun listStoreRouteUploadRowErrors(
		@PathVariable uploadId: Long,
		@RequestParam tenantId: Long,
	): List<MasterUploadRowFailureResponse> {
		val resolvedTenantId = requireReadableTenant(tenantId)
		return masterUpsertService.listMasterUploadRowFailures(
			tenantId = resolvedTenantId,
			uploadId = uploadId,
			expectedType = MasterType.STORE_ROUTE,
		)
	}

	@GetMapping("/store-routes/uploads")
	fun listStoreRouteUploads(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) status: MasterUploadStatus?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<MasterUploadHistoryResponse> {
		val resolvedTenantId = requireReadableTenant(tenantId)
		return masterUpsertService.listStoreRouteUploads(
			tenantId = resolvedTenantId,
			status = status,
			page = page,
			size = size,
		)
	}

	@GetMapping("/store-routes")
	fun listStoreRoutes(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) baljugoCode: String?,
		@RequestParam(required = false) storeCode: String?,
		@RequestParam(required = false) customerCode: String?,
		@RequestParam(required = false) brandName: String?,
		@RequestParam(required = false) storeName: String?,
		@RequestParam(required = false) area: String?,
		@RequestParam(required = false) deliveryRound: String?,
		@RequestParam(required = false) vehicleName: String?,
		@RequestParam(required = false) operationStatus: String?,
		@RequestParam(required = false) activeYn: Boolean?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<StoreRouteMasterItemResponse> {
		val resolvedTenantId = requireReadableTenant(tenantId)
		return masterUpsertService.listStoreRoutes(
			tenantId = resolvedTenantId,
			baljugoCode = baljugoCode,
			customerCode = customerCode ?: storeCode,
			brandName = brandName,
			storeName = storeName,
			area = area,
			deliveryRound = deliveryRound,
			vehicleName = vehicleName,
			activeYn = activeYn ?: operationStatus.toActiveYn(),
			page = page,
			size = size,
		)
	}

	@GetMapping("/store-routes/{storeRouteId}")
	fun getStoreRouteDetail(
		@PathVariable storeRouteId: Long,
		@RequestParam tenantId: Long,
	): StoreRouteMasterDetailResponse {
		val resolvedTenantId = requireReadableTenant(tenantId)
		return masterDetailService.getStoreRouteDetail(resolvedTenantId, storeRouteId)
	}

	@GetMapping("/client-product-code-mappings")
	fun listClientProductCodeMappings(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@RequestParam(required = false) clientProductCode: String?,
		@RequestParam(required = false) ezadminCode: String?,
		@RequestParam(required = false) activeYn: Boolean?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ClientProductCodeMappingResponse> {
		val scope = requireWritableClient(tenantId, clientId)
		return clientCodeMappingService.listProductMappings(
			tenantId = scope.tenantId,
			clientId = requireNotNull(scope.clientId),
			clientProductCode = clientProductCode,
			ezadminCode = ezadminCode,
			activeYn = activeYn,
			page = page,
			size = size,
		)
	}

	@PostMapping("/client-product-code-mappings")
	fun upsertClientProductCodeMapping(
		@RequestBody request: ClientProductCodeMappingUpsertRequest,
	): ClientProductCodeMappingResponse {
		requireWritableClient(request.tenantId, request.clientId)
		return clientCodeMappingService.upsertProductMapping(request)
	}

	@GetMapping("/client-store-code-mappings")
	fun listClientStoreCodeMappings(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@RequestParam(required = false) clientStoreCode: String?,
		@RequestParam(required = false) baljugoCode: String?,
		@RequestParam(required = false) activeYn: Boolean?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ClientStoreCodeMappingResponse> {
		val scope = requireWritableClient(tenantId, clientId)
		return clientCodeMappingService.listStoreMappings(
			tenantId = scope.tenantId,
			clientId = requireNotNull(scope.clientId),
			clientStoreCode = clientStoreCode,
			baljugoCode = baljugoCode,
			activeYn = activeYn,
			page = page,
			size = size,
		)
	}

	@PostMapping("/client-store-code-mappings")
	fun upsertClientStoreCodeMapping(
		@RequestBody request: ClientStoreCodeMappingUpsertRequest,
	): ClientStoreCodeMappingResponse {
		requireWritableClient(request.tenantId, request.clientId)
		return clientCodeMappingService.upsertStoreMapping(request)
	}

	private fun requireReadableTenant(tenantId: Long): Long {
		val currentUser =
			accessScopeService.requireAnyRole(
				UserRole.VIEWER,
				UserRole.OPERATOR,
				UserRole.ADMIN,
				UserRole.SYSTEM_ADMIN,
			)
		if (currentUser.userScopeType == UserScopeType.CLIENT) {
			throw OmsException(
				errorCode = ErrorCode.FORBIDDEN,
				message = "CLIENT users must use the public master API.",
				status = HttpStatus.FORBIDDEN,
			)
		}
		return accessScopeService.requireTenantAccess(tenantId)
	}

	private fun requireWritableTenant(tenantId: Long): Long {
		accessScopeService.requireTenantAdmin()
		return accessScopeService.requireTenantAccess(tenantId)
	}

	private fun requireWritableClient(
		tenantId: Long,
		clientId: Long,
	) = accessScopeService.requireClientAccess(
		tenantId = requireWritableTenant(tenantId),
		clientId = clientId,
	)
}

private fun String?.toActiveYn(): Boolean? =
	when (this?.uppercase()) {
		"ACTIVE" -> true
		"INACTIVE" -> false
		else -> null
	}
