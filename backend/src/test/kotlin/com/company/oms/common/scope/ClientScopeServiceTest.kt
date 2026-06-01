package com.company.oms.common.scope

import kotlin.test.Test
import kotlin.test.assertEquals

class ClientScopeServiceTest {

	@Test
	fun normalizeClientTextTreatsComposedAndDecomposedHangulAsSameClient() {
		val composed = "웰스토리"
		val decomposed = "웰스토리"

		assertEquals(normalizeClientText(composed), normalizeClientText(decomposed))
		assertEquals("웰스토리", normalizeClientText(decomposed))
	}
}
