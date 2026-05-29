package com.company.oms.externalapi

import com.company.oms.batch.ConfirmedBatchService
import com.company.oms.common.persistence.PlType
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import com.company.oms.pl.PlLineEntity
import com.company.oms.pl.PlLineRepository
import com.company.oms.scan.ScanLineEntity
import com.company.oms.scan.ScanLineRepository
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.time.LocalDate
import java.util.LinkedHashMap

@Service
@Profile("local")
class ExternalApiQueryService(
	private val confirmedBatchService: ConfirmedBatchService,
	private val scanLineRepository: ScanLineRepository,
	private val plLineRepository: PlLineRepository,
	private val objectMapper: ObjectMapper,
) {

	@Transactional(readOnly = true)
	fun listWosScanUpload(
		tenantId: Long,
		clientId: Long,
		batchId: Long?,
		deliveryDate: LocalDate?,
		scanCenter: String?,
		storeCode: String?,
		productCode: String?,
		barcode: String?,
		page: Int,
		size: Int,
	): PageResponse<ExternalApiExcelRowResponse> {
		val batches = confirmedBatchService.resolveConfirmedBatches(tenantId, clientId, batchId, deliveryDate)
		return batches
			.flatMap { batch ->
				scanLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, clientId, requireNotNull(batch.id))
			}
			.asSequence()
			.filter { deliveryDate == null || it.deliveryDate == deliveryDate }
			.filter { scanCenter == null || it.scanCenter == scanCenter }
			.filter { storeCode == null || it.orderBusinessSiteCode == storeCode }
			.filter { productCode == null || it.productCode == productCode }
			.filter { barcode == null || it.barcode == barcode }
			.sortedWith(compareBy({ it.batchId ?: 0 }, { it.id ?: 0 }))
			.map { it.toExternalScanRow() }
			.toList()
			.toPageResponse(page, size)
	}

	@Transactional(readOnly = true)
	fun listPickingList(
		tenantId: Long,
		clientId: Long,
		batchId: Long?,
		deliveryDate: LocalDate?,
		plType: PlType?,
		vehicleName: String?,
		storeCode: String?,
		productCode: String?,
		orderNo: String?,
		page: Int,
		size: Int,
	): PageResponse<ExternalApiExcelRowResponse> {
		val batches = confirmedBatchService.resolveConfirmedBatches(tenantId, clientId, batchId, deliveryDate)
		return batches
			.flatMap { batch ->
				plLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, clientId, requireNotNull(batch.id))
			}
			.asSequence()
			.filter { deliveryDate == null || it.dueDate == deliveryDate }
			.filter { plType == null || it.plType == plType }
			.filter { vehicleName == null || it.vehicleName == vehicleName }
			.filter { storeCode == null || it.storeCode == storeCode }
			.filter { productCode == null || it.productCode == productCode }
			.filter { orderNo == null || it.orderNo == orderNo }
			.sortedWith(compareBy({ it.batchId ?: 0 }, { it.id ?: 0 }))
			.map { it.toExternalPlRow() }
			.toList()
			.toPageResponse(page, size)
	}

	private fun ScanLineEntity.toExternalScanRow(): ExternalApiExcelRowResponse {
		val rawRow = parseRawRow(rawRowJson)
		return excelOrderedRow(SCAN_UPLOAD_HEADERS, rawRow) { header ->
			when (header) {
				"배송일자" -> deliveryDate
				"버스" -> bus
				"바코드" -> barcode
				"주문사업장코드" -> orderBusinessSiteCode
				"주문사업장명" -> storeName
				"품목코드" -> productCode
				"품목명" -> productName
				"라벨수량" -> labelQty
				"상품기본단위" -> unit
				"박스순번" -> boxSequence
				"온도유형" -> temperatureType
				else -> null
			}
		}.withTrace(batchId = requireNotNull(batchId), sourceSheet = sheetName, rowNo = rowNo)
	}

	private fun PlLineEntity.toExternalPlRow(): ExternalApiExcelRowResponse {
		val rawRow = parseRawRow(rawRowJson)
		val headers = if (plType == PlType.BOX) PL_BOX_HEADERS else PL_EA_HEADERS
		return excelOrderedRow(headers, rawRow) { header ->
			when (header) {
				"주문번호" -> orderNo
				"거래처코드" -> storeCode
				"거래처" -> storeName
				"브랜드" -> brandName
				"품목코드" -> productCode
				"품명" -> productName
				"단위" -> unit
				"보관온도" -> storageTemperature
				"납기요청일" -> dueDate
				"주문량" -> orderQty
				"차량명" -> vehicleName
				"CBM" -> cbm
				"QR코드" -> qrCode
				"박스입수량" -> boxQty
				else -> null
			}
		}.withTrace(batchId = requireNotNull(batchId), sourceSheet = sheetName, rowNo = rowNo)
	}

	private fun parseRawRow(rawRowJson: String?): Map<String, String> =
		rawRowJson
			?.let {
				runCatching {
					objectMapper.readValue(it, Map::class.java)
						.entries
						.associate { entry -> entry.key.toString() to (entry.value?.toString() ?: "") }
				}.getOrDefault(emptyMap())
			}
			?: emptyMap()

	private fun excelOrderedRow(
		headers: List<String>,
		rawRow: Map<String, String>,
		fallbackValue: (String) -> Any?,
	): LinkedHashMap<String, Any?> {
		val response = LinkedHashMap<String, Any?>()
		headers.forEach { header ->
			response[header] = rawRow[normalizeExcelHeader(header)]?.takeIf(String::isNotBlank) ?: fallbackValue(header)
		}
		return response
	}

	private fun LinkedHashMap<String, Any?>.withTrace(
		batchId: Long,
		sourceSheet: String,
		rowNo: Int,
	): ExternalApiExcelRowResponse {
		this["batchId"] = batchId
		this["sourceSheet"] = sourceSheet
		this["rowNo"] = rowNo
		return this
	}
}

private val SCAN_UPLOAD_HEADERS = listOf(
	"배송일자",
	"출고플랜트",
	"입고장",
	"존",
	"버스",
	"Seq",
	"바코드",
	"주문사업장코드",
	"주문사업장명",
	"납품처 코드",
	"납품처 명",
	"품목코드",
	"품목명",
	"라벨수량",
	"상품기본단위",
	"박스순번",
	"상품배송 구분",
	"온도유형",
	"소터 여부",
	"Sales Order No",
	"Sales Order 상세번호",
	"출력 횟수",
	"출력 일시",
	"삭제여부",
	"등록자",
	"등록일시",
	"수정자",
	"수정일시",
)

private val PL_EA_HEADERS = listOf(
	"주문번호",
	"거래처코드",
	"거래처",
	"브랜드",
	"품목코드",
	"품명",
	"규격",
	"단위",
	"과세대상",
	"분류(대)",
	"보관온도",
	"원산지",
	"품목비고",
	"납기요청일",
	"주문량",
	"물류대행",
	"차량명",
	"CBM",
	"간편주소",
	"박스입수량",
	"박스판매가능",
	"박스순번",
	"총박스수량",
	"박스번호",
	"QR코드",
	"비고",
	"순번",
)

private val PL_BOX_HEADERS = listOf(
	"주문번호",
	"거래처코드",
	"거래처",
	"브랜드",
	"품목코드",
	"품명",
	"규격",
	"단위",
	"과세대상",
	"분류(대)",
	"보관온도",
	"원산지",
	"품목비고",
	"납기요청일",
	"주문량",
	"물류대행",
	"차량명",
	"CBM",
	"간편주소",
	"박스입수량",
	"박스판매가능",
)

private fun normalizeExcelHeader(value: String): String =
	value.trim()
		.removePrefix("\uFEFF")
		.lowercase()
		.replace(Regex("[\\s_\\-]+"), "")
