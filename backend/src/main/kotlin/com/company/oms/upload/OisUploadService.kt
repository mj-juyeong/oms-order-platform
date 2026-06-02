package com.company.oms.upload

import com.company.oms.batch.BatchConfirmationRequestEntity
import com.company.oms.batch.BatchConfirmationRequestRepository
import com.company.oms.batch.UploadBatchEntity
import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.BatchConfirmationRequestStatus
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.response.PageResponse
import com.company.oms.common.scope.ClientRepository
import com.company.oms.common.scope.TenantRepository
import com.company.oms.excel.ExcelSheetResultEntity
import com.company.oms.excel.ExcelSheetResultRepository
import com.company.oms.excel.OisExcelParser
import com.company.oms.excel.ParsedLabelRow
import com.company.oms.excel.ParsedOisWorkbook
import com.company.oms.excel.ParsedPlRow
import com.company.oms.excel.ParsedScanRow
import com.company.oms.label.LabelLineEntity
import com.company.oms.label.LabelLineRepository
import com.company.oms.order.OrderLineEntity
import com.company.oms.order.OrderLineRepository
import com.company.oms.pl.PlLineEntity
import com.company.oms.pl.PlLineRepository
import com.company.oms.scan.ScanLineEntity
import com.company.oms.scan.ScanLineRepository
import com.company.oms.upload.storage.FileStorage
import com.company.oms.upload.storage.StoreFileCommand
import org.springframework.context.annotation.Profile
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import tools.jackson.databind.ObjectMapper
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID
import kotlin.math.ceil

@Service
@Profile("local")
class OisUploadService(
	private val tenantRepository: TenantRepository,
	private val clientRepository: ClientRepository,
	private val uploadBatchRepository: UploadBatchRepository,
	private val uploadedFileRepository: UploadedFileRepository,
	private val excelSheetResultRepository: ExcelSheetResultRepository,
	private val scanLineRepository: ScanLineRepository,
	private val plLineRepository: PlLineRepository,
	private val labelLineRepository: LabelLineRepository,
	private val orderLineRepository: OrderLineRepository,
	private val confirmationRequestRepository: BatchConfirmationRequestRepository,
	private val fileStorage: FileStorage,
	private val oisExcelParser: OisExcelParser,
	private val objectMapper: ObjectMapper,
) {

	@Transactional
	fun uploadOrderExcel(
		tenantId: Long,
		clientId: Long,
		file: MultipartFile,
		memo: String?,
		uploadedBy: Long?,
		parentBatchId: Long?,
		reuploadReason: String?,
	): OisUploadResponse {
		validateScope(tenantId, clientId)
		validateExtension(file)
		val supplement = resolveSupplementBatch(tenantId, clientId, parentBatchId, reuploadReason)

		val bytes = file.bytes
		val parsed = oisExcelParser.parse(bytes)
		val deliveryDate = representativeDeliveryDate(parsed)
		val batch = uploadBatchRepository.saveAndFlush(
			UploadBatchEntity(
				tenantId = tenantId,
				clientId = clientId,
				batchNo = generateBatchNo(),
				parentBatchId = supplement?.parentBatchId,
				revisionNo = supplement?.revisionNo ?: 1,
				reuploadReason = supplement?.reuploadReason,
				status = BatchStatus.UPLOADED,
				deliveryDate = deliveryDate,
				uploadedBy = uploadedBy,
				memo = supplement?.memo ?: memo,
			),
		)
		val batchId = batch.id!!

		val storedFile = fileStorage.store(
			StoreFileCommand(
				originalFileName = file.originalFilename ?: "ois-upload.xlsx",
				contentType = file.contentType,
				size = file.size,
				inputStream = file.inputStream,
				directory = "order-excel/$tenantId/$clientId/$batchId",
			),
		)
		val uploadedFile = uploadedFileRepository.saveAndFlush(
			UploadedFileEntity(
				tenantId = tenantId,
				clientId = clientId,
				batchId = batchId,
				fileType = "ORDER_EXCEL",
				originalFileName = storedFile.originalFileName,
				storedPath = storedFile.storedPath,
				fileHash = storedFile.fileHash,
				fileSize = storedFile.fileSize,
				contentType = storedFile.contentType,
				createdBy = uploadedBy,
			),
		)

		val sheetResults = excelSheetResultRepository.saveAllAndFlush(
			parsed.sheets.map { sheet ->
				ExcelSheetResultEntity(
					tenantId = tenantId,
					clientId = clientId,
					batchId = batchId,
					sheetName = sheet.sheetName,
					sheetType = sheet.sheetType,
					suffixValue = sheet.suffixValue,
					headerRowNo = sheet.headerRowNo,
					dataRowCount = sheet.dataRowCount,
					status = sheet.status,
					message = sheet.message,
				)
			},
		).toList()

		val scanLines = scanLineRepository.saveAll(parsed.scanRows.map { it.toEntity(tenantId, clientId, batchId) }).toList()
		val plLines = plLineRepository.saveAll(parsed.plRows.map { it.toEntity(tenantId, clientId, batchId) }).toList()
		val labelLines = labelLineRepository.saveAll(parsed.labelRows.map { it.toEntity(tenantId, clientId, batchId) }).toList()
		val orderLines = orderLineRepository.saveAll(plLines.mapNotNull { it.toOrderLineEntity() }).toList()

		return OisUploadResponse(
			batchId = batchId,
			tenantId = tenantId,
			clientId = clientId,
			parentBatchId = batch.parentBatchId,
			revisionNo = batch.revisionNo,
			status = batch.status,
			batchNo = batch.batchNo,
			deliveryDate = batch.deliveryDate,
			fileName = uploadedFile.originalFileName,
			sheetResults = sheetResults.map { it.toResponse() },
			scanLineCount = scanLines.size,
			plLineCount = plLines.size,
			labelLineCount = labelLines.size,
			orderLineCount = orderLines.size,
		)
	}

	@Transactional(readOnly = true)
	fun listBatches(
		tenantId: Long,
		clientId: Long?,
		status: BatchStatus?,
		keyword: String?,
		deliveryDateFrom: LocalDate?,
		deliveryDateTo: LocalDate?,
		errorOnly: Boolean,
		page: Int,
		size: Int,
	): PageResponse<OisBatchSummaryResponse> {
		validateScope(tenantId, clientId)
		val safePage = page.coerceAtLeast(0)
		val safeSize = size.coerceIn(1, 200)
		return uploadBatchRepository.findAll(
			batchSearchSpec(
				tenantId = tenantId,
				clientId = clientId,
				status = status,
				keyword = keyword?.trim()?.takeIf { it.isNotBlank() },
				deliveryDateFrom = deliveryDateFrom,
				deliveryDateTo = deliveryDateTo,
				errorOnly = errorOnly,
			),
			PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "uploadedAt")),
		).toResponsePage { it.toSummaryResponse() }
	}

	@Transactional(readOnly = true)
	fun getBatch(
		tenantId: Long,
		clientId: Long?,
		batchId: Long,
	): OisBatchDetailResponse {
		validateScope(tenantId, clientId)
		val batch = uploadBatchRepository.findById(batchId)
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.orElseThrow {
				OmsException(
					errorCode = ErrorCode.BATCH_NOT_FOUND,
					status = HttpStatus.NOT_FOUND,
				)
			}

		return batch.toDetailResponse(
			files = uploadedFileRepository.findAllByBatchId(batchId),
			sheets = excelSheetResultRepository.findAllByBatchId(batchId),
			confirmationRequest = findLatestConfirmationRequestForDetail(batch),
		)
	}

	private fun findLatestConfirmationRequestForDetail(batch: UploadBatchEntity): BatchConfirmationRequestEntity? {
		val batchId = batch.id ?: return null
		val status = when (batch.status) {
			BatchStatus.NEEDS_MORE_INFO -> BatchConfirmationRequestStatus.NEEDS_MORE_INFO
			BatchStatus.REJECTED -> BatchConfirmationRequestStatus.REJECTED
			BatchStatus.CONFIRMED -> BatchConfirmationRequestStatus.APPROVED
			BatchStatus.CONFIRMATION_REQUESTED -> BatchConfirmationRequestStatus.REQUESTED
			else -> null
		}
		return status?.let {
			confirmationRequestRepository.findFirstByBatchIdAndStatusOrderByReviewedAtDesc(batchId, it)
		} ?: confirmationRequestRepository.findFirstByBatchIdOrderByRequestedAtDesc(batchId)
	}

	private fun resolveSupplementBatch(
		tenantId: Long,
		clientId: Long,
		parentBatchId: Long?,
		reuploadReason: String?,
	): SupplementUploadContext? {
		parentBatchId ?: return null
		val parentBatch =
			uploadBatchRepository.findById(parentBatchId)
				.filter { it.tenantId == tenantId && it.clientId == clientId }
				.orElseThrow {
					OmsException(ErrorCode.BATCH_NOT_FOUND, status = HttpStatus.NOT_FOUND)
				}
		if (parentBatch.status != BatchStatus.NEEDS_MORE_INFO) {
			throw OmsException(
				errorCode = ErrorCode.INVALID_BATCH_STATUS,
				message = "보완 요청 상태의 배치에 대해서만 보완본을 업로드할 수 있습니다.",
				status = HttpStatus.BAD_REQUEST,
			)
		}

		val normalizedReason = reuploadReason?.trim()?.takeIf { it.isNotBlank() } ?: "고객사 보완본 업로드"
		val nextRevisionNo =
			(uploadBatchRepository.findAllByParentBatchId(parentBatchId).maxOfOrNull { it.revisionNo } ?: parentBatch.revisionNo) + 1
		return SupplementUploadContext(
			parentBatchId = parentBatchId,
			revisionNo = nextRevisionNo,
			reuploadReason = normalizedReason,
			memo = "보완본 R$nextRevisionNo: ${parentBatch.batchNo} - $normalizedReason",
		)
	}

	private fun validateScope(tenantId: Long, clientId: Long?) {
		if (!tenantRepository.existsById(tenantId)) {
			throw OmsException(
				errorCode = ErrorCode.NOT_FOUND,
				message = "물류사를 찾을 수 없습니다.",
				status = HttpStatus.NOT_FOUND,
			)
		}
		if (clientId == null) {
			return
		}

		val client = clientRepository.findById(clientId)
			.orElseThrow {
				OmsException(
					errorCode = ErrorCode.CLIENT_NOT_FOUND,
					status = HttpStatus.NOT_FOUND,
				)
			}

		if (client.tenantId != tenantId) {
			throw OmsException(
				errorCode = ErrorCode.CLIENT_NOT_FOUND,
				message = "해당 물류사의 고객사가 아닙니다.",
				status = HttpStatus.NOT_FOUND,
			)
		}
	}

	private fun validateExtension(file: MultipartFile) {
		val extension = file.originalFilename.orEmpty()
			.substringAfterLast('.', missingDelimiterValue = "")
			.lowercase()
		if (extension !in setOf("xlsx", "xlsm", "xls")) {
			throw OmsException(
				errorCode = ErrorCode.INVALID_FILE_EXTENSION,
				message = ".xlsx, .xlsm, .xls 파일만 업로드할 수 있습니다.",
				status = HttpStatus.BAD_REQUEST,
			)
		}
	}

	private fun representativeDeliveryDate(parsed: ParsedOisWorkbook): LocalDate? =
		parsed.plRows.firstNotNullOfOrNull { it.dueDate }
			?: parsed.scanRows.firstNotNullOfOrNull { it.deliveryDate }

	private fun generateBatchNo(): String =
		"OE-${LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))}-${UUID.randomUUID().toString().take(8)}"

	private fun ParsedScanRow.toEntity(
		tenantId: Long,
		clientId: Long,
		batchId: Long,
	): ScanLineEntity =
		ScanLineEntity(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
			sheetName = sheetName,
			scanCenter = scanCenter,
			deliveryDate = deliveryDate,
			bus = bus,
			barcode = barcode,
			orderBusinessSiteCode = orderBusinessSiteCode,
			storeName = storeName,
			productCode = productCode,
			productName = productName,
			labelQty = labelQty,
			unit = unit,
			boxSequence = boxSequence,
			temperatureType = temperatureType,
			rowNo = rowNo,
			rawRowJson = objectMapper.writeValueAsString(rawRow),
		)

	private fun ParsedPlRow.toEntity(
		tenantId: Long,
		clientId: Long,
		batchId: Long,
	): PlLineEntity =
		PlLineEntity(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
			sheetName = sheetName,
			plType = plType,
			orderNo = orderNo,
			storeCode = storeCode,
			storeName = storeName,
			brandName = brandName,
			productCode = productCode,
			productName = productName,
			unit = unit,
			storageTemperature = storageTemperature,
			dueDate = dueDate,
			orderQty = orderQty,
			vehicleName = vehicleName,
			cbm = cbm,
			qrCode = qrCode,
			boxQty = boxQty,
			rowNo = rowNo,
			rawRowJson = objectMapper.writeValueAsString(rawRow),
		)

	private fun ParsedLabelRow.toEntity(
		tenantId: Long,
		clientId: Long,
		batchId: Long,
	): LabelLineEntity =
		LabelLineEntity(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
			sheetName = sheetName,
			labelType = labelType,
			orderNo = orderNo,
			storeCode = storeCode,
			storeName = storeName,
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
			rawRowJson = objectMapper.writeValueAsString(rawRow),
		)
}

private fun PlLineEntity.toOrderLineEntity(): OrderLineEntity? {
	val sourceId = id ?: return null
	return OrderLineEntity(
		tenantId = tenantId,
		clientId = clientId,
		batchId = batchId,
		sourcePlLineId = sourceId,
		orderNo = orderNo,
		storeCode = storeCode,
		storeName = storeName,
		brandName = brandName,
		productCode = productCode,
		productName = productName,
		unit = unit,
		orderQty = orderQty,
		dueDate = dueDate,
		vehicleName = vehicleName,
	)
}

private fun UploadBatchEntity.toSummaryResponse(): OisBatchSummaryResponse =
	OisBatchSummaryResponse(
		id = id ?: 0,
		tenantId = tenantId,
			clientId = clientId,
			parentBatchId = parentBatchId,
			revisionNo = revisionNo,
			batchNo = batchNo,
		status = status,
		deliveryDate = deliveryDate,
		uploadedAt = uploadedAt,
		errorCount = errorCount,
		warningCount = warningCount,
		infoCount = infoCount,
		memo = memo,
	)

private fun UploadBatchEntity.toDetailResponse(
	files: List<UploadedFileEntity>,
	sheets: List<ExcelSheetResultEntity>,
	confirmationRequest: BatchConfirmationRequestEntity?,
): OisBatchDetailResponse =
	OisBatchDetailResponse(
		id = id ?: 0,
		tenantId = tenantId,
		clientId = clientId,
		batchNo = batchNo,
		status = status,
		parentBatchId = parentBatchId,
		revisionNo = revisionNo,
		reuploadReason = reuploadReason,
		deliveryDate = deliveryDate,
		uploadedAt = uploadedAt,
		uploadedFiles = files.map { it.toResponse() },
		sheetResults = sheets.map { it.toResponse() },
		errorCount = errorCount,
		warningCount = warningCount,
		infoCount = infoCount,
		memo = memo,
		latestConfirmationRequest = confirmationRequest?.toSummaryResponse(),
	)

private fun BatchConfirmationRequestEntity.toSummaryResponse(): OisBatchConfirmationRequestSummaryResponse =
	OisBatchConfirmationRequestSummaryResponse(
		id = id ?: 0,
		status = status,
		requestedBy = requestedBy,
		requestedAt = requestedAt,
		requestMemo = requestMemo,
		reviewedBy = reviewedBy,
		reviewedAt = reviewedAt,
		reviewComment = reviewComment,
		supplementType = supplementType,
	)

private fun UploadedFileEntity.toResponse(): OisUploadedFileResponse =
	OisUploadedFileResponse(
		id = id ?: 0,
		fileType = fileType,
		originalFileName = originalFileName,
		fileHash = fileHash,
		fileSize = fileSize,
		contentType = contentType,
	)

private fun ExcelSheetResultEntity.toResponse(): OisSheetResultResponse =
	OisSheetResultResponse(
		id = id ?: 0,
		sheetName = sheetName,
		sheetType = sheetType,
		suffixValue = suffixValue,
		dataRowCount = dataRowCount,
		status = status,
		message = message,
	)

private fun batchSearchSpec(
	tenantId: Long,
	clientId: Long?,
	status: BatchStatus?,
	keyword: String?,
	deliveryDateFrom: LocalDate?,
	deliveryDateTo: LocalDate?,
	errorOnly: Boolean,
): Specification<UploadBatchEntity> =
	Specification { root, query, criteriaBuilder ->
		val predicates = mutableListOf(
			criteriaBuilder.equal(root.get<Long>("tenantId"), tenantId),
		)

		if (clientId != null) {
			predicates += criteriaBuilder.equal(root.get<Long>("clientId"), clientId)
		}
		if (status != null) {
			predicates += criteriaBuilder.equal(root.get<BatchStatus>("status"), status)
		}
		if (deliveryDateFrom != null) {
			predicates += criteriaBuilder.greaterThanOrEqualTo(root.get("deliveryDate"), deliveryDateFrom)
		}
		if (deliveryDateTo != null) {
			predicates += criteriaBuilder.lessThanOrEqualTo(root.get("deliveryDate"), deliveryDateTo)
		}
		if (errorOnly) {
			predicates += criteriaBuilder.or(
				criteriaBuilder.greaterThan(root.get("errorCount"), 0),
				criteriaBuilder.equal(root.get<BatchStatus>("status"), BatchStatus.VALIDATION_FAILED),
			)
		}
		if (keyword != null) {
			val loweredKeyword = keyword.lowercase()
			val likeKeyword = "%$loweredKeyword%"
			val keywordPredicates = mutableListOf(
				criteriaBuilder.like(criteriaBuilder.lower(root.get("batchNo")), likeKeyword),
				criteriaBuilder.like(criteriaBuilder.lower(criteriaBuilder.coalesce(root.get("memo"), "")), likeKeyword),
			)
			keyword.toLongOrNull()?.let { parsedId ->
				keywordPredicates += criteriaBuilder.equal(root.get<Long>("id"), parsedId)
			}
			predicates += criteriaBuilder.or(*keywordPredicates.toTypedArray())
		}
		val confirmedSupplementParents = query.subquery(Long::class.java)
		val childBatch = confirmedSupplementParents.from(UploadBatchEntity::class.java)
		confirmedSupplementParents
			.select(childBatch.get<Long>("parentBatchId"))
			.where(
				criteriaBuilder.isNotNull(childBatch.get<Long>("parentBatchId")),
				criteriaBuilder.equal(childBatch.get<BatchStatus>("status"), BatchStatus.CONFIRMED),
			)
		predicates += criteriaBuilder.or(
			criteriaBuilder.notEqual(root.get<BatchStatus>("status"), BatchStatus.NEEDS_MORE_INFO),
			criteriaBuilder.not(root.get<Long>("id").`in`(confirmedSupplementParents)),
		)

		criteriaBuilder.and(*predicates.toTypedArray())
	}

private fun <TEntity : Any, TResponse> Page<TEntity>.toResponsePage(mapper: (TEntity) -> TResponse): PageResponse<TResponse> =
	PageResponse(
		items = content.map(mapper),
		page = number,
		size = size,
		totalElements = totalElements,
		totalPages = totalPages,
	)

private data class SupplementUploadContext(
	val parentBatchId: Long,
	val revisionNo: Int,
	val reuploadReason: String,
	val memo: String,
)
