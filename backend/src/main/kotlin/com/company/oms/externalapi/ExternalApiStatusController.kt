package com.company.oms.externalapi

import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.response.PageResponse
import org.springframework.context.annotation.Profile
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequestMapping("/api/v1/external-api")
@Profile("local")
class ExternalApiStatusController(
	private val externalApiStatusService: ExternalApiStatusService,
) {

	@GetMapping("/status")
	fun listStatus(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@RequestParam(required = false) channel: ExternalApiChannel?,
		@RequestParam(required = false) batchId: Long?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		deliveryDate: LocalDate?,
		@RequestParam(required = false) status: BatchStatus?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ExternalApiStatusResponse> =
		externalApiStatusService.listStatus(
			tenantId = tenantId,
			clientId = clientId,
			channel = channel,
			batchId = batchId,
			deliveryDate = deliveryDate,
			status = status,
			page = page,
			size = size,
		)
}
