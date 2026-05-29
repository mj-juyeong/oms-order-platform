package com.company.oms.master

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import org.apache.poi.ss.usermodel.DataFormatter
import org.apache.poi.ss.usermodel.Row
import org.apache.poi.ss.usermodel.Sheet
import org.apache.poi.ss.usermodel.WorkbookFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import java.io.ByteArrayInputStream
import java.math.BigDecimal
import java.nio.ByteBuffer
import java.nio.charset.CharacterCodingException
import java.nio.charset.Charset
import java.nio.charset.CodingErrorAction

@Component
class ProductMasterCsvParser {
	fun parse(bytes: ByteArray): List<ParsedProductMasterRow> {
		val rows = decodeCsvCandidates(bytes)
			.asSequence()
			.map { text -> parseCsv(text).filter { row -> row.any { it.isNotBlank() } } }
			.firstOrNull { rows ->
				rows.isEmpty() || rows.first().map(::normalizeHeader).any { headerMatches(it, PRODUCT_CODE_HEADERS) }
			}
			?: throw invalidColumnsException()

		if (rows.isEmpty()) {
			return emptyList()
		}

		val headers = rows.first().map(::normalizeHeader)
		val uniqueHeaders = headers.withDuplicateSuffixes()
		requireColumn(headers, PRODUCT_CODE_HEADERS)

		return rows.drop(1).mapIndexedNotNull { index, values ->
			val raw = uniqueHeaders.withIndex().associate { (headerIndex, header) ->
				header to values.getOrElse(headerIndex) { "" }.trim()
			}
			if (raw.values.all { it.isBlank() }) {
				null
			} else {
				ParsedProductMasterRow(
					rowNo = index + 2,
					ezadminCode = raw.firstValue(PRODUCT_CODE_HEADERS),
					productName = raw.firstValue(PRODUCT_NAME_HEADERS),
					customerProductCode = raw.firstValue(CUSTOMER_PRODUCT_CODE_HEADERS),
					boxQty = raw.firstValue(BOX_QTY_HEADERS).toDecimalOrNull(maxIntegerDigits = 15, maxScale = 3),
					outboundUnit = raw.firstValue(OUTBOUND_UNIT_HEADERS),
					temperatureType = raw.firstValue(TEMPERATURE_TYPE_HEADERS),
					cbm = raw.firstValue(CBM_HEADERS).toDecimalOrNull(maxIntegerDigits = 12, maxScale = 6),
					rawRow = raw,
				)
			}
		}
	}
}

@Component
class StoreRouteMasterExcelParser {
	private val formatter = DataFormatter().apply {
		setUseCachedValuesForFormulaCells(true)
	}

	fun parse(bytes: ByteArray): List<ParsedStoreRouteMasterRow> {
		WorkbookFactory.create(ByteArrayInputStream(bytes)).use { workbook ->
			if (workbook.numberOfSheets == 0) {
				throw OmsException(
					errorCode = ErrorCode.SHEET_NOT_FOUND,
					message = "배송지/차량 마스터 시트를 찾을 수 없습니다.",
					status = HttpStatus.BAD_REQUEST,
				)
			}

			val sheet = workbook.asSequence()
				.sortedBy { if (it.sheetName.isStoreRouteSheetName()) 0 else 1 }
				.firstOrNull { candidate ->
					candidate.firstOrNull()
						?.let { readCells(it).map(::normalizeHeader) }
						?.any { headerMatches(it, BALJUGO_CODE_HEADERS) } == true
				}
				?: throw OmsException(
					errorCode = ErrorCode.SHEET_NOT_FOUND,
					message = "배송지/차량 마스터 시트를 찾을 수 없습니다.",
					status = HttpStatus.BAD_REQUEST,
				)
			val headerRow = sheet.firstOrNull()
				?: return emptyList()
			val headers = readCells(headerRow).map(::normalizeHeader)
			val uniqueHeaders = headers.withDuplicateSuffixes()
			requireColumn(headers, BALJUGO_CODE_HEADERS)

			return sheet.drop(1).mapNotNull { row ->
				val values = readCells(row)
				val raw = uniqueHeaders.withIndex().associate { (headerIndex, header) ->
					header to values.getOrElse(headerIndex) { "" }.trim()
				}
				if (raw.values.all { it.isBlank() }) {
					null
				} else {
					ParsedStoreRouteMasterRow(
						rowNo = row.rowNum + 1,
						baljugoCode = raw.firstValue(BALJUGO_CODE_HEADERS),
						customerCode = raw.firstValue(CUSTOMER_CODE_HEADERS),
						brandName = raw.firstValue(BRAND_NAME_HEADERS),
						storeName = raw.firstValue(STORE_NAME_HEADERS),
						area = raw.firstValue(AREA_HEADERS),
						deliveryDay = raw.firstValue(DELIVERY_DAY_HEADERS),
						deliveryRound = raw.firstValue(DELIVERY_ROUND_HEADERS),
						vehicleName = raw.firstValue(VEHICLE_NAME_HEADERS),
						driverName = raw.firstValue(DRIVER_NAME_HEADERS),
						address = raw.firstValue(ADDRESS_HEADERS),
						activeYn = raw.firstValue(OPERATION_STATUS_HEADERS).toActiveYnOrNull(),
						rawRow = raw,
					)
				}
			}
		}
	}

	private fun readCells(row: Row): List<String> {
		val lastCell = row.lastCellNum.toInt().coerceAtLeast(0)
		return (0 until lastCell).map { index ->
			row.getCell(index)?.let(formatter::formatCellValue).orEmpty().trim()
		}
	}
}

private fun org.apache.poi.ss.usermodel.Workbook.asSequence(): Sequence<Sheet> =
	(0 until numberOfSheets).asSequence().map(::getSheetAt)

private fun String.isStoreRouteSheetName(): Boolean {
	val normalized = trim()
		.removePrefix("●")
		.replace(Regex("\\s+"), "")
		.replace("-", "_")
		.lowercase()
	return normalized == "store_data" || normalized == "storedata"
}

private val PRODUCT_CODE_HEADERS = setOf(
	"ezadmincode",
	"ezadmin_code",
	"ezadmin",
	"이지어드민상품코드",
	"품목코드",
	"상품코드",
)
private val PRODUCT_NAME_HEADERS = setOf(
	"productname",
	"product_name",
	"이지어드민상품명",
	"상품명",
	"품명",
)
private val CUSTOMER_PRODUCT_CODE_HEADERS = setOf(
	"customerproductcode",
	"customer_product_code",
	"거래처상품코드",
	"고객상품코드",
)
private val BOX_QTY_HEADERS = setOf("boxqty", "box_qty", "박스입수량", "입수량")
private val OUTBOUND_UNIT_HEADERS = setOf("outboundunit", "outbound_unit", "출고단위")
private val TEMPERATURE_TYPE_HEADERS = setOf("temperaturetype", "temperature_type", "보관온도", "온도유형")
private val CBM_HEADERS = setOf("cbm")

private val BALJUGO_CODE_HEADERS = setOf("baljugocode", "baljugo_code", "발주고코드", "배송지코드", "매장코드")
private val CUSTOMER_CODE_HEADERS = setOf("customercode", "customer_code", "거래처코드", "고객사코드")
private val BRAND_NAME_HEADERS = setOf("brandname", "brand_name", "브랜드명", "브랜드")
private val STORE_NAME_HEADERS = setOf("storename", "store_name", "매장명", "배송지명", "지점명")
private val AREA_HEADERS = setOf("area", "권역")
private val DELIVERY_DAY_HEADERS = setOf("deliveryday", "delivery_day", "배송요일", "배송일")
private val DELIVERY_ROUND_HEADERS = setOf("deliveryround", "delivery_round", "차수")
private val VEHICLE_NAME_HEADERS = setOf("vehiclename", "vehicle_name", "차량명")
private val DRIVER_NAME_HEADERS = setOf("drivername", "driver_name", "기사명", "담당기사")
private val ADDRESS_HEADERS = setOf("address", "주소")
private val OPERATION_STATUS_HEADERS = setOf("operationstatus", "operation_status", "activeyn", "active_yn", "운영여부", "사용여부")

private fun requireColumn(headers: List<String>, candidates: Set<String>) {
	if (headers.none { headerMatches(it, candidates) }) {
		throw invalidColumnsException()
	}
}

private fun invalidColumnsException(): OmsException =
	OmsException(
		errorCode = ErrorCode.INVALID_COLUMNS,
		message = "필수 컬럼이 누락되었습니다.",
		status = HttpStatus.BAD_REQUEST,
	)

private fun Map<String, String>.firstValue(candidates: Set<String>): String? =
	entries.firstNotNullOfOrNull { (header, value) ->
		value.takeIf { it.isNotBlank() && headerMatches(header, candidates) }
	}

private fun headerMatches(header: String, candidates: Set<String>): Boolean =
	header in candidates

private fun normalizeHeader(value: String): String =
	value.trim()
		.removePrefix("\uFEFF")
		.lowercase()
		.replace(Regex("\\s+"), "")
		.replace("-", "_")

private fun List<String>.withDuplicateSuffixes(): List<String> {
	val counts = mutableMapOf<String, Int>()
	return map { header ->
		val count = counts.getOrDefault(header, 0) + 1
		counts[header] = count
		if (count == 1) header else "${header}__${count}"
	}
}

private fun String?.toDecimalOrNull(maxIntegerDigits: Int, maxScale: Int): BigDecimal? =
	this?.replace(",", "")
		?.trim()
		?.takeIf(String::isNotBlank)
		?.let { value -> runCatching { BigDecimal(value) }.getOrNull() }
		?.takeIf { value ->
			val integerDigits = (value.precision() - value.scale()).coerceAtLeast(0)
			integerDigits <= maxIntegerDigits && value.scale().coerceAtLeast(0) <= maxScale
		}

private fun String?.toActiveYnOrNull(): Boolean? =
	when (this?.trim()?.lowercase()) {
		null, "" -> null
		"y", "yes", "true", "1", "active", "운영", "사용", "활성", "정상" -> true
		"n", "no", "false", "0", "inactive", "중지", "미사용", "비활성", "종료", "폐점" -> false
		else -> null
	}

private fun decodeCsvCandidates(bytes: ByteArray): List<String> =
	listOfNotNull(
		decodeStrict(bytes, Charsets.UTF_8),
		decodeStrict(bytes, Charset.forName("MS949")),
	).distinct()

private fun decodeStrict(bytes: ByteArray, charset: Charset): String? =
	try {
		charset.newDecoder()
			.onMalformedInput(CodingErrorAction.REPORT)
			.onUnmappableCharacter(CodingErrorAction.REPORT)
			.decode(ByteBuffer.wrap(bytes))
			.toString()
	} catch (_: CharacterCodingException) {
		null
	}

private fun parseCsv(text: String): List<List<String>> {
	val rows = mutableListOf<List<String>>()
	val row = mutableListOf<String>()
	val cell = StringBuilder()
	var inQuotes = false
	var index = 0

	while (index < text.length) {
		val char = text[index]
		when {
			char == '"' && inQuotes && index + 1 < text.length && text[index + 1] == '"' -> {
				cell.append('"')
				index++
			}
			char == '"' -> inQuotes = !inQuotes
			char == ',' && !inQuotes -> {
				row.add(cell.toString())
				cell.clear()
			}
			(char == '\n' || char == '\r') && !inQuotes -> {
				if (char == '\r' && index + 1 < text.length && text[index + 1] == '\n') {
					index++
				}
				row.add(cell.toString())
				rows.add(row.toList())
				row.clear()
				cell.clear()
			}
			else -> cell.append(char)
		}
		index++
	}

	if (cell.isNotEmpty() || row.isNotEmpty()) {
		row.add(cell.toString())
		rows.add(row.toList())
	}

	return rows
}
