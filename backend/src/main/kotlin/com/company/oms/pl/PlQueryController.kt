package com.company.oms.pl

import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
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
	private val accessScopeService: AccessScopeService,
	private val plQueryService: PlQueryService,
) {

	@GetMapping
	fun listPlLines(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam(required = false) batchId: Long?,
		@RequestParam(required = false) plType: PlType?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		dueDate: LocalDate?,
		@RequestParam(required = false) vehicleName: String?,
		@RequestParam(required = false) storeCode: String?,
		@RequestParam(required = false) productCode: String?,
		@RequestParam(required = false) orderNo: String?,
		@RequestParam(defaultValue = "true") confirmedOnly: Boolean,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<PlLineResponse> {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		val scope = accessScopeService.resolveClientScope(tenantId, clientId)
		return plQueryService.listPlLines(
			tenantId = scope.tenantId,
			clientId = scope.clientId,
			batchId = batchId,
			plType = plType,
			dueDate = dueDate,
			vehicleName = vehicleName,
			storeCode = storeCode,
			productCode = productCode,
			orderNo = orderNo,
			confirmedOnly = confirmedOnly,
			page = page,
			size = size,
		)
	}
}
