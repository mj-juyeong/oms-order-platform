package com.company.oms.validation

import com.company.oms.audit.BatchAuditLogEntity
import com.company.oms.audit.BatchAuditLogRepository
import com.company.oms.auth.UserRepository
import com.company.oms.batch.UploadBatchEntity
import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.LabelType
import com.company.oms.common.persistence.UploadDomain
import com.company.oms.common.persistence.ValidationSeverity
import com.company.oms.common.request.RequestContext
import com.company.oms.common.response.PageResponse
import com.company.oms.label.LabelLineEntity
import com.company.oms.label.LabelLineRepository
import com.company.oms.master.ClientProductCodeMappingRepository
import com.company.oms.master.ClientStoreCodeMappingRepository
import com.company.oms.master.ProductMasterItemRepository
import com.company.oms.master.StoreRouteMasterItemRepository
import com.company.oms.pl.PlLineEntity
import com.company.oms.pl.PlLineRepository
import com.company.oms.scan.ScanLineEntity
import com.company.oms.scan.ScanLineRepository
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDateTime
import kotlin.math.ceil

@Service
@Profile("local")
class BatchValidationService(
	private val uploadBatchRepository: UploadBatchRepository,
	private val validationErrorRepository: ValidationErrorRepository,
	private val batchAuditLogRepository: BatchAuditLogRepository,
	private val productMasterItemRepository: ProductMasterItemRepository,
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
	private val clientProductCodeMappingRepository: ClientProductCodeMappingRepository,
	private val clientStoreCodeMappingRepository: ClientStoreCodeMappingRepository,
	private val scanLineRepository: ScanLineRepository,
	private val plLineRepository: PlLineRepository,
	private val labelLineRepository: LabelLineRepository,
	private val userRepository: UserRepository,
) {

	@Transactional
	fun validateBatch(
		tenantId: Long,
		clientId: Long?,
		batchId: Long,
		memo: String?,
		actorId: Long?,
	): BatchValidationResponse {
		val batch = getBatchForScope(tenantId, clientId, batchId)
		if (batch.status !in setOf(BatchStatus.UPLOADED, BatchStatus.VALIDATION_FAILED, BatchStatus.READY_TO_CONFIRM)) {
			throw invalidBatchStatus("검증할 수 없는 배치 상태입니다.")
		}

		val beforeStatus = batch.status
		val resolvedActorId = resolveActorId(actorId)
		batch.status = BatchStatus.VALIDATING
		audit(batch, "VALIDATION_STARTED", beforeStatus, BatchStatus.VALIDATING, resolvedActorId, memo)

		validationErrorRepository.deleteAllByBatchId(batchId)

		val now = LocalDateTime.now()
		val errors = buildValidationErrors(batch)
		validationErrorRepository.saveAll(errors)

		val errorCount = errors.count { it.severity == ValidationSeverity.ERROR }
		val warningCount = errors.count { it.severity == ValidationSeverity.WARNING }
		val infoCount = errors.count { it.severity == ValidationSeverity.INFO }

		val afterStatus = if (errorCount > 0) BatchStatus.VALIDATION_FAILED else BatchStatus.READY_TO_CONFIRM
		batch.status = afterStatus
		batch.validatedAt = now
		batch.productMasterCheckedAt = now
		batch.storeRouteMasterCheckedAt = now
		batch.errorCount = errorCount
		batch.warningCount = warningCount
		batch.infoCount = infoCount

		audit(batch, "VALIDATION_COMPLETED", BatchStatus.VALIDATING, afterStatus, resolvedActorId, memo)

		return BatchValidationResponse(
			batchId = batchId,
			status = afterStatus,
			errorCount = errorCount,
			warningCount = warningCount,
			infoCount = infoCount,
			productMasterCheckedAt = now,
			storeRouteMasterCheckedAt = now,
		)
	}

	@Transactional
	fun confirmBatch(
		tenantId: Long,
		clientId: Long?,
		batchId: Long,
		actorId: Long?,
	): BatchStatusChangeResponse {
		val batch = getBatchForScope(tenantId, clientId, batchId)
		if (batch.status != BatchStatus.READY_TO_CONFIRM) {
			throw invalidBatchStatus("READY_TO_CONFIRM 상태의 배치만 확정할 수 있습니다.")
		}
		if (validationErrorRepository.existsByBatchIdAndSeverityAndResolvedYn(batchId, ValidationSeverity.ERROR, false)) {
			throw OmsException(
				errorCode = ErrorCode.VALIDATION_ERROR_EXISTS,
				status = HttpStatus.BAD_REQUEST,
			)
		}

		val beforeStatus = batch.status
		val resolvedActorId = resolveActorId(actorId)
		val now = LocalDateTime.now()
		batch.status = BatchStatus.CONFIRMED
		batch.confirmedAt = now
		batch.confirmedBy = resolvedActorId
		audit(batch, "CONFIRMED", beforeStatus, BatchStatus.CONFIRMED, resolvedActorId, null)

		return batch.toStatusChangeResponse()
	}

	@Transactional
	fun cancelBatch(
		tenantId: Long,
		clientId: Long?,
		batchId: Long,
		request: BatchActionRequest,
	): BatchStatusChangeResponse {
		val batch = getBatchForScope(tenantId, clientId, batchId)
		if (batch.status !in setOf(BatchStatus.UPLOADED, BatchStatus.VALIDATING, BatchStatus.VALIDATION_FAILED, BatchStatus.READY_TO_CONFIRM)) {
			throw invalidBatchStatus("취소할 수 없는 배치 상태입니다.")
		}

		val beforeStatus = batch.status
		val resolvedActorId = resolveActorId(request.actorId)
		batch.status = BatchStatus.CANCELLED
		batch.cancelledAt = LocalDateTime.now()
		audit(batch, "CANCELLED", beforeStatus, BatchStatus.CANCELLED, resolvedActorId, request.reason)

		return batch.toStatusChangeResponse()
	}

	@Transactional
	fun rollbackBatch(
		tenantId: Long,
		clientId: Long?,
		batchId: Long,
		request: BatchActionRequest,
	): BatchStatusChangeResponse {
		val batch = getBatchForScope(tenantId, clientId, batchId)
		if (batch.status != BatchStatus.CONFIRMED) {
			throw invalidBatchStatus("CONFIRMED 상태의 배치만 롤백할 수 있습니다.")
		}

		val beforeStatus = batch.status
		val resolvedActorId = resolveActorId(request.actorId)
		batch.status = BatchStatus.ROLLED_BACK
		batch.rolledBackAt = LocalDateTime.now()
		audit(batch, "ROLLED_BACK", beforeStatus, BatchStatus.ROLLED_BACK, resolvedActorId, request.reason)

		return batch.toStatusChangeResponse()
	}

	@Transactional(readOnly = true)
	fun listValidationErrors(
		tenantId: Long,
		clientId: Long?,
		batchId: Long,
		severity: ValidationSeverity?,
		sheetName: String?,
		errorCode: String?,
		page: Int,
		size: Int,
	): PageResponse<ValidationErrorResponse> {
		getBatchForScope(tenantId, clientId, batchId)

		return validationErrorRepository.findAllByBatchId(batchId)
			.filter { severity == null || it.severity == severity }
			.filter { sheetName.isNullOrBlank() || it.sheetName == sheetName }
			.filter { errorCode.isNullOrBlank() || it.errorCode == errorCode }
			.sortedWith(compareBy<ValidationErrorEntity> { it.severity.ordinal }.thenBy { it.sheetName }.thenBy { it.rowNo })
			.map { it.toResponse(resolveValidationTarget(it)) }
			.toPage(page, size)
	}

	private fun resolveValidationTarget(error: ValidationErrorEntity): ValidationTargetContext {
		val lineId = error.lineId ?: return ValidationTargetContext()

		return when (error.lineTable) {
			"scan_lines" -> scanLineRepository.findById(lineId)
				.filter { it.batchId == error.batchId && it.tenantId == error.tenantId && it.clientId == error.clientId }
				.map { it.toValidationTarget() }
				.orElse(ValidationTargetContext())
			"pl_lines" -> plLineRepository.findById(lineId)
				.filter { it.batchId == error.batchId && it.tenantId == error.tenantId && it.clientId == error.clientId }
				.map { it.toValidationTarget() }
				.orElse(ValidationTargetContext())
			"label_lines" -> labelLineRepository.findById(lineId)
				.filter { it.batchId == error.batchId && it.tenantId == error.tenantId && it.clientId == error.clientId }
				.map { it.toValidationTarget() }
				.orElse(ValidationTargetContext())
			else -> ValidationTargetContext()
		}
	}

	private fun buildValidationErrors(batch: UploadBatchEntity): List<ValidationErrorEntity> {
		val tenantId = batch.tenantId
		val clientId = batch.clientId
		val batchId = batch.id ?: return emptyList()
		val errors = mutableListOf<ValidationErrorEntity>()

		scanLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, clientId, batchId)
			.forEach { scan ->
				errors += validateProductCode(batch, UploadDomain.SCAN, "scan_lines", scan.id, scan.sheetName, scan.rowNo, scan.productCode)
				errors += validateStoreRouteCode(batch, UploadDomain.SCAN, "scan_lines", scan.id, scan.sheetName, scan.rowNo, scan.orderBusinessSiteCode, "order_business_site_code")
			}

		plLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, clientId, batchId)
			.forEach { pl ->
				errors += validateProductCode(batch, UploadDomain.PL, "pl_lines", pl.id, pl.sheetName, pl.rowNo, pl.productCode)
				errors += validateStoreRouteCode(batch, UploadDomain.PL, "pl_lines", pl.id, pl.sheetName, pl.rowNo, pl.storeCode, "store_code")
				errors += validateVehicleName(batch, pl)
			}

		labelLineRepository.findAllByTenantIdAndClientIdAndBatchIdAndLabelType(tenantId, clientId, batchId, LabelType.EA)
			.forEach { label ->
				errors += validateLabelProductCode(batch, label)
				errors += validateStoreRouteCode(batch, UploadDomain.LABEL, "label_lines", label.id, label.sheetName, label.rowNo, label.storeCode, "store_code")
			}
		labelLineRepository.findAllByTenantIdAndClientIdAndBatchIdAndLabelType(tenantId, clientId, batchId, LabelType.BOX)
			.forEach { label ->
				errors += validateProductCode(batch, UploadDomain.LABEL, "label_lines", label.id, label.sheetName, label.rowNo, label.productCode)
				errors += validateStoreRouteCode(batch, UploadDomain.LABEL, "label_lines", label.id, label.sheetName, label.rowNo, label.storeCode, "store_code")
			}

		return errors
	}

	private fun validateProductCode(
		batch: UploadBatchEntity,
		domain: UploadDomain,
		lineTable: String,
		lineId: Long?,
		sheetName: String?,
		rowNo: Int?,
		productCode: String?,
	): List<ValidationErrorEntity> {
		val code = productCode?.trim()
		if (code.isNullOrBlank()) {
			return listOf(validationError(batch, ValidationSeverity.ERROR, "PRODUCT_CODE_REQUIRED", domain, sheetName, rowNo, "product_code", lineTable, lineId, "품목코드가 비어 있습니다.", productCode))
		}
		if (resolveProductMasterCode(batch, code) == null) {
			return listOf(validationError(batch, ValidationSeverity.ERROR, "PRODUCT_MASTER_NOT_FOUND", domain, sheetName, rowNo, "product_code", lineTable, lineId, "상품 마스터에 존재하지 않는 품목코드입니다.", code))
		}
		return emptyList()
	}

	private fun validateLabelProductCode(
		batch: UploadBatchEntity,
		label: LabelLineEntity,
	): List<ValidationErrorEntity> {
		val code = label.productCode?.trim()
		if (code.isNullOrBlank()) {
			return listOf(validationError(batch, ValidationSeverity.WARNING, "LABEL_EA_PRODUCT_CODE_MISSING", UploadDomain.LABEL, label.sheetName, label.rowNo, "product_code", "label_lines", label.id, "Label_EA 품목코드가 비어 있습니다.", label.productCode))
		}
		if (resolveProductMasterCode(batch, code) == null) {
			return listOf(validationError(batch, ValidationSeverity.WARNING, "LABEL_EA_PRODUCT_MASTER_NOT_FOUND", UploadDomain.LABEL, label.sheetName, label.rowNo, "product_code", "label_lines", label.id, "Label_EA 품목코드가 상품 마스터에 없습니다.", code))
		}
		return emptyList()
	}

	private fun validateStoreRouteCode(
		batch: UploadBatchEntity,
		domain: UploadDomain,
		lineTable: String,
		lineId: Long?,
		sheetName: String?,
		rowNo: Int?,
		storeCode: String?,
		columnName: String,
	): List<ValidationErrorEntity> {
		val code = storeCode?.trim()
		if (code.isNullOrBlank()) {
			return listOf(validationError(batch, ValidationSeverity.ERROR, "STORE_CODE_REQUIRED", domain, sheetName, rowNo, columnName, lineTable, lineId, "배송지/거래처 코드가 비어 있습니다.", storeCode))
		}
		if (resolveStoreRouteMasterCode(batch, code) == null) {
			return listOf(validationError(batch, ValidationSeverity.ERROR, "STORE_ROUTE_MASTER_NOT_FOUND", domain, sheetName, rowNo, columnName, lineTable, lineId, "배송지/차량 마스터에 존재하지 않는 코드입니다.", code))
		}
		return emptyList()
	}

	private fun validateVehicleName(
		batch: UploadBatchEntity,
		pl: PlLineEntity,
	): List<ValidationErrorEntity> {
		val storeCode = pl.storeCode?.trim()?.takeIf(String::isNotBlank) ?: return emptyList()
		val vehicleName = pl.vehicleName?.trim()?.takeIf(String::isNotBlank) ?: return emptyList()
		val resolvedStoreCode = resolveStoreRouteMasterCode(batch, storeCode) ?: return emptyList()
		val master = storeRouteMasterItemRepository.findByTenantIdAndBaljugoCode(batch.tenantId, resolvedStoreCode)
			?: return emptyList()
		val masterVehicleName = master.vehicleName?.trim()?.takeIf(String::isNotBlank) ?: return emptyList()
		if (masterVehicleName == vehicleName) {
			return emptyList()
		}

		return listOf(
			validationError(
				batch = batch,
				severity = ValidationSeverity.WARNING,
				errorCode = "VEHICLE_NAME_MISMATCH",
				domain = UploadDomain.PL,
				sheetName = pl.sheetName,
				rowNo = pl.rowNo,
				columnName = "vehicle_name",
				lineTable = "pl_lines",
				lineId = pl.id,
				message = "PL 차량명이 배송지/차량 마스터와 다릅니다.",
				originalValue = vehicleName,
				normalizedValue = masterVehicleName,
			),
		)
	}

	private fun resolveProductMasterCode(batch: UploadBatchEntity, productCode: String): String? {
		if (productMasterItemRepository.existsByTenantIdAndEzadminCode(batch.tenantId, productCode)) {
			return productCode
		}
		val mapping = clientProductCodeMappingRepository
			.findByTenantIdAndClientIdAndClientProductCode(batch.tenantId, batch.clientId, productCode)
			?.takeIf { it.activeYn }
			?: return null
		return mapping.ezadminCode.takeIf {
			productMasterItemRepository.existsByTenantIdAndEzadminCode(batch.tenantId, it)
		}
	}

	private fun resolveStoreRouteMasterCode(batch: UploadBatchEntity, storeCode: String): String? {
		if (storeRouteMasterItemRepository.existsByTenantIdAndBaljugoCode(batch.tenantId, storeCode)) {
			return storeCode
		}
		val mapping = clientStoreCodeMappingRepository
			.findByTenantIdAndClientIdAndClientStoreCode(batch.tenantId, batch.clientId, storeCode)
			?.takeIf { it.activeYn }
			?: return null
		return mapping.baljugoCode.takeIf {
			storeRouteMasterItemRepository.existsByTenantIdAndBaljugoCode(batch.tenantId, it)
		}
	}

	private fun validationError(
		batch: UploadBatchEntity,
		severity: ValidationSeverity,
		errorCode: String,
		domain: UploadDomain,
		sheetName: String?,
		rowNo: Int?,
		columnName: String?,
		lineTable: String?,
		lineId: Long?,
		message: String,
		originalValue: String?,
		normalizedValue: String? = null,
	): ValidationErrorEntity =
		ValidationErrorEntity(
			tenantId = batch.tenantId,
			clientId = batch.clientId,
			batchId = batch.id ?: 0,
			severity = severity,
			errorCode = errorCode,
			domain = domain,
			sheetName = sheetName,
			rowNo = rowNo,
			columnName = columnName,
			lineTable = lineTable,
			lineId = lineId,
			message = message,
			originalValue = originalValue,
			normalizedValue = normalizedValue,
		)

	private fun getBatchForScope(
		tenantId: Long,
		clientId: Long?,
		batchId: Long,
	): UploadBatchEntity =
		uploadBatchRepository.findById(batchId)
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.orElseThrow {
				OmsException(
					errorCode = ErrorCode.BATCH_NOT_FOUND,
					status = HttpStatus.NOT_FOUND,
				)
			}

	private fun invalidBatchStatus(message: String): OmsException =
		OmsException(
			errorCode = ErrorCode.INVALID_BATCH_STATUS,
			message = message,
			status = HttpStatus.BAD_REQUEST,
		)

	private fun resolveActorId(actorId: Long?): Long? =
		actorId?.takeIf { userRepository.existsById(it) }

	private fun audit(
		batch: UploadBatchEntity,
		action: String,
		beforeStatus: BatchStatus?,
		afterStatus: BatchStatus?,
		actorId: Long?,
		message: String?,
	) {
		batchAuditLogRepository.save(
			BatchAuditLogEntity(
				tenantId = batch.tenantId,
				clientId = batch.clientId,
				batchId = batch.id,
				action = action,
				beforeStatus = beforeStatus,
				afterStatus = afterStatus,
				actorId = actorId,
				requestId = RequestContext.getRequestId(),
				message = message,
			),
		)
	}
}

private fun UploadBatchEntity.toStatusChangeResponse(): BatchStatusChangeResponse =
	BatchStatusChangeResponse(
		id = id ?: 0,
		status = status,
		confirmedAt = confirmedAt,
		cancelledAt = cancelledAt,
		rolledBackAt = rolledBackAt,
	)

private data class ValidationTargetContext(
	val orderNo: String? = null,
	val storeCode: String? = null,
	val storeName: String? = null,
	val productCode: String? = null,
	val productName: String? = null,
	val orderQty: String? = null,
	val unit: String? = null,
	val barcodeOrQr: String? = null,
)

private fun ScanLineEntity.toValidationTarget(): ValidationTargetContext =
	ValidationTargetContext(
		storeCode = orderBusinessSiteCode,
		storeName = storeName,
		productCode = productCode,
		productName = productName,
		orderQty = labelQty.toDisplayString(),
		unit = unit,
		barcodeOrQr = barcode,
	)

private fun PlLineEntity.toValidationTarget(): ValidationTargetContext =
	ValidationTargetContext(
		orderNo = orderNo,
		storeCode = storeCode,
		storeName = storeName,
		productCode = productCode,
		productName = productName,
		orderQty = orderQty.toDisplayString(),
		unit = unit,
		barcodeOrQr = qrCode,
	)

private fun LabelLineEntity.toValidationTarget(): ValidationTargetContext =
	ValidationTargetContext(
		orderNo = orderNo,
		storeCode = storeCode,
		storeName = storeName,
		productCode = productCode,
		productName = productName,
		orderQty = orderQty.toDisplayString(),
		barcodeOrQr = qrCode?.takeIf(String::isNotBlank) ?: matchingCode,
	)

private fun ValidationErrorEntity.toResponse(context: ValidationTargetContext): ValidationErrorResponse {
	val targetCode = targetCode(context)
	val targetName = targetName(context)

	return ValidationErrorResponse(
		id = id ?: 0,
		severity = severity,
		errorCode = errorCode,
		userTitle = userTitle(targetCode),
		userMessage = userMessage(targetCode, targetName),
		actionGuide = actionGuide(),
		domain = domain,
		sheetName = sheetName,
		rowNo = rowNo,
		columnName = columnName,
		lineTable = lineTable,
		lineId = lineId,
		message = message,
		originalValue = originalValue,
		normalizedValue = normalizedValue,
		targetCode = targetCode,
		targetName = targetName,
		orderNo = context.orderNo,
		storeCode = context.storeCode,
		storeName = context.storeName,
		productCode = context.productCode,
		productName = context.productName,
		orderQty = context.orderQty,
		unit = context.unit,
		sourceSummary = sourceSummary(context),
		resolvedYn = resolvedYn,
	)
}

private fun ValidationErrorEntity.targetCode(context: ValidationTargetContext): String? =
	when {
		errorCode.contains("PRODUCT", ignoreCase = true) -> originalValue ?: context.productCode
		errorCode.contains("STORE", ignoreCase = true) -> originalValue ?: context.storeCode
		errorCode.contains("VEHICLE", ignoreCase = true) -> originalValue
		else -> originalValue
	}

private fun ValidationErrorEntity.targetName(context: ValidationTargetContext): String? =
	when {
		errorCode.contains("PRODUCT", ignoreCase = true) -> context.productName
		errorCode.contains("STORE", ignoreCase = true) -> context.storeName
		errorCode.contains("VEHICLE", ignoreCase = true) -> context.storeName
		else -> context.productName ?: context.storeName
	}

private fun ValidationErrorEntity.userTitle(targetCode: String?): String =
	when (errorCode) {
		"PRODUCT_CODE_REQUIRED" -> "품목코드가 비어 있습니다"
		"PRODUCT_MASTER_NOT_FOUND" -> "상품 마스터에 없는 품목코드입니다"
		"LABEL_EA_PRODUCT_CODE_MISSING" -> "Label EA 품목코드가 비어 있습니다"
		"LABEL_EA_PRODUCT_MASTER_NOT_FOUND" -> "Label EA 품목코드가 상품 마스터에 없습니다"
		"STORE_CODE_REQUIRED" -> "거래처/배송지 코드가 비어 있습니다"
		"STORE_ROUTE_MASTER_NOT_FOUND" -> "배송지/차량 마스터에 없는 코드입니다"
		"VEHICLE_NAME_MISMATCH" -> "차량명이 배송지/차량 마스터와 다릅니다"
		else -> message
	}.let { title -> targetCode?.takeIf(String::isNotBlank)?.let { "$title: $it" } ?: title }

private fun ValidationErrorEntity.userMessage(targetCode: String?, targetName: String?): String =
	when (errorCode) {
		"PRODUCT_CODE_REQUIRED" -> "엑셀 원본 행의 품목코드가 비어 있어 상품을 확인할 수 없습니다."
		"PRODUCT_MASTER_NOT_FOUND" -> buildString {
			append("품목코드 ")
			append(targetCode ?: "-")
			append("가 현재 상품 마스터에 등록되어 있지 않습니다.")
			if (!targetName.isNullOrBlank()) append(" 엑셀 상품명은 '$targetName'입니다.")
		}
		"LABEL_EA_PRODUCT_CODE_MISSING" -> "Label_EA 행의 품목코드가 비어 있습니다. 1차 MVP에서는 Warning으로만 표시합니다."
		"LABEL_EA_PRODUCT_MASTER_NOT_FOUND" -> buildString {
			append("Label_EA 품목코드 ")
			append(targetCode ?: "-")
			append("가 상품 마스터에 없습니다.")
			if (!targetName.isNullOrBlank()) append(" 엑셀 상품명은 '$targetName'입니다.")
		}
		"STORE_CODE_REQUIRED" -> "엑셀 원본 행의 거래처/배송지 코드가 비어 있어 배송지를 확인할 수 없습니다."
		"STORE_ROUTE_MASTER_NOT_FOUND" -> buildString {
			append("거래처/배송지 코드 ")
			append(targetCode ?: "-")
			append("가 현재 배송지/차량 마스터에 등록되어 있지 않습니다.")
			if (!targetName.isNullOrBlank()) append(" 엑셀 거래처명은 '$targetName'입니다.")
		}
		"VEHICLE_NAME_MISMATCH" -> "엑셀 차량명 '${originalValue ?: "-"}'이 현재 마스터 차량명 '${normalizedValue ?: "-"}'과 다릅니다."
		else -> message
	}

private fun ValidationErrorEntity.actionGuide(): String =
	when (errorCode) {
		"PRODUCT_CODE_REQUIRED" -> "OIS 원본 엑셀의 품목코드를 확인한 뒤 다시 업로드하세요."
		"PRODUCT_MASTER_NOT_FOUND" -> "상품 마스터에 해당 품목코드를 추가하거나, OIS 원본 품목코드가 오타인지 확인한 뒤 재검증하세요."
		"LABEL_EA_PRODUCT_CODE_MISSING" -> "운영 정책상 필요한 경우 OIS 원본의 Label_EA 품목코드를 보완하세요."
		"LABEL_EA_PRODUCT_MASTER_NOT_FOUND" -> "상품 마스터 추가가 필요한 코드인지 확인하세요. Label_EA 예외 정책은 운영 기준에 따릅니다."
		"STORE_CODE_REQUIRED" -> "OIS 원본 엑셀의 거래처/배송지 코드를 확인한 뒤 다시 업로드하세요."
		"STORE_ROUTE_MASTER_NOT_FOUND" -> "배송지/차량 마스터에 해당 코드를 추가하거나, OIS 원본 거래처/배송지 코드가 오타인지 확인한 뒤 재검증하세요."
		"VEHICLE_NAME_MISMATCH" -> "배송지/차량 마스터의 차량명과 OIS 원본 차량명 중 어느 값이 맞는지 확인하세요."
		else -> "원본 데이터와 현재 마스터를 확인한 뒤 필요한 조치를 진행하세요."
	}

private fun ValidationErrorEntity.sourceSummary(context: ValidationTargetContext): String? {
	val values = listOfNotNull(
		context.orderNo?.takeIf(String::isNotBlank)?.let { "주문번호 $it" },
		context.storeName?.takeIf(String::isNotBlank)?.let { "거래처 $it" },
		context.productName?.takeIf(String::isNotBlank)?.let { "상품 $it" },
		context.orderQty?.takeIf(String::isNotBlank)?.let { qty -> context.unit?.let { "$qty $it" } ?: qty },
		context.barcodeOrQr?.takeIf(String::isNotBlank)?.let { "코드 $it" },
	)
	return values.takeIf { it.isNotEmpty() }?.joinToString(" / ")
}

private fun BigDecimal?.toDisplayString(): String? =
	this?.stripTrailingZeros()?.toPlainString()

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
