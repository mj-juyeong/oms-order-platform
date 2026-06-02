package com.company.oms.scan

import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
import com.company.oms.common.response.PageResponse
import org.springframework.context.annotation.Profile
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequestMapping("/api/v1/scan-lines")
@Profile("local")
class ScanQueryController(
	private val accessScopeService: AccessScopeService,
	private val scanQueryService: ScanQueryService,
) {

	@GetMapping
	fun listScanLines(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam(required = false) batchId: Long?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		deliveryDate: LocalDate?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		deliveryDateFrom: LocalDate?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		deliveryDateTo: LocalDate?,
		@RequestParam(required = false) scanCenter: String?,
		@RequestParam(required = false) storeCode: String?,
		@RequestParam(required = false) storeName: String?,
		@RequestParam(required = false) productCode: String?,
		@RequestParam(required = false) productName: String?,
		@RequestParam(required = false) barcode: String?,
		@RequestParam(defaultValue = "true") confirmedOnly: Boolean,
		@RequestParam(required = false) sortBy: String?,
		@RequestParam(required = false) sortDirection: String?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ScanLineResponse> {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return scanQueryService.listScanLines(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			batchId = batchId,
			deliveryDate = deliveryDate,
			deliveryDateFrom = deliveryDateFrom,
			deliveryDateTo = deliveryDateTo,
			scanCenter = scanCenter,
			storeCode = storeCode,
			storeName = storeName,
			productCode = productCode,
			productName = productName,
			barcode = barcode,
			confirmedOnly = confirmedOnly,
			sortBy = sortBy,
			sortDirection = sortDirection,
			page = page,
			size = size,
		)
	}
}
