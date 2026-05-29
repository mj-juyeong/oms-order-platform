package com.company.oms.master

import com.company.oms.common.persistence.MasterUploadStatus
import com.company.oms.common.response.PageResponse
import org.springframework.context.annotation.Profile
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/v1/masters")
@Profile("local")
class MasterController(
	private val masterUpsertService: MasterUpsertService,
) {

	@PostMapping("/products/uploads", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
	fun uploadProducts(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) uploadedBy: Long?,
		@RequestParam file: MultipartFile,
	): MasterUploadSummaryResponse =
		masterUpsertService.uploadProductMaster(
			tenantId = tenantId,
			file = file,
			uploadedBy = uploadedBy,
		)

	@GetMapping("/products/uploads")
	fun listProductUploads(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) status: MasterUploadStatus?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<MasterUploadHistoryResponse> =
		masterUpsertService.listProductUploads(
			tenantId = tenantId,
			status = status,
			page = page,
			size = size,
		)

	@GetMapping("/products")
	fun listProducts(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) ezadminCode: String?,
		@RequestParam(required = false) productName: String?,
		@RequestParam(required = false) operationStatus: String?,
		@RequestParam(required = false) activeYn: Boolean?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ProductMasterItemResponse> =
		masterUpsertService.listProducts(
			tenantId = tenantId,
			ezadminCode = ezadminCode,
			productName = productName,
			activeYn = activeYn ?: operationStatus.toActiveYn(),
			page = page,
			size = size,
		)

	@PostMapping("/store-routes/uploads", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
	fun uploadStoreRoutes(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) uploadedBy: Long?,
		@RequestParam file: MultipartFile,
	): MasterUploadSummaryResponse =
		masterUpsertService.uploadStoreRouteMaster(
			tenantId = tenantId,
			file = file,
			uploadedBy = uploadedBy,
		)

	@GetMapping("/store-routes/uploads")
	fun listStoreRouteUploads(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) status: MasterUploadStatus?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<MasterUploadHistoryResponse> =
		masterUpsertService.listStoreRouteUploads(
			tenantId = tenantId,
			status = status,
			page = page,
			size = size,
		)

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
	): PageResponse<StoreRouteMasterItemResponse> =
		masterUpsertService.listStoreRoutes(
			tenantId = tenantId,
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

private fun String?.toActiveYn(): Boolean? =
	when (this?.uppercase()) {
		"ACTIVE" -> true
		"INACTIVE" -> false
		else -> null
	}
