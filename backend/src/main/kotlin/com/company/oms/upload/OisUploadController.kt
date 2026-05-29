package com.company.oms.upload

import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.ValidationSeverity
import com.company.oms.common.response.PageResponse
import com.company.oms.validation.BatchActionRequest
import com.company.oms.validation.BatchStatusChangeResponse
import com.company.oms.validation.BatchValidationResponse
import com.company.oms.validation.BatchValidationService
import com.company.oms.validation.ValidationErrorResponse
import org.springframework.context.annotation.Profile
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.time.LocalDate

@RestController
@RequestMapping("/api/v1/order-excel-batches")
@Profile("local")
class OisUploadController(
	private val oisUploadService: OisUploadService,
	private val batchValidationService: BatchValidationService,
) {

	@PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
	fun uploadOrderExcel(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@RequestParam(required = false) memo: String?,
		@RequestParam(required = false) uploadedBy: Long?,
		@RequestParam file: MultipartFile,
	): OisUploadResponse =
		oisUploadService.uploadOrderExcel(
			tenantId = tenantId,
			clientId = clientId,
			file = file,
			memo = memo,
			uploadedBy = uploadedBy,
		)

	@GetMapping
	fun listBatches(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@RequestParam(required = false) status: BatchStatus?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		deliveryDate: LocalDate?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<OisBatchSummaryResponse> =
		oisUploadService.listBatches(
			tenantId = tenantId,
			clientId = clientId,
			status = status,
			deliveryDate = deliveryDate,
			page = page,
			size = size,
		)

	@GetMapping("/{batchId}")
	fun getBatch(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@PathVariable batchId: Long,
	): OisBatchDetailResponse =
		oisUploadService.getBatch(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
		)

	@PostMapping("/{batchId}/validate")
	fun validateBatch(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@PathVariable batchId: Long,
		@RequestParam(required = false) memo: String?,
		@RequestParam(required = false) actorId: Long?,
	): BatchValidationResponse =
		batchValidationService.validateBatch(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
			memo = memo,
			actorId = actorId,
		)

	@GetMapping("/{batchId}/validation-errors")
	fun listValidationErrors(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@PathVariable batchId: Long,
		@RequestParam(required = false) severity: ValidationSeverity?,
		@RequestParam(required = false) sheetName: String?,
		@RequestParam(required = false) errorCode: String?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ValidationErrorResponse> =
		batchValidationService.listValidationErrors(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
			severity = severity,
			sheetName = sheetName,
			errorCode = errorCode,
			page = page,
			size = size,
		)

	@PostMapping("/{batchId}/confirm")
	fun confirmBatch(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@PathVariable batchId: Long,
		@RequestParam(required = false) actorId: Long?,
	): BatchStatusChangeResponse =
		batchValidationService.confirmBatch(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
			actorId = actorId,
		)

	@PostMapping("/{batchId}/cancel")
	fun cancelBatch(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@PathVariable batchId: Long,
		@RequestBody(required = false) request: BatchActionRequest?,
	): BatchStatusChangeResponse =
		batchValidationService.cancelBatch(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
			request = request ?: BatchActionRequest(),
		)

	@PostMapping("/{batchId}/rollback")
	fun rollbackBatch(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@PathVariable batchId: Long,
		@RequestBody(required = false) request: BatchActionRequest?,
	): BatchStatusChangeResponse =
		batchValidationService.rollbackBatch(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
			request = request ?: BatchActionRequest(),
		)
}
