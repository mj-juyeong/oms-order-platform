package com.company.oms.label

import com.company.oms.common.persistence.LabelType
import com.company.oms.common.response.PageResponse
import org.springframework.context.annotation.Profile
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/label-lines")
@Profile("local")
class LabelQueryController(
	private val labelQueryService: LabelQueryService,
) {

	@GetMapping
	fun listLabelLines(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@RequestParam(required = false) batchId: Long?,
		@RequestParam(required = false) labelType: LabelType?,
		@RequestParam(required = false) storeCode: String?,
		@RequestParam(required = false) storeName: String?,
		@RequestParam(required = false) productCode: String?,
		@RequestParam(required = false) productName: String?,
		@RequestParam(required = false) orderNo: String?,
		@RequestParam(required = false) matchingCode: String?,
		@RequestParam(required = false) qrCode: String?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<LabelLineResponse> =
		labelQueryService.listLabelLines(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
			labelType = labelType,
			storeCode = storeCode,
			storeName = storeName,
			productCode = productCode,
			productName = productName,
			orderNo = orderNo,
			matchingCode = matchingCode,
			qrCode = qrCode,
			page = page,
			size = size,
		)

	@GetMapping("/{labelLineId}")
	fun getLabelLine(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@PathVariable labelLineId: Long,
	): LabelLineResponse =
		labelQueryService.getLabelLine(
			tenantId = tenantId,
			clientId = clientId,
			labelLineId = labelLineId,
		)
}
