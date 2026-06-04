package com.company.oms.externalapi

import com.company.oms.batch.ConfirmedBatchService
import com.company.oms.common.persistence.PlType
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import com.company.oms.pl.PlLineEntity
import com.company.oms.pl.PlLineRepository
import com.company.oms.scan.ScanLineEntity
import com.company.oms.scan.ScanLineRepository
import com.company.oms.common.scope.ClientRepository
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
	private val clientRepository: ClientRepository,
	private val objectMapper: ObjectMapper,
) {

	@Transactional(readOnly = true)
	fun listWosScanUpload(
		tenantId: Long,
		clientId: Long?,
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
		val clientInfoById = clientInfoById(batches.map { it.clientId })
		return batches
			.flatMap { batch ->
				scanLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, batch.clientId, requireNotNull(batch.id))
			}
			.asSequence()
			.filter { deliveryDate == null || it.deliveryDate == deliveryDate }
			.filter { scanCenter == null || it.scanCenter == scanCenter }
			.filter { storeCode == null || it.orderBusinessSiteCode == storeCode }
			.filter { productCode == null || it.productCode == productCode }
			.filter { barcode == null || it.barcode == barcode }
			.sortedWith(compareBy({ it.batchId ?: 0 }, { it.id ?: 0 }))
			.map { it.toExternalScanRow(clientInfoById[it.clientId]) }
			.toList()
			.toPageResponse(page, size)
	}

	@Transactional(readOnly = true)
	fun listPickingList(
		tenantId: Long,
		clientId: Long?,
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
		val clientInfoById = clientInfoById(batches.map { it.clientId })
		return batches
			.flatMap { batch ->
				plLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, batch.clientId, requireNotNull(batch.id))
			}
			.asSequence()
			.filter { deliveryDate == null || it.dueDate == deliveryDate }
			.filter { plType == null || it.plType == plType }
			.filter { vehicleName == null || it.vehicleName == vehicleName }
			.filter { storeCode == null || it.storeCode == storeCode }
			.filter { productCode == null || it.productCode == productCode }
			.filter { orderNo == null || it.orderNo == orderNo }
			.sortedWith(compareBy({ it.batchId ?: 0 }, { it.id ?: 0 }))
			.map { it.toExternalPlRow(clientInfoById[it.clientId]) }
			.toList()
			.toPageResponse(page, size)
	}

	private fun ScanLineEntity.toExternalScanRow(clientInfo: ExternalApiClientInfo?): ExternalApiExcelRowResponse {
		val rawRow = parseRawRow(rawRowJson)
		return excelOrderedRow(SCAN_UPLOAD_RESPONSE_FIELDS, rawRow) { header ->
			when (header) {
				"deliveryDate" -> deliveryDate
				"bus" -> bus
				"barcode" -> barcode
				"orderBusinessSiteCode" -> orderBusinessSiteCode
				"orderBusinessSiteName" -> storeName
				"productCode" -> productCode
				"productName" -> productName
				"labelQty" -> labelQty
				"unit" -> unit
				"boxSequence" -> boxSequence
				"temperatureType" -> temperatureType
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
		}.withTrace(clientId = clientId, clientInfo = clientInfo, batchId = requireNotNull(batchId), sourceSheet = sheetName, rowNo = rowNo)
	}

	private fun PlLineEntity.toExternalPlRow(clientInfo: ExternalApiClientInfo?): ExternalApiExcelRowResponse {
		val rawRow = parseRawRow(rawRowJson)
		val headers = if (plType == PlType.BOX) PL_BOX_RESPONSE_FIELDS else PL_EA_RESPONSE_FIELDS
		return excelOrderedRow(headers, rawRow) { header ->
			when (header) {
				"orderNo" -> orderNo
				"storeCode" -> storeCode
				"storeName" -> storeName
				"brandName" -> brandName
				"productCode" -> productCode
				"productName" -> productName
				"unit" -> unit
				"storageTemperature" -> storageTemperature
				"dueDate" -> dueDate
				"orderQty" -> orderQty
				"vehicleName" -> vehicleName
				"cbm" -> cbm
				"qrCode" -> qrCode
				"boxQty" -> boxQty
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
		}.withTrace(clientId = clientId, clientInfo = clientInfo, batchId = requireNotNull(batchId), sourceSheet = sheetName, rowNo = rowNo)
	}

	private fun clientInfoById(clientIds: List<Long>): Map<Long, ExternalApiClientInfo> =
		clientRepository.findAllById(clientIds.distinct())
			.associate { client ->
				requireNotNull(client.id) to ExternalApiClientInfo(code = client.code, name = client.name)
			}

	private fun parseRawRow(rawRowJson: String?): Map<String, String> =
		rawRowJson
			?.let {
				runCatching {
					objectMapper.readValue(it, Map::class.java)
						.entries
						.associate { entry -> normalizeExcelHeader(entry.key.toString()) to (entry.value?.toString() ?: "") }
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
			response[header] = rawRowValue(rawRow, header) ?: fallbackValue(header)
		}
		return response
	}

	private fun rawRowValue(
		rawRow: Map<String, String>,
		header: String,
	): String? {
		val aliases = RESPONSE_FIELD_ALIASES[header].orEmpty() + header
		return aliases
			.asSequence()
			.mapNotNull { alias -> rawRow[normalizeExcelHeader(alias)]?.takeIf(String::isNotBlank) }
			.firstOrNull()
	}

	private fun LinkedHashMap<String, Any?>.withTrace(
		clientId: Long,
		clientInfo: ExternalApiClientInfo?,
		batchId: Long,
		sourceSheet: String,
		rowNo: Int,
	): ExternalApiExcelRowResponse {
		this["clientId"] = clientId
		this["clientCode"] = clientInfo?.code
		this["clientName"] = clientInfo?.name
		this["batchId"] = batchId
		this["sourceSheet"] = sourceSheet
		this["rowNo"] = rowNo
		return this
	}
}

private data class ExternalApiClientInfo(
	val code: String,
	val name: String,
)

private val SCAN_UPLOAD_RESPONSE_FIELDS = listOf(
	"deliveryDate",
	"outboundPlant",
	"inboundSite",
	"zone",
	"bus",
	"seq",
	"barcode",
	"orderBusinessSiteCode",
	"orderBusinessSiteName",
	"deliveryCustomerCode",
	"deliveryCustomerName",
	"productCode",
	"productName",
	"labelQty",
	"unit",
	"boxSequence",
	"deliveryType",
	"temperatureType",
	"sorterYn",
	"salesOrderNo",
	"salesOrderDetailNo",
	"printCount",
	"printedAt",
	"deletedYn",
	"createdByName",
	"createdAt",
	"updatedByName",
	"updatedAt",
)

private val PL_EA_RESPONSE_FIELDS = listOf(
	"orderNo",
	"storeCode",
	"storeName",
	"brandName",
	"productCode",
	"productName",
	"spec",
	"unit",
	"taxableType",
	"categoryLarge",
	"storageTemperature",
	"origin",
	"productMemo",
	"dueDate",
	"orderQty",
	"logisticsAgency",
	"vehicleName",
	"cbm",
	"simpleAddress",
	"boxQty",
	"boxSaleAvailable",
	"boxSequence",
	"totalBoxQty",
	"boxNo",
	"qrCode",
	"memo",
	"sequence",
)

private val PL_BOX_RESPONSE_FIELDS = listOf(
	"orderNo",
	"storeCode",
	"storeName",
	"brandName",
	"productCode",
	"productName",
	"spec",
	"unit",
	"taxableType",
	"categoryLarge",
	"storageTemperature",
	"origin",
	"productMemo",
	"dueDate",
	"orderQty",
	"logisticsAgency",
	"vehicleName",
	"cbm",
	"simpleAddress",
	"boxQty",
	"boxSaleAvailable",
)

private val RESPONSE_FIELD_ALIASES = mapOf(
	"deliveryDate" to listOf("배송일자", "delivery_date"),
	"outboundPlant" to listOf("출고플랜트", "outbound_plant"),
	"inboundSite" to listOf("입고장", "inbound_site"),
	"zone" to listOf("존"),
	"bus" to listOf("버스"),
	"seq" to listOf("Seq"),
	"barcode" to listOf("바코드"),
	"orderBusinessSiteCode" to listOf("주문사업장코드", "order_business_site_code"),
	"orderBusinessSiteName" to listOf("주문사업장명", "order_business_site_name"),
	"deliveryCustomerCode" to listOf("납품처 코드", "delivery_customer_code"),
	"deliveryCustomerName" to listOf("납품처 명", "delivery_customer_name"),
	"productCode" to listOf("품목코드", "product_code"),
	"productName" to listOf("품목명", "품명", "product_name"),
	"labelQty" to listOf("라벨수량", "label_qty"),
	"unit" to listOf("상품기본단위", "단위"),
	"boxSequence" to listOf("박스순번", "box_sequence"),
	"deliveryType" to listOf("상품배송 구분", "delivery_type"),
	"temperatureType" to listOf("온도유형", "temperature_type"),
	"sorterYn" to listOf("소터 여부", "sorter_yn"),
	"salesOrderNo" to listOf("Sales Order No", "sales_order_no"),
	"salesOrderDetailNo" to listOf("Sales Order 상세번호", "sales_order_detail_no"),
	"printCount" to listOf("출력 횟수", "print_count"),
	"printedAt" to listOf("출력 일시", "printed_at"),
	"deletedYn" to listOf("삭제여부", "deleted_yn"),
	"createdByName" to listOf("등록자", "created_by_name"),
	"updatedByName" to listOf("수정자", "updated_by_name"),
	"orderNo" to listOf("주문번호", "order_no"),
	"storeCode" to listOf("거래처코드", "store_code"),
	"storeName" to listOf("거래처", "store_name"),
	"brandName" to listOf("브랜드", "brand_name"),
	"spec" to listOf("규격"),
	"taxableType" to listOf("과세대상", "taxable_type"),
	"categoryLarge" to listOf("분류(대)", "category_large"),
	"storageTemperature" to listOf("보관온도", "storage_temperature"),
	"origin" to listOf("원산지"),
	"productMemo" to listOf("품목비고", "product_memo"),
	"dueDate" to listOf("납기요청일", "due_date"),
	"orderQty" to listOf("주문량", "order_qty"),
	"logisticsAgency" to listOf("물류대행", "logistics_agency"),
	"vehicleName" to listOf("차량명", "vehicle_name"),
	"cbm" to listOf("CBM"),
	"simpleAddress" to listOf("간편주소", "simple_address"),
	"boxQty" to listOf("박스입수량", "box_qty"),
	"boxSaleAvailable" to listOf("박스판매가능", "box_sale_available"),
	"totalBoxQty" to listOf("총박스수량", "total_box_qty"),
	"boxNo" to listOf("박스번호", "box_no"),
	"qrCode" to listOf("QR코드", "qr_code"),
	"memo" to listOf("비고"),
	"sequence" to listOf("순번"),
)

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
