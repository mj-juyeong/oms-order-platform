package com.company.oms.excel

import kotlin.test.Test
import kotlin.test.assertEquals
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import java.io.ByteArrayOutputStream

class OisExcelParserTest {
	private val parser = OisExcelParser()

	@Test
	fun `PL and Label store name is parsed from Korean customer header`() {
		val parsed = parser.parse(workbookBytes())

		assertEquals("강남점", parsed.plRows.single().storeName)
		assertEquals("강남점", parsed.labelRows.single().storeName)
		assertEquals("브랜드A", parsed.labelRows.single().brandName)
	}

	private fun workbookBytes(): ByteArray {
		XSSFWorkbook().use { workbook ->
			workbook.createSheet("PL_EA").also { sheet ->
				listOf(
					"주문번호",
					"거래처코드",
					"거래처",
					"브랜드",
					"품목코드",
					"품명",
					"단위",
					"보관온도",
					"납기요청일",
					"주문량",
					"차량명",
				).writeTo(sheet.createRow(0))
				listOf(
					"0000000001",
					"BJ0133",
					"강남점",
					"브랜드A",
					"P000001",
					"냉장 소스",
					"EA",
					"냉장",
					"2026-05-29",
					"12",
					"11가1234",
				).writeTo(sheet.createRow(1))
			}

			workbook.createSheet("Label_EA").also { sheet ->
				listOf(
					"주문번호",
					"거래처코드",
					"거래처",
					"브랜드",
					"품목코드",
					"품명",
					"주문량",
					"순번",
					"매칭코드",
				).writeTo(sheet.createRow(0))
				listOf(
					"0000000001",
					"BJ0133",
					"강남점",
					"브랜드A",
					"P000001",
					"냉장 소스",
					"12",
					"1",
					"MATCH-0001",
				).writeTo(sheet.createRow(1))
			}

			return ByteArrayOutputStream().use { output ->
				workbook.write(output)
				output.toByteArray()
			}
		}
	}

	private fun List<String>.writeTo(row: org.apache.poi.ss.usermodel.Row) {
		forEachIndexed { index, value -> row.createCell(index).setCellValue(value) }
	}
}
