package com.company.oms.pl

import com.company.oms.common.persistence.PlType
import com.company.oms.common.response.PageResponse
import org.springframework.context.annotation.Profile
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequestMapping("/api/v1/pl-lines")
@Profile("local")
class PlQueryController(
	private val plQueryService: PlQueryService,
) {

	@GetMapping
	fun listPlLines(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@RequestParam(required = false) batchId: Long?,
		@RequestParam(required = false) plType: PlType?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		dueDate: LocalDate?,
		@RequestParam(required = false) vehicleName: String?,
		@RequestParam(required = false) storeCode: String?,
		@RequestParam(required = false) productCode: String?,
		@RequestParam(required = false) orderNo: String?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<PlLineResponse> =
		plQueryService.listPlLines(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
			plType = plType,
			dueDate = dueDate,
			vehicleName = vehicleName,
			storeCode = storeCode,
			productCode = productCode,
			orderNo = orderNo,
			page = page,
			size = size,
		)
}
