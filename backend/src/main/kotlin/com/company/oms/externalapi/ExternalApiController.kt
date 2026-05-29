package com.company.oms.externalapi

import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.PlType
import com.company.oms.common.response.PageResponse
import jakarta.servlet.http.HttpServletRequest
import org.springframework.context.annotation.Profile
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequestMapping("/external/v1")
@Profile("local")
class ExternalApiController(
	private val externalApiQueryService: ExternalApiQueryService,
	private val externalApiLogService: ExternalApiLogService,
	private val externalApiKeyAuthService: ExternalApiKeyAuthService,
) {

	@GetMapping("/wos/scan-upload")
	fun listWosScanUpload(
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
		request: HttpServletRequest,
	): PageResponse<ExternalApiExcelRowResponse> =
		recordApiCall(request, requiredScope = "WOS_SCAN_READ") { tenantId, clientId ->
			externalApiQueryService.listWosScanUpload(
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

	@GetMapping("/pl/picking-list")
	fun listPickingList(
		@RequestParam(required = false) batchId: Long?,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
		deliveryDate: LocalDate?,
		@RequestParam(required = false) plType: PlType?,
		@RequestParam(required = false) vehicleName: String?,
		@RequestParam(required = false) storeCode: String?,
		@RequestParam(required = false) productCode: String?,
		@RequestParam(required = false) orderNo: String?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
		request: HttpServletRequest,
	): PageResponse<ExternalApiExcelRowResponse> =
		recordApiCall(request, requiredScope = "PL_READ") { tenantId, clientId ->
			externalApiQueryService.listPickingList(
				tenantId = tenantId,
				clientId = clientId,
				batchId = batchId,
				deliveryDate = deliveryDate,
				plType = plType,
				vehicleName = vehicleName,
				storeCode = storeCode,
				productCode = productCode,
				orderNo = orderNo,
				page = page,
				size = size,
			)
		}

	private fun <T> recordApiCall(
		request: HttpServletRequest,
		requiredScope: String,
		block: (tenantId: Long, clientId: Long) -> T,
	): T {
		val startedNanos = System.nanoTime()
		var apiKeyId: Long? = null
		var tenantId: Long? = null
		var clientId: Long? = null
		return try {
			val apiKey = externalApiKeyAuthService.requireApiKey(request, requiredScope)
			apiKeyId = apiKey.id
			tenantId = apiKey.tenantId
			clientId = requireNotNull(apiKey.clientId)
			val response = block(tenantId, clientId)
			externalApiLogService.record(request, tenantId, clientId, apiKeyId, 200, startedNanos)
			response
		} catch (exception: OmsException) {
			if (tenantId != null && clientId != null) {
				externalApiLogService.record(request, tenantId, clientId, apiKeyId, exception.status.value(), startedNanos)
			}
			throw exception
		} catch (exception: RuntimeException) {
			if (tenantId != null && clientId != null) {
				externalApiLogService.record(request, tenantId, clientId, apiKeyId, 500, startedNanos)
			}
			throw exception
		}
	}
}
