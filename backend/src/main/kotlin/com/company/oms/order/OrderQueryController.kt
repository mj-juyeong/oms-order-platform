package com.company.oms.order

import com.company.oms.common.response.PageResponse
import org.springframework.context.annotation.Profile
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequestMapping("/api/v1/orders")
@Profile("local")
class OrderQueryController(
	private val orderQueryService: OrderQueryService,
) {

	@GetMapping
	fun listOrders(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@RequestParam(required = false) batchId: Long?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		deliveryDate: LocalDate?,
		@RequestParam(required = false) storeCode: String?,
		@RequestParam(required = false) storeName: String?,
		@RequestParam(required = false) productCode: String?,
		@RequestParam(required = false) productName: String?,
		@RequestParam(required = false) orderNo: String?,
		@RequestParam(required = false) unit: String?,
		@RequestParam(required = false) vehicleName: String?,
		@RequestParam(required = false) confirmedOnly: Boolean?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		dueDateFrom: LocalDate?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		dueDateTo: LocalDate?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<OrderLineResponse> =
		orderQueryService.listOrders(
			tenantId = tenantId,
			clientId = clientId,
			batchId = batchId,
			deliveryDate = deliveryDate,
			storeCode = storeCode,
			storeName = storeName,
			productCode = productCode,
			productName = productName,
			orderNo = orderNo,
			unit = unit,
			vehicleName = vehicleName,
			confirmedOnly = confirmedOnly ?: false,
			dueDateFrom = dueDateFrom,
			dueDateTo = dueDateTo,
			page = page,
			size = size,
		)

	@GetMapping("/{orderLineId}")
	fun getOrderLine(
		@RequestParam tenantId: Long,
		@RequestParam clientId: Long,
		@PathVariable orderLineId: Long,
	): OrderLineResponse =
		orderQueryService.getOrderLine(
			tenantId = tenantId,
			clientId = clientId,
			orderLineId = orderLineId,
		)
}
