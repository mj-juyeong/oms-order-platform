package com.company.oms.download

import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
import com.company.oms.common.persistence.LabelType
import org.springframework.context.annotation.Profile
import org.springframework.http.ContentDisposition
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/downloads")
@Profile("local")
class DownloadController(
	private val accessScopeService: AccessScopeService,
	private val labelDownloadService: LabelDownloadService,
) {

	@GetMapping("/labels")
	fun downloadLabels(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam batchId: Long,
		@RequestParam(required = false) labelType: LabelType?,
		@RequestParam(required = false) storeCode: String?,
		@RequestParam(required = false) brandName: String?,
		@RequestParam(required = false) productCode: String?,
		@RequestParam(required = false) orderNo: String?,
		@RequestParam(required = false) matchingCode: String?,
		@RequestParam(required = false) qrCode: String?,
		@RequestParam(required = false) deliveryRound: String?,
		@RequestParam(required = false) vehicleName: String?,
		@RequestParam(required = false) downloadedBy: Long?,
	): ResponseEntity<ByteArray> {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		val file =
			labelDownloadService.downloadLabels(
				tenantId = scope.tenantId,
				clientId = scope.clientId,
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
				downloadedBy = downloadedBy,
			)

		return ResponseEntity.ok()
			.contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
			.header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.fileName).build().toString())
			.contentLength(file.contentLength.toLong())
			.body(file.content)
	}

	@GetMapping("/{downloadLogId}")
	fun getDownloadLog(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable downloadLogId: Long,
	): DownloadLogResponse {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return labelDownloadService.getDownloadLog(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			downloadLogId = downloadLogId,
		)
	}
}
