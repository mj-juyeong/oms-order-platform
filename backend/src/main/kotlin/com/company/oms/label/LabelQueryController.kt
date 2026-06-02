package com.company.oms.label

import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
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
	private val accessScopeService: AccessScopeService,
	private val labelQueryService: LabelQueryService,
) {

	@GetMapping
	fun listLabelLines(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam(required = false) batchId: Long?,
		@RequestParam(required = false) labelType: LabelType?,
		@RequestParam(required = false) storeCode: String?,
		@RequestParam(required = false) storeName: String?,
		@RequestParam(required = false) brandName: String?,
		@RequestParam(required = false) productCode: String?,
		@RequestParam(required = false) productName: String?,
		@RequestParam(required = false) orderNo: String?,
		@RequestParam(required = false) matchingCode: String?,
		@RequestParam(required = false) qrCode: String?,
		@RequestParam(defaultValue = "true") confirmedOnly: Boolean,
		@RequestParam(required = false) sortBy: String?,
		@RequestParam(required = false) sortDirection: String?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<LabelLineResponse> {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return labelQueryService.listLabelLines(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			batchId = batchId,
			labelType = labelType,
			storeCode = storeCode,
			storeName = storeName,
			brandName = brandName,
			productCode = productCode,
			productName = productName,
			orderNo = orderNo,
			matchingCode = matchingCode,
			qrCode = qrCode,
			confirmedOnly = confirmedOnly,
			sortBy = sortBy,
			sortDirection = sortDirection,
			page = page,
			size = size,
		)
	}

	@GetMapping("/{labelLineId}")
	fun getLabelLine(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@PathVariable labelLineId: Long,
	): LabelLineResponse {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return labelQueryService.getLabelLine(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			labelLineId = labelLineId,
		)
	}
}
