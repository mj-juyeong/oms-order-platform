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
import java.nio.file.Files
import java.nio.file.Path
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
	private val masterUploadRowErrorRepository: MasterUploadRowErrorRepository,
	private val productMasterItemRepository: ProductMasterItemRepository,
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
	private val masterConfirmedUsageService: MasterConfirmedUsageService,
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

	@Transactional
	fun previewProductMasterUpload(
		tenantId: Long,
		file: MultipartFile,
		uploadedBy: Long?,
	): MasterUploadPreviewResponse {
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

		val plan = buildProductUploadPlan(tenantId, productMasterCsvParser.parse(bytes))
		savePreviewResult(upload, plan)
		savePreviewFailures(upload, plan.failures)
		return upload.toPreviewResponse(plan)
	}

	@Transactional
	fun previewStoreRouteMasterUpload(
		tenantId: Long,
		file: MultipartFile,
		uploadedBy: Long?,
	): MasterUploadPreviewResponse {
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

		val plan = buildStoreRouteUploadPlan(tenantId, storeRouteMasterExcelParser.parse(bytes))
		savePreviewResult(upload, plan)
		savePreviewFailures(upload, plan.failures)
		return upload.toPreviewResponse(plan)
	}

	@Transactional
	fun applyProductMasterUpload(
		tenantId: Long,
		uploadId: Long,
	): MasterUploadSummaryResponse {
		validateTenant(tenantId)
		val upload = findReviewableUpload(tenantId, uploadId, MasterType.PRODUCT)
		val rows = productMasterCsvParser.parse(readStoredMasterUpload(upload))
		val result = upsertProductRows(tenantId, upload.id!!, rows)
		return finishUpload(upload, result)
	}

	@Transactional
	fun applyStoreRouteMasterUpload(
		tenantId: Long,
		uploadId: Long,
	): MasterUploadSummaryResponse {
		validateTenant(tenantId)
		val upload = findReviewableUpload(tenantId, uploadId, MasterType.STORE_ROUTE)
		val rows = storeRouteMasterExcelParser.parse(readStoredMasterUpload(upload))
		val result = upsertStoreRouteRows(tenantId, upload.id!!, rows)
		return finishUpload(upload, result)
	}

	@Transactional
	fun cancelMasterUpload(
		tenantId: Long,
		uploadId: Long,
		expectedType: MasterType,
	): MasterUploadSummaryResponse {
		validateTenant(tenantId)
		val upload = masterUploadBatchRepository.findById(uploadId)
			.orElseThrow { masterUploadNotFound() }
		if (upload.tenantId != tenantId || upload.masterType != expectedType) {
			throw masterUploadNotFound()
		}
		if (upload.status !in REVIEWABLE_MASTER_UPLOAD_STATUSES && upload.status != MasterUploadStatus.FAILED) {
			throw invalidMasterUploadStatus()
		}

		upload.status = MasterUploadStatus.CANCELLED
		upload.message = "cancelled before applying current master rows"
		return upload.toSummaryResponse()
	}

	@Transactional(readOnly = true)
	fun listMasterUploadRowFailures(
		tenantId: Long,
		uploadId: Long,
		expectedType: MasterType,
	): List<MasterUploadRowFailureResponse> {
		validateTenant(tenantId)
		val upload = masterUploadBatchRepository.findById(uploadId)
			.orElseThrow { masterUploadNotFound() }
		if (upload.tenantId != tenantId || upload.masterType != expectedType) {
			throw masterUploadNotFound()
		}
		return masterUploadRowErrorRepository.findAllByMasterUploadBatchIdOrderByRowNoAscIdAsc(uploadId)
			.map { it.toResponse(objectMapper) }
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
			.let { products ->
				val uploadById = masterUploadBatchRepository.findAllById(products.mapNotNull { it.lastMasterUploadBatchId })
					.associateBy { it.id ?: 0 }
				val usageByCode = masterConfirmedUsageService.latestProductUsageByTenant(tenantId)
				products
					.sortedWith(
						compareByDescending<ProductMasterItemEntity> { usageByCode[it.ezadminCode]?.latestConfirmedAt ?: LocalDateTime.MIN }
							.thenByDescending { uploadById[it.lastMasterUploadBatchId]?.reflectedAt() ?: LocalDateTime.MIN }
							.thenBy { it.ezadminCode },
					)
					.map { it.toResponse(uploadById[it.lastMasterUploadBatchId], usageByCode[it.ezadminCode]) }
			}
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
			.let { storeRoutes ->
				val uploadById = masterUploadBatchRepository.findAllById(storeRoutes.mapNotNull { it.lastMasterUploadBatchId })
					.associateBy { it.id ?: 0 }
				val usageByCode = masterConfirmedUsageService.latestStoreRouteUsageByTenant(tenantId)
				storeRoutes
					.sortedWith(
						compareByDescending<StoreRouteMasterItemEntity> { usageByCode[it.baljugoCode]?.latestConfirmedAt ?: LocalDateTime.MIN }
							.thenByDescending { uploadById[it.lastMasterUploadBatchId]?.reflectedAt() ?: LocalDateTime.MIN }
							.thenBy { it.baljugoCode },
					)
					.map { it.toResponse(uploadById[it.lastMasterUploadBatchId], usageByCode[it.baljugoCode]) }
			}
			.toPage(page, size)

	private fun buildProductUploadPlan(
		tenantId: Long,
		rows: List<ParsedProductMasterRow>,
	): MasterUploadPreviewPlan {
		val seenKeys = mutableSetOf<String>()
		val validRows = mutableListOf<ParsedProductMasterRow>()
		val failures = mutableListOf<MasterUploadRowFailureResponse>()

		rows.forEach { row ->
			val ezadminCode = row.ezadminCode?.trim()
			when {
				ezadminCode.isNullOrBlank() -> failures += row.toFailure(
					columnName = "ezadmin_code",
					errorCode = "MASTER_KEY_REQUIRED",
					message = "상품코드가 비어 있습니다.",
					originalValue = row.ezadminCode,
					keyValue = null,
				)
				!seenKeys.add(ezadminCode) -> failures += row.toFailure(
					columnName = "ezadmin_code",
					errorCode = "DUPLICATE_MASTER_KEY",
					message = "같은 CSV 안에 동일한 상품코드가 있습니다.",
					originalValue = row.ezadminCode,
					keyValue = ezadminCode,
				)
				else -> validRows += row
			}
		}

		return buildPreviewPlan(rows.size, validRows, failures) { row ->
			productMasterItemRepository.findByTenantIdAndEzadminCode(tenantId, row.ezadminCode!!.trim())
				?.let { existing -> if (existing.hasSameContent(row)) CandidateRowAction.UNCHANGED else CandidateRowAction.UPDATE }
				?: CandidateRowAction.INSERT
		}
	}

	private fun buildStoreRouteUploadPlan(
		tenantId: Long,
		rows: List<ParsedStoreRouteMasterRow>,
	): MasterUploadPreviewPlan {
		val seenKeys = mutableSetOf<String>()
		val validRows = mutableListOf<ParsedStoreRouteMasterRow>()
		val failures = mutableListOf<MasterUploadRowFailureResponse>()

		rows.forEach { row ->
			val baljugoCode = row.baljugoCode?.trim()
			when {
				baljugoCode.isNullOrBlank() -> failures += row.toFailure(
					columnName = "baljugo_code",
					errorCode = "MASTER_KEY_REQUIRED",
					message = "발주고코드가 비어 있습니다.",
					originalValue = row.baljugoCode,
					keyValue = null,
				)
				!seenKeys.add(baljugoCode) -> failures += row.toFailure(
					columnName = "baljugo_code",
					errorCode = "DUPLICATE_MASTER_KEY",
					message = "같은 XLSX 안에 동일한 발주고코드가 있습니다.",
					originalValue = row.baljugoCode,
					keyValue = baljugoCode,
				)
				else -> validRows += row
			}
		}

		return buildPreviewPlan(rows.size, validRows, failures) { row ->
			storeRouteMasterItemRepository.findByTenantIdAndBaljugoCode(tenantId, row.baljugoCode!!.trim())
				?.let { existing -> if (existing.hasSameContent(row)) CandidateRowAction.UNCHANGED else CandidateRowAction.UPDATE }
				?: CandidateRowAction.INSERT
		}
	}

	private fun <T> buildPreviewPlan(
		rowCount: Int,
		validRows: List<T>,
		failures: List<MasterUploadRowFailureResponse>,
		resolveAction: (T) -> CandidateRowAction,
	): MasterUploadPreviewPlan {
		var candidateInserted = 0
		var candidateUpdated = 0
		var candidateUnchanged = 0

		validRows.forEach { row ->
			when (resolveAction(row)) {
				CandidateRowAction.INSERT -> candidateInserted++
				CandidateRowAction.UPDATE -> candidateUpdated++
				CandidateRowAction.UNCHANGED -> candidateUnchanged++
			}
		}

		return MasterUploadPreviewPlan(
			rowCount = rowCount,
			validCount = validRows.size,
			failedCount = failures.size,
			candidateInsertedCount = candidateInserted,
			candidateUpdatedCount = candidateUpdated,
			candidateUnchangedCount = candidateUnchanged,
			failures = failures,
		)
	}

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
				existing.lastMasterUploadBatchId = uploadId
				existing.rowNo = row.rowNo
				existing.rawRowJson = objectMapper.writeValueAsString(row.rawRow)
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
				existing.lastMasterUploadBatchId = uploadId
				existing.rowNo = row.rowNo
				existing.rawRowJson = objectMapper.writeValueAsString(row.rawRow)
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

	private fun savePreviewResult(
		upload: MasterUploadBatchEntity,
		plan: MasterUploadPreviewPlan,
	) {
		upload.rowCount = plan.rowCount
		upload.insertedCount = plan.candidateInsertedCount
		upload.updatedCount = plan.candidateUpdatedCount
		upload.unchangedCount = plan.candidateUnchangedCount
		upload.failedCount = plan.failedCount
		upload.status = plan.toStatus()
		upload.message =
			"preview inserted=${plan.candidateInsertedCount}, updated=${plan.candidateUpdatedCount}, unchanged=${plan.candidateUnchangedCount}, failed=${plan.failedCount}"
	}

	private fun savePreviewFailures(
		upload: MasterUploadBatchEntity,
		failures: List<MasterUploadRowFailureResponse>,
	) {
		val uploadId = upload.id ?: return
		masterUploadRowErrorRepository.deleteAllByMasterUploadBatchId(uploadId)
		if (failures.isEmpty()) {
			return
		}

		masterUploadRowErrorRepository.saveAll(
			failures.map { failure ->
				MasterUploadRowErrorEntity(
					tenantId = upload.tenantId,
					masterUploadBatchId = uploadId,
					masterType = upload.masterType,
					rowNo = failure.rowNo,
					columnName = failure.columnName,
					errorCode = failure.errorCode,
					message = failure.message,
					originalValue = failure.originalValue,
					keyValue = failure.keyValue,
					rawRowJson = objectMapper.writeValueAsString(failure.rawRow),
				)
			},
		)
	}

	private fun findReviewableUpload(
		tenantId: Long,
		uploadId: Long,
		expectedType: MasterType,
	): MasterUploadBatchEntity {
		val upload = masterUploadBatchRepository.findById(uploadId)
			.orElseThrow { masterUploadNotFound() }
		if (upload.tenantId != tenantId || upload.masterType != expectedType) {
			throw masterUploadNotFound()
		}
		if (upload.status !in REVIEWABLE_MASTER_UPLOAD_STATUSES) {
			throw invalidMasterUploadStatus()
		}
		return upload
	}

	private fun readStoredMasterUpload(upload: MasterUploadBatchEntity): ByteArray {
		val storedPath = upload.storedPath ?: throw OmsException(
			errorCode = ErrorCode.FILE_UPLOAD_FAILED,
			message = "저장된 마스터 업로드 파일 경로가 없습니다.",
			status = HttpStatus.INTERNAL_SERVER_ERROR,
		)
		return Files.readAllBytes(Path.of(storedPath))
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

	private fun masterUploadNotFound(): OmsException =
		OmsException(
			errorCode = ErrorCode.NOT_FOUND,
			message = "마스터 업로드 이력을 찾을 수 없습니다.",
			status = HttpStatus.NOT_FOUND,
		)

	private fun invalidMasterUploadStatus(): OmsException =
		OmsException(
			errorCode = ErrorCode.INVALID_BATCH_STATUS,
			message = "현재 마스터 업로드 상태에서는 수행할 수 없습니다.",
			status = HttpStatus.BAD_REQUEST,
		)

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

private data class MasterUploadPreviewPlan(
	val rowCount: Int,
	val validCount: Int,
	val failedCount: Int,
	val candidateInsertedCount: Int,
	val candidateUpdatedCount: Int,
	val candidateUnchangedCount: Int,
	val failures: List<MasterUploadRowFailureResponse>,
) {
	fun toStatus(): MasterUploadStatus =
		when {
			failedCount == 0 -> MasterUploadStatus.READY_TO_APPLY
			validCount > 0 -> MasterUploadStatus.REVIEW_REQUIRED
			else -> MasterUploadStatus.FAILED
		}
}

private enum class CandidateRowAction {
	INSERT,
	UPDATE,
	UNCHANGED,
}

private val REVIEWABLE_MASTER_UPLOAD_STATUSES = setOf(
	MasterUploadStatus.READY_TO_APPLY,
	MasterUploadStatus.REVIEW_REQUIRED,
)

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

private fun MasterUploadBatchEntity.toPreviewResponse(plan: MasterUploadPreviewPlan): MasterUploadPreviewResponse =
	MasterUploadPreviewResponse(
		uploadId = id ?: 0,
		rowCount = plan.rowCount,
		validCount = plan.validCount,
		failedCount = plan.failedCount,
		candidateInsertedCount = plan.candidateInsertedCount,
		candidateUpdatedCount = plan.candidateUpdatedCount,
		candidateUnchangedCount = plan.candidateUnchangedCount,
		status = status,
		failures = plan.failures,
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

private fun MasterUploadBatchEntity.reflectedAt(): LocalDateTime =
	appliedAt ?: uploadedAt

private fun ProductMasterItemEntity.toResponse(
	lastUpload: MasterUploadBatchEntity? = null,
	confirmedUsage: MasterConfirmedUsageSummary? = null,
): ProductMasterItemResponse =
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
		lastMasterUploadBatchId = lastMasterUploadBatchId,
		lastMasterUploadedAt = lastUpload?.appliedAt ?: lastUpload?.uploadedAt,
		latestConfirmedBatchId = confirmedUsage?.latestBatchId,
		latestConfirmedBatchNo = confirmedUsage?.latestBatchNo,
		latestConfirmedBatchAt = confirmedUsage?.latestConfirmedAt,
		rowNo = rowNo,
	)

private fun StoreRouteMasterItemEntity.toResponse(
	lastUpload: MasterUploadBatchEntity? = null,
	confirmedUsage: MasterConfirmedUsageSummary? = null,
): StoreRouteMasterItemResponse =
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
		lastMasterUploadBatchId = lastMasterUploadBatchId,
		lastMasterUploadedAt = lastUpload?.appliedAt ?: lastUpload?.uploadedAt,
		latestConfirmedBatchId = confirmedUsage?.latestBatchId,
		latestConfirmedBatchNo = confirmedUsage?.latestBatchNo,
		latestConfirmedBatchAt = confirmedUsage?.latestConfirmedAt,
		rowNo = rowNo,
	)

private fun ParsedProductMasterRow.toFailure(
	columnName: String,
	errorCode: String,
	message: String,
	originalValue: String?,
	keyValue: String?,
): MasterUploadRowFailureResponse =
	MasterUploadRowFailureResponse(
		rowNo = rowNo,
		columnName = columnName,
		errorCode = errorCode,
		message = message,
		originalValue = originalValue,
		keyValue = keyValue,
		rawRow = rawRow,
	)

private fun ParsedStoreRouteMasterRow.toFailure(
	columnName: String,
	errorCode: String,
	message: String,
	originalValue: String?,
	keyValue: String?,
): MasterUploadRowFailureResponse =
	MasterUploadRowFailureResponse(
		rowNo = rowNo,
		columnName = columnName,
		errorCode = errorCode,
		message = message,
		originalValue = originalValue,
		keyValue = keyValue,
		rawRow = rawRow,
	)

private fun MasterUploadRowErrorEntity.toResponse(objectMapper: ObjectMapper): MasterUploadRowFailureResponse =
	MasterUploadRowFailureResponse(
		rowNo = rowNo,
		columnName = columnName,
		errorCode = errorCode,
		message = message,
		originalValue = originalValue,
		keyValue = keyValue,
		rawRow = rawRowJson.toStringMap(objectMapper),
	)

private fun String?.toStringMap(objectMapper: ObjectMapper): Map<String, String> =
	this
		?.let {
			runCatching {
				objectMapper.readValue(it, Map::class.java)
					.entries
					.associate { entry -> entry.key.toString() to (entry.value?.toString() ?: "") }
			}.getOrDefault(emptyMap())
		}
		?: emptyMap()

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
