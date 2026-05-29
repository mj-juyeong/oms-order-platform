package com.company.oms.excel

import com.company.oms.common.persistence.LabelType
import com.company.oms.common.persistence.PlType
import com.company.oms.common.persistence.SheetType
import java.math.BigDecimal
import java.time.LocalDate

data class ParsedOisWorkbook(
	val sheets: List<ParsedOisSheet>,
) {
	val scanRows: List<ParsedScanRow> = sheets.filterIsInstance<ParsedScanSheet>().flatMap { it.rows }
	val plRows: List<ParsedPlRow> = sheets.filterIsInstance<ParsedPlSheet>().flatMap { it.rows }
	val labelRows: List<ParsedLabelRow> = sheets.filterIsInstance<ParsedLabelSheet>().flatMap { it.rows }
}

sealed interface ParsedOisSheet {
	val sheetName: String
	val sheetType: SheetType
	val suffixValue: String?
	val headerRowNo: Int?
	val dataRowCount: Int
	val status: String
	val message: String?
}

data class ParsedScanSheet(
	override val sheetName: String,
	override val suffixValue: String?,
	override val headerRowNo: Int?,
	val rows: List<ParsedScanRow>,
) : ParsedOisSheet {
	override val sheetType: SheetType = SheetType.SCAN_UPLOAD
	override val dataRowCount: Int = rows.size
	override val status: String = "PARSED"
	override val message: String? = null
}

data class ParsedPlSheet(
	override val sheetName: String,
	val plType: PlType,
	override val headerRowNo: Int?,
	val rows: List<ParsedPlRow>,
) : ParsedOisSheet {
	override val sheetType: SheetType = if (plType == PlType.EA) SheetType.PL_EA else SheetType.PL_BOX
	override val suffixValue: String? = null
	override val dataRowCount: Int = rows.size
	override val status: String = "PARSED"
	override val message: String? = null
}

data class ParsedLabelSheet(
	override val sheetName: String,
	val labelType: LabelType,
	override val headerRowNo: Int?,
	val rows: List<ParsedLabelRow>,
) : ParsedOisSheet {
	override val sheetType: SheetType = if (labelType == LabelType.EA) SheetType.LABEL_EA else SheetType.LABEL_BOX
	override val suffixValue: String? = null
	override val dataRowCount: Int = rows.size
	override val status: String = "PARSED"
	override val message: String? = null
}

data class IgnoredOisSheet(
	override val sheetName: String,
	override val sheetType: SheetType,
	override val headerRowNo: Int?,
	override val dataRowCount: Int,
	override val message: String?,
) : ParsedOisSheet {
	override val suffixValue: String? = null
	override val status: String = "IGNORED"
}

data class ParsedScanRow(
	val sheetName: String,
	val scanCenter: String?,
	val rowNo: Int,
	val deliveryDate: LocalDate?,
	val bus: String?,
	val barcode: String?,
	val orderBusinessSiteCode: String?,
	val storeName: String?,
	val productCode: String?,
	val productName: String?,
	val labelQty: BigDecimal?,
	val unit: String?,
	val boxSequence: String?,
	val temperatureType: String?,
	val rawRow: Map<String, String>,
)

data class ParsedPlRow(
	val sheetName: String,
	val plType: PlType,
	val rowNo: Int,
	val orderNo: String?,
	val storeCode: String?,
	val storeName: String?,
	val brandName: String?,
	val productCode: String?,
	val productName: String?,
	val unit: String?,
	val storageTemperature: String?,
	val dueDate: LocalDate?,
	val orderQty: BigDecimal?,
	val vehicleName: String?,
	val cbm: BigDecimal?,
	val qrCode: String?,
	val boxQty: BigDecimal?,
	val rawRow: Map<String, String>,
)

data class ParsedLabelRow(
	val sheetName: String,
	val labelType: LabelType,
	val rowNo: Int,
	val orderNo: String?,
	val storeCode: String?,
	val storeName: String?,
	val productCode: String?,
	val productName: String?,
	val orderQty: BigDecimal?,
	val sequenceNo: String?,
	val matchingCode: String?,
	val qrCode: String?,
	val boxSequence: String?,
	val totalBoxQty: BigDecimal?,
	val rawRow: Map<String, String>,
)

