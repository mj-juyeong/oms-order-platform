package com.company.oms.scan

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
	private val scanQueryService: ScanQueryService,
) {

	@GetMapping
	fun listScanLines(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@RequestParam(required = false) batchId: Long?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		deliveryDate: LocalDate?,
		@RequestParam(required = false) scanCenter: String?,
		@RequestParam(required = false) storeCode: String?,
		@RequestParam(required = false) productCode: String?,
		@RequestParam(required = false) barcode: String?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ScanLineResponse> =
		scanQueryService.listScanLines(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
			deliveryDate = deliveryDate,
			scanCenter = scanCenter,
			storeCode = storeCode,
			productCode = productCode,
			barcode = barcode,
			page = page,
			size = size,
		)
}
