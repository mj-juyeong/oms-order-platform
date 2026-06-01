package com.company.oms.excel

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.LabelType
import com.company.oms.common.persistence.PlType
import com.company.oms.common.persistence.SheetType
import org.apache.poi.ss.usermodel.Cell
import org.apache.poi.ss.usermodel.DataFormatter
import org.apache.poi.ss.usermodel.DateUtil
import org.apache.poi.ss.usermodel.Row
import org.apache.poi.ss.usermodel.WorkbookFactory
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import java.io.ByteArrayInputStream
import java.math.BigDecimal
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Component
@Profile("local")
class OisExcelParser {
	private val formatter = DataFormatter()

	fun parse(bytes: ByteArray): ParsedOisWorkbook {
		WorkbookFactory.create(ByteArrayInputStream(bytes)).use { workbook ->
			val evaluator = workbook.creationHelper.createFormulaEvaluator()
			val sheets = (0 until workbook.numberOfSheets).mapNotNull { index ->
				if (workbook.isSheetHidden(index) || workbook.isSheetVeryHidden(index)) {
					return@mapNotNull null
				}

				val sheet = workbook.getSheetAt(index)
				val sheetName = sheet.sheetName.trim()
				val rows = sheet.asSequence().toList()
				val header = rows.firstOrNull()
				val headerRowNo = header?.rowNum?.plus(1)
				val headers = header?.let { readRow(it, evaluator).map(::normalizeHeader) }.orEmpty()
				val dataRows = rows.drop(1)

				when {
					sheetName.startsWith(SCAN_PREFIX, ignoreCase = true) -> {
						val suffix = sheetName.substringAfter(SCAN_PREFIX, missingDelimiterValue = "").takeIf { it.isNotBlank() }
						ParsedScanSheet(
							sheetName = sheetName,
							suffixValue = suffix,
							headerRowNo = headerRowNo,
							rows = dataRows.toParsedRows(headers, evaluator) { rowNo, raw ->
								ParsedScanRow(
									sheetName = sheetName,
									scanCenter = suffix,
									rowNo = rowNo,
									deliveryDate = raw.firstValue(SCAN_DELIVERY_DATE_HEADERS).toDateOrNull(),
									bus = raw.firstValue(SCAN_BUS_HEADERS),
									barcode = raw.firstValue(SCAN_BARCODE_HEADERS),
									orderBusinessSiteCode = raw.firstValue(SCAN_ORDER_BUSINESS_SITE_CODE_HEADERS),
									storeName = raw.firstValue(SCAN_STORE_NAME_HEADERS),
									productCode = raw.firstValue(PRODUCT_CODE_HEADERS),
									productName = raw.firstValue(PRODUCT_NAME_HEADERS),
									labelQty = raw.firstValue(SCAN_LABEL_QTY_HEADERS).toDecimalOrNull(),
									unit = raw.firstValue(UNIT_HEADERS),
									boxSequence = raw.firstValue(BOX_SEQUENCE_HEADERS),
									temperatureType = raw.firstValue(TEMPERATURE_TYPE_HEADERS),
									rawRow = raw,
								)
							},
						)
					}
					sheetName.equals("PL_EA", ignoreCase = true) -> parsePlSheet(sheetName, PlType.EA, headerRowNo, headers, dataRows, evaluator)
					sheetName.equals("PL_Box", ignoreCase = true) -> parsePlSheet(sheetName, PlType.BOX, headerRowNo, headers, dataRows, evaluator)
					sheetName.equals("Label_EA", ignoreCase = true) -> parseLabelSheet(sheetName, LabelType.EA, headerRowNo, headers, dataRows, evaluator)
					sheetName.equals("Label_Box", ignoreCase = true) -> parseLabelSheet(sheetName, LabelType.BOX, headerRowNo, headers, dataRows, evaluator)
					else -> IgnoredOisSheet(
						sheetName = sheetName,
						sheetType = SheetType.IGNORED,
						headerRowNo = headerRowNo,
						dataRowCount = dataRows.count { row -> readRow(row, evaluator).any(String::isNotBlank) },
						message = "정식 입력 시트가 아니므로 저장하지 않았습니다.",
					)
				}
			}

			if (sheets.none { it.sheetType != SheetType.IGNORED }) {
				throw OmsException(
					errorCode = ErrorCode.INVALID_COLUMNS,
					message = "정식 입력 시트를 찾을 수 없습니다.",
					status = HttpStatus.BAD_REQUEST,
				)
			}

			return ParsedOisWorkbook(sheets = sheets)
		}
	}

	private fun parsePlSheet(
		sheetName: String,
		plType: PlType,
		headerRowNo: Int?,
		headers: List<String>,
		dataRows: List<Row>,
		evaluator: org.apache.poi.ss.usermodel.FormulaEvaluator,
	): ParsedPlSheet =
		ParsedPlSheet(
			sheetName = sheetName,
			plType = plType,
			headerRowNo = headerRowNo,
			rows = dataRows.toParsedRows(headers, evaluator) { rowNo, raw ->
				ParsedPlRow(
					sheetName = sheetName,
					plType = plType,
					rowNo = rowNo,
					orderNo = raw.firstValue(ORDER_NO_HEADERS),
					storeCode = raw.firstValue(STORE_CODE_HEADERS),
					storeName = raw.firstValue(STORE_NAME_HEADERS),
					brandName = raw.firstValue(BRAND_NAME_HEADERS),
					productCode = raw.firstValue(PRODUCT_CODE_HEADERS),
					productName = raw.firstValue(PRODUCT_NAME_HEADERS),
					unit = raw.firstValue(UNIT_HEADERS),
					storageTemperature = raw.firstValue(STORAGE_TEMPERATURE_HEADERS),
					dueDate = raw.firstValue(DUE_DATE_HEADERS).toDateOrNull(),
					orderQty = raw.firstValue(ORDER_QTY_HEADERS).toDecimalOrNull(),
					vehicleName = raw.firstValue(VEHICLE_NAME_HEADERS),
					cbm = raw.firstValue(CBM_HEADERS).toDecimalOrNull(),
					qrCode = raw.firstValue(QR_CODE_HEADERS),
					boxQty = raw.firstValue(BOX_QTY_HEADERS).toDecimalOrNull(),
					rawRow = raw,
				)
			},
		)

	private fun parseLabelSheet(
		sheetName: String,
		labelType: LabelType,
		headerRowNo: Int?,
		headers: List<String>,
		dataRows: List<Row>,
		evaluator: org.apache.poi.ss.usermodel.FormulaEvaluator,
	): ParsedLabelSheet =
		ParsedLabelSheet(
			sheetName = sheetName,
			labelType = labelType,
			headerRowNo = headerRowNo,
			rows = dataRows.toParsedRows(headers, evaluator) { rowNo, raw ->
				ParsedLabelRow(
					sheetName = sheetName,
					labelType = labelType,
					rowNo = rowNo,
					orderNo = raw.firstValue(ORDER_NO_HEADERS),
					storeCode = raw.firstValue(STORE_CODE_HEADERS),
					storeName = raw.firstValue(STORE_NAME_HEADERS),
					brandName = raw.firstValue(BRAND_NAME_HEADERS),
					productCode = raw.firstValue(PRODUCT_CODE_HEADERS),
					productName = raw.firstValue(PRODUCT_NAME_HEADERS),
					orderQty = raw.firstValue(ORDER_QTY_HEADERS).toDecimalOrNull(),
					sequenceNo = raw.firstValue(SEQUENCE_NO_HEADERS),
					matchingCode = raw.firstValue(MATCHING_CODE_HEADERS),
					qrCode = raw.firstValue(QR_CODE_HEADERS),
					boxSequence = raw.firstValue(BOX_SEQUENCE_HEADERS),
					totalBoxQty = raw.firstValue(TOTAL_BOX_QTY_HEADERS).toDecimalOrNull(),
					rawRow = raw,
				)
			},
		)

	private fun <T> List<Row>.toParsedRows(
		headers: List<String>,
		evaluator: org.apache.poi.ss.usermodel.FormulaEvaluator,
		mapper: (Int, Map<String, String>) -> T,
	): List<T> =
		mapNotNull { row ->
			val raw = headers.withIndex().associate { (index, header) ->
				header to readCell(row.getCell(index), evaluator)
			}
			if (raw.values.all { it.isBlank() }) {
				null
			} else {
				mapper(row.rowNum + 1, raw)
			}
		}

	private fun readRow(
		row: Row,
		evaluator: org.apache.poi.ss.usermodel.FormulaEvaluator,
	): List<String> {
		val lastCell = row.lastCellNum.toInt().coerceAtLeast(0)
		return (0 until lastCell).map { index -> readCell(row.getCell(index), evaluator) }
	}

	private fun readCell(
		cell: Cell?,
		evaluator: org.apache.poi.ss.usermodel.FormulaEvaluator,
	): String =
		cell?.let { formatter.formatCellValue(it, evaluator).trim() }.orEmpty()
}

private const val SCAN_PREFIX = "Scan_upload_"

private val SCAN_DELIVERY_DATE_HEADERS = setOf("deliverydate", "delivery_date", "배송일자", "배송일")
private val SCAN_BUS_HEADERS = setOf("bus", "버스")
private val SCAN_BARCODE_HEADERS = setOf("barcode", "bar_code", "바코드")
private val SCAN_ORDER_BUSINESS_SITE_CODE_HEADERS = setOf("orderbusinesssitecode", "order_business_site_code", "주문사업장코드", "사업장코드")
private val SCAN_STORE_NAME_HEADERS = setOf("storename", "store_name", "주문사업장명", "매장명", "거래처명")
private val SCAN_LABEL_QTY_HEADERS = setOf("labelqty", "label_qty", "라벨수량")

private val ORDER_NO_HEADERS = setOf("orderno", "order_no", "주문번호")
private val STORE_CODE_HEADERS = setOf("storecode", "store_code", "거래처코드", "매장코드")
private val STORE_NAME_HEADERS = setOf("storename", "store_name", "거래처", "거래처명", "매장명")
private val BRAND_NAME_HEADERS = setOf("brandname", "brand_name", "브랜드명", "브랜드")
private val PRODUCT_CODE_HEADERS = setOf("productcode", "product_code", "품목코드", "상품코드")
private val PRODUCT_NAME_HEADERS = setOf("productname", "product_name", "품목명", "상품명", "품명")
private val UNIT_HEADERS = setOf("unit", "단위", "상품기본단위")
private val STORAGE_TEMPERATURE_HEADERS = setOf("storagetemperature", "storage_temperature", "보관온도")
private val DUE_DATE_HEADERS = setOf("duedate", "due_date", "납기요청일", "납기일", "배송일")
private val ORDER_QTY_HEADERS = setOf("orderqty", "order_qty", "주문량", "수량")
private val VEHICLE_NAME_HEADERS = setOf("vehiclename", "vehicle_name", "차량명")
private val CBM_HEADERS = setOf("cbm")
private val QR_CODE_HEADERS = setOf("qrcode", "qr_code", "qr코드", "QR코드".lowercase())
private val BOX_QTY_HEADERS = setOf("boxqty", "box_qty", "박스입수량", "입수량")
private val TEMPERATURE_TYPE_HEADERS = setOf("temperaturetype", "temperature_type", "온도유형", "보관온도")
private val BOX_SEQUENCE_HEADERS = setOf("boxsequence", "box_sequence", "박스순번")
private val SEQUENCE_NO_HEADERS = setOf("sequenceno", "sequence_no", "순번")
private val MATCHING_CODE_HEADERS = setOf("matchingcode", "matching_code", "매칭코드")
private val TOTAL_BOX_QTY_HEADERS = setOf("totalboxqty", "total_box_qty", "총박스수량")

private fun Map<String, String>.firstValue(candidates: Set<String>): String? =
	candidates.firstNotNullOfOrNull { key -> this[key]?.takeIf(String::isNotBlank) }

private fun normalizeHeader(value: String): String =
	value.trim()
		.removePrefix("\uFEFF")
		.lowercase()
		.replace(" ", "")
		.replace("-", "_")

private fun String?.toDecimalOrNull(): BigDecimal? =
	this?.replace(",", "")
		?.trim()
		?.takeIf(String::isNotBlank)
		?.let { value -> runCatching { BigDecimal(value) }.getOrNull() }

private fun String?.toDateOrNull(): LocalDate? {
	val value = this?.trim()?.takeIf(String::isNotBlank) ?: return null
	val patterns = listOf(
		DateTimeFormatter.ISO_LOCAL_DATE,
		DateTimeFormatter.ofPattern("yyyy.MM.dd"),
		DateTimeFormatter.ofPattern("yyyy/MM/dd"),
		DateTimeFormatter.ofPattern("yyyyMMdd"),
		DateTimeFormatter.ofPattern("M/d/yy"),
		DateTimeFormatter.ofPattern("M/d/yyyy"),
	)

	patterns.forEach { formatter ->
		runCatching { LocalDate.parse(value, formatter) }.getOrNull()?.let { return it }
	}

	return runCatching {
		DateUtil.getJavaDate(value.toDouble()).toInstant().atZone(ZoneId.systemDefault()).toLocalDate()
	}.getOrNull()
}
