package com.company.oms.master

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.MasterType
import com.company.oms.common.persistence.MasterUploadStatus
import com.company.oms.common.request.RequestContext
import com.company.oms.common.response.PageResponse
import com.company.oms.common.scope.TenantRepository
import com.company.oms.upload.storage.FileStorage
import com.company.oms.upload.storage.StoreFileCommand
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import tools.jackson.databind.ObjectMapper
import java.math.BigDecimal
import java.time.LocalDateTime
import kotlin.math.ceil

@Service
@Profile("local")
class MasterUpsertService(
	private val tenantRepository: TenantRepository,
	private val fileStorage: FileStorage,
	private val productMasterCsvParser: ProductMasterCsvParser,
	private val storeRouteMasterExcelParser: StoreRouteMasterExcelParser,
	private val masterUploadBatchRepository: MasterUploadBatchRepository,
	private val productMasterItemRepository: ProductMasterItemRepository,
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
	private val objectMapper: ObjectMapper,
) {

	@Transactional
	fun uploadProductMaster(
		tenantId: Long,
		file: MultipartFile,
		uploadedBy: Long?,
	): MasterUploadSummaryResponse {
		validateTenant(tenantId)
		validateExtension(file, "csv")

		val bytes = file.bytes
		val storedFile = storeMasterFile(tenantId, MasterType.PRODUCT, file)
		val upload = masterUploadBatchRepository.saveAndFlush(
			MasterUploadBatchEntity(
				tenantId = tenantId,
				masterType = MasterType.PRODUCT,
				status = MasterUploadStatus.PROCESSING,
				originalFileName = storedFile.originalFileName,
				storedPath = storedFile.storedPath,
				fileHash = storedFile.fileHash,
				fileSize = storedFile.fileSize,
				contentType = storedFile.contentType,
				uploadedBy = uploadedBy,
				requestId = RequestContext.getRequestId(),
			),
		)

		val result = upsertProductRows(tenantId, upload.id!!, productMasterCsvParser.parse(bytes))
		return finishUpload(upload, result)
	}

	@Transactional
	fun uploadStoreRouteMaster(
		tenantId: Long,
		file: MultipartFile,
		uploadedBy: Long?,
	): MasterUploadSummaryResponse {
		validateTenant(tenantId)
		validateExtension(file, "xlsx")

		val bytes = file.bytes
		val storedFile = storeMasterFile(tenantId, MasterType.STORE_ROUTE, file)
		val upload = masterUploadBatchRepository.saveAndFlush(
			MasterUploadBatchEntity(
				tenantId = tenantId,
				masterType = MasterType.STORE_ROUTE,
				status = MasterUploadStatus.PROCESSING,
				originalFileName = storedFile.originalFileName,
				storedPath = storedFile.storedPath,
				fileHash = storedFile.fileHash,
				fileSize = storedFile.fileSize,
				contentType = storedFile.contentType,
				uploadedBy = uploadedBy,
				requestId = RequestContext.getRequestId(),
			),
		)

		val result = upsertStoreRouteRows(tenantId, upload.id!!, storeRouteMasterExcelParser.parse(bytes))
		return finishUpload(upload, result)
	}

	@Transactional(readOnly = true)
	fun listProductUploads(
		tenantId: Long,
		status: MasterUploadStatus?,
		page: Int,
		size: Int,
	): PageResponse<MasterUploadHistoryResponse> =
		masterUploadBatchRepository.findAllByTenantIdAndMasterType(tenantId, MasterType.PRODUCT)
			.filter { status == null || it.status == status }
			.sortedByDescending { it.uploadedAt }
			.map { it.toHistoryResponse() }
			.toPage(page, size)

	@Transactional(readOnly = true)
	fun listStoreRouteUploads(
		tenantId: Long,
		status: MasterUploadStatus?,
		page: Int,
		size: Int,
	): PageResponse<MasterUploadHistoryResponse> =
		masterUploadBatchRepository.findAllByTenantIdAndMasterType(tenantId, MasterType.STORE_ROUTE)
			.filter { status == null || it.status == status }
			.sortedByDescending { it.uploadedAt }
			.map { it.toHistoryResponse() }
			.toPage(page, size)

	@Transactional(readOnly = true)
	fun listProducts(
		tenantId: Long,
		ezadminCode: String?,
		productName: String?,
		activeYn: Boolean?,
		page: Int,
		size: Int,
	): PageResponse<ProductMasterItemResponse> =
		(activeYn?.let { productMasterItemRepository.findAllByTenantIdAndActiveYn(tenantId, it) }
			?: productMasterItemRepository.findAllByTenantId(tenantId))
			.filter { ezadminCode.isNullOrBlank() || it.ezadminCode.contains(ezadminCode.trim(), ignoreCase = true) }
			.filter { productName.isNullOrBlank() || it.productName?.contains(productName.trim(), ignoreCase = true) == true }
			.sortedBy { it.ezadminCode }
			.map { it.toResponse() }
			.toPage(page, size)

	@Transactional(readOnly = true)
	fun listStoreRoutes(
		tenantId: Long,
		baljugoCode: String?,
		customerCode: String?,
		brandName: String?,
		storeName: String?,
		area: String?,
		deliveryRound: String?,
		vehicleName: String?,
		activeYn: Boolean?,
		page: Int,
		size: Int,
	): PageResponse<StoreRouteMasterItemResponse> =
		(activeYn?.let { storeRouteMasterItemRepository.findAllByTenantIdAndActiveYn(tenantId, it) }
			?: storeRouteMasterItemRepository.findAllByTenantId(tenantId))
			.filter { baljugoCode.isNullOrBlank() || it.baljugoCode.contains(baljugoCode.trim(), ignoreCase = true) }
			.filter { customerCode.isNullOrBlank() || it.customerCode?.contains(customerCode.trim(), ignoreCase = true) == true }
			.filter { brandName.isNullOrBlank() || it.brandName?.contains(brandName.trim(), ignoreCase = true) == true }
			.filter { storeName.isNullOrBlank() || it.storeName?.contains(storeName.trim(), ignoreCase = true) == true }
			.filter { area.isNullOrBlank() || it.area?.contains(area.trim(), ignoreCase = true) == true }
			.filter { deliveryRound.isNullOrBlank() || it.deliveryRound?.contains(deliveryRound.trim(), ignoreCase = true) == true }
			.filter { vehicleName.isNullOrBlank() || it.vehicleName?.contains(vehicleName.trim(), ignoreCase = true) == true }
			.sortedBy { it.baljugoCode }
			.map { it.toResponse() }
			.toPage(page, size)

	private fun upsertProductRows(
		tenantId: Long,
		uploadId: Long,
		rows: List<ParsedProductMasterRow>,
	): UpsertCounts {
		val seenKeys = mutableSetOf<String>()
		var inserted = 0
		var updated = 0
		var unchanged = 0
		var failed = 0

		rows.forEach { row ->
			val ezadminCode = row.ezadminCode?.trim()
			if (ezadminCode.isNullOrBlank() || !seenKeys.add(ezadminCode)) {
				failed++
				return@forEach
			}

			val existing = productMasterItemRepository.findByTenantIdAndEzadminCode(tenantId, ezadminCode)
			if (existing == null) {
				productMasterItemRepository.save(
					ProductMasterItemEntity(
						tenantId = tenantId,
						ezadminCode = ezadminCode,
						productName = row.productName,
						customerProductCode = row.customerProductCode,
						boxQty = row.boxQty,
						outboundUnit = row.outboundUnit,
						temperatureType = row.temperatureType,
						cbm = row.cbm,
						activeYn = true,
						lastMasterUploadBatchId = uploadId,
						rowNo = row.rowNo,
						rawRowJson = objectMapper.writeValueAsString(row.rawRow),
					),
				)
				inserted++
			} else if (existing.hasSameContent(row)) {
				unchanged++
			} else {
				existing.productName = row.productName
				existing.customerProductCode = row.customerProductCode
				existing.boxQty = row.boxQty
				existing.outboundUnit = row.outboundUnit
				existing.temperatureType = row.temperatureType
				existing.cbm = row.cbm
				existing.activeYn = true
				existing.lastMasterUploadBatchId = uploadId
				existing.rowNo = row.rowNo
				existing.rawRowJson = objectMapper.writeValueAsString(row.rawRow)
				updated++
			}
		}

		return UpsertCounts(
			rowCount = rows.size,
			insertedCount = inserted,
			updatedCount = updated,
			unchangedCount = unchanged,
			failedCount = failed,
		)
	}

	private fun upsertStoreRouteRows(
		tenantId: Long,
		uploadId: Long,
		rows: List<ParsedStoreRouteMasterRow>,
	): UpsertCounts {
		val seenKeys = mutableSetOf<String>()
		var inserted = 0
		var updated = 0
		var unchanged = 0
		var failed = 0

		rows.forEach { row ->
			val baljugoCode = row.baljugoCode?.trim()
			if (baljugoCode.isNullOrBlank() || !seenKeys.add(baljugoCode)) {
				failed++
				return@forEach
			}

			val existing = storeRouteMasterItemRepository.findByTenantIdAndBaljugoCode(tenantId, baljugoCode)
			if (existing == null) {
				storeRouteMasterItemRepository.save(
					StoreRouteMasterItemEntity(
						tenantId = tenantId,
						baljugoCode = baljugoCode,
						customerCode = row.customerCode,
						brandName = row.brandName,
						storeName = row.storeName,
						area = row.area,
						deliveryDay = row.deliveryDay,
						deliveryRound = row.deliveryRound,
						vehicleName = row.vehicleName,
						driverName = row.driverName,
						address = row.address,
						activeYn = row.activeYn ?: true,
						lastMasterUploadBatchId = uploadId,
						rowNo = row.rowNo,
						rawRowJson = objectMapper.writeValueAsString(row.rawRow),
					),
				)
				inserted++
			} else if (existing.hasSameContent(row)) {
				unchanged++
			} else {
				existing.customerCode = row.customerCode
				existing.brandName = row.brandName
				existing.storeName = row.storeName
				existing.area = row.area
				existing.deliveryDay = row.deliveryDay
				existing.deliveryRound = row.deliveryRound
				existing.vehicleName = row.vehicleName
				existing.driverName = row.driverName
				existing.address = row.address
				existing.activeYn = row.activeYn ?: true
				existing.lastMasterUploadBatchId = uploadId
				existing.rowNo = row.rowNo
				existing.rawRowJson = objectMapper.writeValueAsString(row.rawRow)
				updated++
			}
		}

		return UpsertCounts(
			rowCount = rows.size,
			insertedCount = inserted,
			updatedCount = updated,
			unchangedCount = unchanged,
			failedCount = failed,
		)
	}

	private fun finishUpload(
		upload: MasterUploadBatchEntity,
		counts: UpsertCounts,
	): MasterUploadSummaryResponse {
		upload.rowCount = counts.rowCount
		upload.insertedCount = counts.insertedCount
		upload.updatedCount = counts.updatedCount
		upload.unchangedCount = counts.unchangedCount
		upload.failedCount = counts.failedCount
		upload.status = counts.toStatus()
		upload.appliedAt = LocalDateTime.now()
		upload.message = "inserted=${counts.insertedCount}, updated=${counts.updatedCount}, unchanged=${counts.unchangedCount}, failed=${counts.failedCount}"

		return upload.toSummaryResponse()
	}

	private fun validateTenant(tenantId: Long) {
		if (!tenantRepository.existsById(tenantId)) {
			throw OmsException(
				errorCode = ErrorCode.NOT_FOUND,
				message = "물류사를 찾을 수 없습니다.",
				status = HttpStatus.NOT_FOUND,
			)
		}
	}

	private fun validateExtension(file: MultipartFile, expectedExtension: String) {
		val fileName = file.originalFilename.orEmpty()
		val extension = fileName.substringAfterLast('.', missingDelimiterValue = "").lowercase()
		if (extension != expectedExtension) {
			throw OmsException(
				errorCode = ErrorCode.INVALID_FILE_EXTENSION,
				message = ".$expectedExtension 파일만 업로드할 수 있습니다.",
				status = HttpStatus.BAD_REQUEST,
			)
		}
	}

	private fun storeMasterFile(
		tenantId: Long,
		masterType: MasterType,
		file: MultipartFile,
	) = fileStorage.store(
		StoreFileCommand(
			originalFileName = file.originalFilename ?: "master-upload",
			contentType = file.contentType,
			size = file.size,
			inputStream = file.inputStream,
			directory = "masters/$tenantId/${masterType.name.lowercase()}",
		),
	)
}

private data class UpsertCounts(
	val rowCount: Int,
	val insertedCount: Int,
	val updatedCount: Int,
	val unchangedCount: Int,
	val failedCount: Int,
) {
	fun toStatus(): MasterUploadStatus =
		when {
			failedCount == 0 -> MasterUploadStatus.APPLIED
			insertedCount + updatedCount + unchangedCount > 0 -> MasterUploadStatus.PARTIAL_FAILED
			else -> MasterUploadStatus.FAILED
		}
}

private fun ProductMasterItemEntity.hasSameContent(row: ParsedProductMasterRow): Boolean =
	productName == row.productName &&
		customerProductCode == row.customerProductCode &&
		boxQty.sameDecimal(row.boxQty) &&
		outboundUnit == row.outboundUnit &&
		temperatureType == row.temperatureType &&
		cbm.sameDecimal(row.cbm) &&
		activeYn

private fun StoreRouteMasterItemEntity.hasSameContent(row: ParsedStoreRouteMasterRow): Boolean =
	customerCode == row.customerCode &&
		brandName == row.brandName &&
		storeName == row.storeName &&
		area == row.area &&
		deliveryDay == row.deliveryDay &&
	deliveryRound == row.deliveryRound &&
	vehicleName == row.vehicleName &&
	driverName == row.driverName &&
	address == row.address &&
	activeYn == (row.activeYn ?: true)

private fun BigDecimal?.sameDecimal(other: BigDecimal?): Boolean =
	when {
		this == null && other == null -> true
		this == null || other == null -> false
		else -> this.compareTo(other) == 0
	}

private fun MasterUploadBatchEntity.toSummaryResponse(): MasterUploadSummaryResponse =
	MasterUploadSummaryResponse(
		uploadId = id ?: 0,
		rowCount = rowCount,
		insertedCount = insertedCount,
		updatedCount = updatedCount,
		unchangedCount = unchangedCount,
		failedCount = failedCount,
		status = status,
	)

private fun MasterUploadBatchEntity.toHistoryResponse(): MasterUploadHistoryResponse =
	MasterUploadHistoryResponse(
		id = id ?: 0,
		masterType = masterType.name,
		fileName = originalFileName,
		rowCount = rowCount,
		insertedCount = insertedCount,
		updatedCount = updatedCount,
		unchangedCount = unchangedCount,
		failedCount = failedCount,
		status = status,
		uploadedAt = uploadedAt,
		appliedAt = appliedAt,
		message = message,
	)

private fun ProductMasterItemEntity.toResponse(): ProductMasterItemResponse =
	ProductMasterItemResponse(
		id = id ?: 0,
		ezadminCode = ezadminCode,
		productName = productName,
		customerProductCode = customerProductCode,
		boxQty = boxQty,
		outboundUnit = outboundUnit,
		temperatureType = temperatureType,
		cbm = cbm,
		activeYn = activeYn,
		rowNo = rowNo,
	)

private fun StoreRouteMasterItemEntity.toResponse(): StoreRouteMasterItemResponse =
	StoreRouteMasterItemResponse(
		id = id ?: 0,
		baljugoCode = baljugoCode,
		customerCode = customerCode,
		brandName = brandName,
		storeName = storeName,
		area = area,
		deliveryDay = deliveryDay,
		deliveryRound = deliveryRound,
		vehicleName = vehicleName,
		driverName = driverName,
		address = address,
		activeYn = activeYn,
		rowNo = rowNo,
	)

private fun <T> List<T>.toPage(page: Int, size: Int): PageResponse<T> {
	val safePage = page.coerceAtLeast(0)
	val safeSize = size.coerceIn(1, 200)
	val from = (safePage * safeSize).coerceAtMost(this.size)
	val to = (from + safeSize).coerceAtMost(this.size)

	return PageResponse(
		items = subList(from, to),
		page = safePage,
		size = safeSize,
		totalElements = this.size.toLong(),
		totalPages = if (isEmpty()) 0 else ceil(this.size.toDouble() / safeSize).toInt(),
	)
}
