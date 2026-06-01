package com.company.oms.download

import com.company.oms.batch.UploadBatchEntity
import com.company.oms.batch.ConfirmedBatchService
import com.company.oms.audit.BatchAuditLogEntity
import com.company.oms.audit.BatchAuditLogRepository
import com.company.oms.auth.AuthGuard
import com.company.oms.auth.CurrentUser
import com.company.oms.auth.UserRole
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.LabelType
import com.company.oms.common.request.RequestContext
import com.company.oms.label.LabelLineEntity
import com.company.oms.label.LabelLineRepository
import com.company.oms.master.StoreRouteMasterItemRepository
import org.apache.poi.ss.usermodel.Row
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.io.ByteArrayOutputStream
import java.time.LocalDateTime

@Service
@Profile("local")
class LabelDownloadService(
	private val authGuard: AuthGuard,
	private val confirmedBatchService: ConfirmedBatchService,
	private val labelLineRepository: LabelLineRepository,
	private val downloadLogRepository: DownloadLogRepository,
	private val batchAuditLogRepository: BatchAuditLogRepository,
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
	private val objectMapper: ObjectMapper,
) {

	@Transactional
	fun downloadLabels(
		tenantId: Long,
		clientId: Long?,
		batchId: Long,
		labelType: LabelType?,
		storeCode: String?,
		brandName: String?,
		productCode: String?,
		orderNo: String?,
		matchingCode: String?,
		qrCode: String?,
		deliveryRound: String?,
		vehicleName: String?,
		downloadedBy: Long?,
	): LabelDownloadFile {
		val batch = confirmedBatchService.requireConfirmedBatch(tenantId, clientId, batchId)
		val resolvedClientId = batch.clientId
		val currentUser = requireDownloadPermission(tenantId, resolvedClientId)
		val rows =
			findLabelRows(
				tenantId = tenantId,
				clientId = resolvedClientId,
				batchId = batchId,
				labelType = labelType,
				storeCode = storeCode,
				brandName = brandName,
				productCode = productCode,
				orderNo = orderNo,
				matchingCode = matchingCode,
				qrCode = qrCode,
				deliveryRound = deliveryRound,
				vehicleName = vehicleName,
			)

		if (rows.isEmpty()) {
			throw OmsException(ErrorCode.NO_DATA, status = HttpStatus.NOT_FOUND)
		}

		val fileName = labelFileName(batchId, labelType)
		val content = createWorkbook(batch, rows, labelType)
		val resolvedDownloadedBy = currentUser.userId ?: downloadedBy
		val filterJson = labelFilterJson(labelType, storeCode, brandName, productCode, orderNo, matchingCode, qrCode, deliveryRound, vehicleName)

		downloadLogRepository.save(
			DownloadLogEntity(
				tenantId = tenantId,
				clientId = resolvedClientId,
				batchId = batchId,
				downloadType = "LABEL",
				fileName = fileName,
				filterJson = filterJson,
				rowCount = rows.size,
				downloadedBy = resolvedDownloadedBy,
				requestId = RequestContext.getRequestId(),
				downloadedAt = LocalDateTime.now(),
			),
		)
		auditDownloadRequested(batch, resolvedDownloadedBy, fileName, rows.size, filterJson)

		return LabelDownloadFile(fileName = fileName, content = content)
	}

	@Transactional(readOnly = true)
	fun getDownloadLog(
		tenantId: Long,
		clientId: Long?,
		downloadLogId: Long,
	): DownloadLogResponse {
		val log =
			downloadLogRepository.findById(downloadLogId).orElseThrow {
				OmsException(ErrorCode.DOWNLOAD_LOG_NOT_FOUND, status = HttpStatus.NOT_FOUND)
			}
		if (log.tenantId != tenantId || (clientId != null && log.clientId != clientId)) {
			throw OmsException(ErrorCode.DOWNLOAD_LOG_NOT_FOUND, status = HttpStatus.NOT_FOUND)
		}
		return log.toResponse()
	}

	private fun findLabelRows(
		tenantId: Long,
		clientId: Long,
		batchId: Long,
		labelType: LabelType?,
		storeCode: String?,
		brandName: String?,
		productCode: String?,
		orderNo: String?,
		matchingCode: String?,
		qrCode: String?,
		deliveryRound: String?,
		vehicleName: String?,
	): List<LabelLineEntity> {
		val routeStoreCodes = resolveRouteStoreCodes(tenantId, deliveryRound, vehicleName)
		if (routeStoreCodes != null && routeStoreCodes.isEmpty()) {
			return emptyList()
		}

		return labelLineRepository.findAllForDownload(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
			labelType = labelType,
			storeCode = storeCode,
			brandName = brandName?.trim()?.takeIf(String::isNotBlank),
			productCode = productCode,
			orderNo = orderNo,
			matchingCode = matchingCode,
			qrCode = qrCode,
		)
			.filter { routeStoreCodes == null || it.storeCode in routeStoreCodes }
	}

	private fun resolveRouteStoreCodes(
		tenantId: Long,
		deliveryRound: String?,
		vehicleName: String?,
	): Set<String>? {
		val normalizedDeliveryRound = deliveryRound?.trim()?.takeIf(String::isNotBlank)
		val normalizedVehicleName = vehicleName?.trim()?.takeIf(String::isNotBlank)
		if (normalizedDeliveryRound == null && normalizedVehicleName == null) {
			return null
		}

		return storeRouteMasterItemRepository.findAllByTenantIdAndActiveYn(tenantId, true)
			.asSequence()
			.filter { normalizedDeliveryRound == null || it.deliveryRound == normalizedDeliveryRound }
			.filter { normalizedVehicleName == null || it.vehicleName == normalizedVehicleName }
			.map { it.baljugoCode }
			.toSet()
	}

	private fun requireDownloadPermission(
		tenantId: Long,
		clientId: Long?,
	): CurrentUser {
		val currentUser =
			authGuard.requireAnyRole(
				UserRole.VIEWER,
				UserRole.OPERATOR,
				UserRole.ADMIN,
				UserRole.SYSTEM_ADMIN,
			)
		if (currentUser.tenantId != null && currentUser.tenantId != tenantId) {
			throw OmsException(ErrorCode.FORBIDDEN, status = HttpStatus.FORBIDDEN)
		}
		if (currentUser.clientId != null && clientId != null && currentUser.clientId != clientId) {
			throw OmsException(ErrorCode.FORBIDDEN, status = HttpStatus.FORBIDDEN)
		}
		return currentUser
	}

	private fun createWorkbook(
		batch: UploadBatchEntity,
		rows: List<LabelLineEntity>,
		requestedLabelType: LabelType?,
	): ByteArray {
		XSSFWorkbook().use { workbook ->
			createMetadataSheet(workbook, batch, rows, requestedLabelType)
			rows.groupBy { it.labelType }
				.toSortedMap(compareBy { it.name })
				.forEach { (labelType, typeRows) ->
					val sheet = workbook.createSheet(sheetName(labelType))
					val headers = labelHeaders(labelType)
					headers.writeTo(sheet.createRow(0))
					typeRows.forEachIndexed { index, row ->
						labelRowValues(row, headers).writeTo(sheet.createRow(index + 1))
					}
					for (columnIndex in headers.indices) {
						sheet.autoSizeColumn(columnIndex)
					}
				}

			if (rows.isEmpty()) {
				val labelType = requestedLabelType ?: LabelType.EA
				val sheet = workbook.createSheet(sheetName(labelType))
				labelHeaders(labelType).writeTo(sheet.createRow(0))
			}

			return ByteArrayOutputStream().use { output ->
				workbook.write(output)
				output.toByteArray()
			}
		}
	}

	private fun createMetadataSheet(
		workbook: XSSFWorkbook,
		batch: UploadBatchEntity,
		rows: List<LabelLineEntity>,
		requestedLabelType: LabelType?,
	) {
		val sheet = workbook.createSheet("_metadata")
		listOf("key", "value").writeTo(sheet.createRow(0))
		listOf("batch_id", requireNotNull(batch.id).toString()).writeTo(sheet.createRow(1))
		listOf("batch_no", batch.batchNo).writeTo(sheet.createRow(2))
		listOf("delivery_date", batch.deliveryDate?.toString()).writeTo(sheet.createRow(3))
		listOf("download_type", "LABEL").writeTo(sheet.createRow(4))
		listOf("label_type", requestedLabelType?.name ?: "ALL").writeTo(sheet.createRow(5))
		listOf("row_count", rows.size.toString()).writeTo(sheet.createRow(6))
		listOf("created_at", LocalDateTime.now().toString()).writeTo(sheet.createRow(7))
		sheet.autoSizeColumn(0)
		sheet.autoSizeColumn(1)
	}

	private fun labelRowValues(
		row: LabelLineEntity,
		headers: List<String>,
	): List<String?> {
		val rawRow = rawRow(row)
		return headers.map { header -> labelCellValue(row, rawRow, header) }
	}

	private fun labelCellValue(
		row: LabelLineEntity,
		rawRow: Map<String, String>,
		header: String,
	): String? =
		when (header) {
			"주문번호" -> row.orderNo ?: rawValue(rawRow, header)
			"거래처코드" -> row.storeCode ?: rawValue(rawRow, header)
			"거래처" -> row.storeName ?: rawValue(rawRow, header)
			"브랜드" -> row.brandName ?: rawValue(rawRow, header)
			"품목코드" -> row.productCode ?: rawValue(rawRow, header)
			"품명" -> row.productName ?: rawValue(rawRow, header)
			"주문량" -> row.orderQty?.toPlainString() ?: rawValue(rawRow, header)
			"순번" -> row.sequenceNo ?: rawValue(rawRow, header)
			"QR코드" -> row.qrCode ?: rawValue(rawRow, header)
			"매칭코드" -> row.matchingCode ?: rawValue(rawRow, header)
			"박스순번" -> row.boxSequence ?: rawValue(rawRow, header)
			"총박스수량" -> row.totalBoxQty?.toPlainString() ?: rawValue(rawRow, header)
			else -> rawValue(rawRow, header)
		}

	private fun rawRow(row: LabelLineEntity): Map<String, String> =
		row.rawRowJson
			?.takeIf(String::isNotBlank)
			?.let { json ->
				runCatching {
					objectMapper.readValue(json, Map::class.java)
						.entries
						.associate { entry -> entry.key.toString() to (entry.value?.toString() ?: "") }
				}.getOrDefault(emptyMap())
			}
			.orEmpty()

	private fun rawValue(
		rawRow: Map<String, String>,
		header: String,
	): String? = rawRow[normalizeHeader(header)]?.takeIf(String::isNotBlank)

	private fun List<String?>.writeTo(row: Row) {
		forEachIndexed { index, value -> row.createCell(index).setCellValue(value ?: "") }
	}

	private fun auditDownloadRequested(
		batch: UploadBatchEntity,
		downloadedBy: Long?,
		fileName: String,
		rowCount: Int,
		filterJson: String,
	) {
		batchAuditLogRepository.save(
			BatchAuditLogEntity(
				tenantId = batch.tenantId,
				clientId = batch.clientId,
				batchId = batch.id,
				action = "DOWNLOAD_REQUESTED",
				beforeStatus = batch.status,
				afterStatus = batch.status,
				actorId = downloadedBy,
				requestId = RequestContext.getRequestId(),
				message = "Label download requested.",
				metadataJson = labelDownloadMetadataJson(fileName, rowCount, filterJson),
			),
		)
	}

	private fun labelFileName(
		batchId: Long,
		labelType: LabelType?,
	): String {
		val suffix = labelType?.name ?: "ALL"
		return "labels_batch_${batchId}_$suffix.xlsx"
	}

	private fun sheetName(labelType: LabelType): String =
		when (labelType) {
			LabelType.EA -> "Label_EA"
			LabelType.BOX -> "Label_Box"
		}

	private fun labelFilterJson(
		labelType: LabelType?,
		storeCode: String?,
		brandName: String?,
		productCode: String?,
		orderNo: String?,
		matchingCode: String?,
		qrCode: String?,
		deliveryRound: String?,
		vehicleName: String?,
	): String {
		val values =
			listOf(
				"labelType" to labelType?.name,
				"storeCode" to storeCode,
				"brandName" to brandName,
				"productCode" to productCode,
				"orderNo" to orderNo,
				"matchingCode" to matchingCode,
				"qrCode" to qrCode,
				"deliveryRound" to deliveryRound,
				"vehicleName" to vehicleName,
			).filter { it.second != null }
		return values.joinToString(prefix = "{", postfix = "}") { (key, value) ->
			"\"$key\":\"${value!!.replace("\\", "\\\\").replace("\"", "\\\"")}\""
		}
	}

	private fun labelDownloadMetadataJson(
		fileName: String,
		rowCount: Int,
		filterJson: String,
	): String =
		"""{"downloadType":"LABEL","fileName":"${jsonEscape(fileName)}","rowCount":$rowCount,"filters":$filterJson}"""

	private fun jsonEscape(value: String): String =
		value.replace("\\", "\\\\").replace("\"", "\\\"")

	private fun normalizeHeader(value: String): String =
		value.trim()
			.removePrefix("\uFEFF")
			.lowercase()
			.replace(" ", "")
			.replace("-", "_")

	private companion object {
		fun labelHeaders(labelType: LabelType): List<String> =
			when (labelType) {
				LabelType.EA -> LABEL_EA_HEADERS
				LabelType.BOX -> LABEL_BOX_HEADERS
			}

		val LABEL_EA_HEADERS =
			listOf(
				"주문번호",
				"거래처코드",
				"거래처",
				"브랜드",
				"품목코드",
				"품명",
				"규격",
				"단위",
				"과세대상",
				"분류(대)",
				"보관온도",
				"원산지",
				"품목비고",
				"납기요청일",
				"주문량",
				"물류대행",
				"차량명",
				"CBM",
				"간편주소",
				"박스입수량",
				"박스판매가능",
				"순번",
				"매칭코드",
			)

		val LABEL_BOX_HEADERS =
			listOf(
				"주문번호",
				"거래처코드",
				"거래처",
				"브랜드",
				"품목코드",
				"품명",
				"규격",
				"단위",
				"과세대상",
				"분류(대)",
				"보관온도",
				"원산지",
				"품목비고",
				"납기요청일",
				"주문량",
				"물류대행",
				"차량명",
				"CBM",
				"간편주소",
				"박스입수량",
				"박스판매가능",
				"동일상품수량",
				"박스순번",
				"총박스수량",
				"박스번호",
				"피킹순서",
				"비고",
				"순번",
				"QR코드",
				"매칭코드",
			)
	}
}
