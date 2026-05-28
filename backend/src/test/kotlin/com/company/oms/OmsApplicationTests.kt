package com.company.oms

import org.hamcrest.Matchers.nullValue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest
@AutoConfigureMockMvc
class OmsApplicationTests {

	@Autowired
	lateinit var mockMvc: MockMvc

	@Test
	fun contextLoads() {
	}

	@Test
	fun systemPingReturnsCommonResponse() {
		mockMvc.get("/api/v1/system/ping")
			.andExpect {
				status { isOk() }
				header { exists("X-Request-Id") }
				jsonPath("$.success") { value(true) }
				jsonPath("$.data.status") { value("OK") }
				jsonPath("$.error") { value(nullValue()) }
				jsonPath("$.meta.requestId") { exists() }
				jsonPath("$.meta.timestamp") { exists() }
			}
	}

	@Test
	fun commonExceptionHandlerReturnsErrorResponse() {
		mockMvc.get("/api/v1/system/error-sample")
			.andExpect {
				status { isBadRequest() }
				jsonPath("$.success") { value(false) }
				jsonPath("$.data") { value(nullValue()) }
				jsonPath("$.error.code") { value("INVALID_REQUEST") }
				jsonPath("$.error.message") { value("공통 예외 처리 검증용 오류입니다.") }
				jsonPath("$.error.details") { isArray() }
				jsonPath("$.meta.requestId") { exists() }
				jsonPath("$.meta.timestamp") { exists() }
			}
	}

	@Test
	fun requestIdHeaderIsUsedInResponseHeaderAndBody() {
		val requestId = "req-test-123"

		mockMvc.get("/api/v1/system/ping") {
			header("X-Request-Id", requestId)
		}.andExpect {
			status { isOk() }
			header { string("X-Request-Id", requestId) }
			jsonPath("$.meta.requestId") { value(requestId) }
		}
	}

	@Test
	fun healthEndpointStillReturnsUp() {
		mockMvc.get("/api/v1/health")
			.andExpect {
				status { isOk() }
				jsonPath("$.success") { value(true) }
				jsonPath("$.data.status") { value("UP") }
			}
	}
}
