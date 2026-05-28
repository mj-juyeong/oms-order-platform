package com.company.oms

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
	fun healthEndpointReturnsUp() {
		mockMvc.get("/api/v1/health")
			.andExpect {
				status { isOk() }
				jsonPath("$.status") { value("UP") }
			}
	}
}
