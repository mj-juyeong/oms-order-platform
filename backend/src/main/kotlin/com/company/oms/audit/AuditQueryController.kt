package com.company.oms.audit

import com.company.oms.common.response.PageResponse
import org.springframework.context.annotation.Profile
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDateTime

@RestController
@RequestMapping("/api/v1/audit")
@Profile("local")
class AuditQueryController(
	private val auditQueryService: AuditQueryService,
) {

	@GetMapping("/batches")
	fun listBatchAuditLogs(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@RequestParam(required = false) batchId: Long?,
		@RequestParam(required = false) action: String?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
		from: LocalDateTime?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
		to: LocalDateTime?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<BatchAuditLogResponse> =
		auditQueryService.listBatchAuditLogs(tenantId, clientId, batchId, action, from, to, page, size)

	@GetMapping("/api-calls")
	fun listApiCallLogs(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@RequestParam(required = false) apiKeyId: Long?,
		@RequestParam(required = false) path: String?,
		@RequestParam(required = false) responseStatus: Int?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
		from: LocalDateTime?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
		to: LocalDateTime?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ApiCallLogResponse> =
		auditQueryService.listApiCallLogs(tenantId, clientId, apiKeyId, path, responseStatus, from, to, page, size)

	@GetMapping("/downloads")
	fun listDownloadLogs(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@RequestParam(required = false) batchId: Long?,
		@RequestParam(required = false) downloadType: String?,
		@RequestParam(required = false) downloadedBy: Long?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
		from: LocalDateTime?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
		to: LocalDateTime?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<AuditDownloadLogResponse> =
		auditQueryService.listDownloadLogs(tenantId, clientId, batchId, downloadType, downloadedBy, from, to, page, size)
}
