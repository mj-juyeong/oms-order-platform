package com.company.oms.upload

import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
import com.company.oms.batch.BatchConfirmationRequestCreateRequest
import com.company.oms.batch.BatchConfirmationRequestResponse
import com.company.oms.batch.BatchConfirmationRequestService
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
	private val accessScopeService: AccessScopeService,
	private val oisUploadService: OisUploadService,
	private val batchValidationService: BatchValidationService,
	private val confirmationRequestService: BatchConfirmationRequestService,
) {

	@PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
	fun uploadOrderExcel(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@RequestParam(required = false) memo: String?,
		@RequestParam(required = false) uploadedBy: Long?,
		@RequestParam(required = false) parentBatchId: Long?,
		@RequestParam(required = false) reuploadReason: String?,
		@RequestParam file: MultipartFile,
	): OisUploadResponse {
		accessScopeService.requireAnyRole(UserRole.ADMIN, UserRole.OPERATOR)
		val scope = accessScopeService.requireClientAccess(tenantId, clientId)
		return oisUploadService.uploadOrderExcel(
			tenantId = scope.tenantId,
			clientId = requireNotNull(scope.clientId),
			file = file,
			memo = memo,
			uploadedBy = uploadedBy,
			parentBatchId = parentBatchId,
			reuploadReason = reuploadReason,
		)
	}

	@GetMapping
	fun listBatches(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam(required = false) status: BatchStatus?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		deliveryDate: LocalDate?,
		@RequestParam(required = false) keyword: String?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		deliveryDateFrom: LocalDate?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		deliveryDateTo: LocalDate?,
		@RequestParam(defaultValue = "false") errorOnly: Boolean,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<OisBatchSummaryResponse> {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return oisUploadService.listBatches(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			status = status,
			keyword = keyword,
			deliveryDateFrom = deliveryDate ?: deliveryDateFrom,
			deliveryDateTo = deliveryDate ?: deliveryDateTo,
			errorOnly = errorOnly,
			page = page,
			size = size,
		)
	}

	@GetMapping("/{batchId}")
	fun getBatch(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable batchId: Long,
	): OisBatchDetailResponse {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return oisUploadService.getBatch(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			batchId = batchId,
		)
	}

	@PostMapping("/{batchId}/validate")
	fun validateBatch(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable batchId: Long,
		@RequestParam(required = false) memo: String?,
		@RequestParam(required = false) actorId: Long?,
	): BatchValidationResponse {
		accessScopeService.requireAnyRole(UserRole.ADMIN, UserRole.OPERATOR)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return batchValidationService.validateBatch(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			batchId = batchId,
			memo = memo,
			actorId = actorId,
		)
	}

	@PostMapping("/{batchId}/confirmation-requests")
	fun requestConfirmation(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable batchId: Long,
		@RequestBody(required = false) request: BatchConfirmationRequestCreateRequest?,
	): BatchConfirmationRequestResponse {
		val currentUser = accessScopeService.requireAnyRole(UserRole.ADMIN, UserRole.OPERATOR)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return confirmationRequestService.requestConfirmation(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			batchId = batchId,
			actorId = request?.actorId ?: currentUser.userId,
			memo = request?.memo,
		)
	}

	@GetMapping("/{batchId}/validation-errors")
	fun listValidationErrors(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable batchId: Long,
		@RequestParam(required = false) severity: ValidationSeverity?,
		@RequestParam(required = false) sheetName: String?,
		@RequestParam(required = false) errorCode: String?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ValidationErrorResponse> {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return batchValidationService.listValidationErrors(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			batchId = batchId,
			severity = severity,
			sheetName = sheetName,
			errorCode = errorCode,
			page = page,
			size = size,
		)
	}

	@PostMapping("/{batchId}/confirm")
	fun confirmBatch(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable batchId: Long,
		@RequestParam(required = false) actorId: Long?,
	): BatchStatusChangeResponse {
		accessScopeService.requireTenantOperator()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return batchValidationService.confirmBatch(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			batchId = batchId,
			actorId = actorId,
		)
	}

	@PostMapping("/{batchId}/cancel")
	fun cancelBatch(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable batchId: Long,
		@RequestBody(required = false) request: BatchActionRequest?,
	): BatchStatusChangeResponse {
		accessScopeService.requireTenantAdmin()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return batchValidationService.cancelBatch(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			batchId = batchId,
			request = request ?: BatchActionRequest(),
		)
	}

	@PostMapping("/{batchId}/rollback")
	fun rollbackBatch(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable batchId: Long,
		@RequestBody(required = false) request: BatchActionRequest?,
	): BatchStatusChangeResponse {
		accessScopeService.requireTenantAdmin()
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return batchValidationService.rollbackBatch(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			batchId = batchId,
			request = request ?: BatchActionRequest(),
		)
	}
}
