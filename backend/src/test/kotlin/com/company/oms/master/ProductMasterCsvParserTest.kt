package com.company.oms.master

import com.company.oms.common.error.OmsException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import java.math.BigDecimal
import java.nio.charset.StandardCharsets

class ProductMasterCsvParserTest {
	private val parser = ProductMasterCsvParser()

	@Test
	fun parsesNpProductMasterHeadersWithEmbeddedLineBreaks() {
		val csv = """
			No.,등록일자,"이지어드민
			상품코드","이지어드민
			상품명","거래처
			상품코드","박스
			입수량",출고단위,보관온도,CBM
			1,2026-05-29,P0001,상품A,C0001,12,EA,냉장,0.123456
		""".trimIndent()

		val rows = parser.parse(csv.toByteArray(StandardCharsets.UTF_8))

		assertEquals(1, rows.size)
		assertEquals("P0001", rows[0].ezadminCode)
		assertEquals("상품A", rows[0].productName)
		assertEquals("C0001", rows[0].customerProductCode)
		assertEquals(BigDecimal("12"), rows[0].boxQty)
		assertEquals("EA", rows[0].outboundUnit)
		assertEquals("냉장", rows[0].temperatureType)
		assertEquals(BigDecimal("0.123456"), rows[0].cbm)
	}

	@Test
	fun rejectsCorruptedHeadersInsteadOfPersistingMojibake() {
		val csv = """
			No.,?�록?�자,?��??�드�??�품코드,?��??�드�??�품�?,거래�??�품코드
			1,2026-05-29,P0001,상품A,C0001
		""".trimIndent()

		assertFailsWith<OmsException> {
			parser.parse(csv.toByteArray(StandardCharsets.UTF_8))
		}
	}
}
