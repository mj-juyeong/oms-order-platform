package com.company.oms

import com.company.oms.common.scope.TenantEntity
import com.company.oms.common.scope.TenantRepository
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.flywaydb.core.Flyway
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfSystemProperty
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.multipart
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.mock.web.MockMultipartFile
import org.testcontainers.containers.MySQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.io.ByteArrayOutputStream
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@Testcontainers
@EnabledIfSystemProperty(named = "oms.test.db", matches = "true")
class MasterUpsertApiTest @Autowired constructor(
	private val mockMvc: MockMvc,
	private val tenantRepository: TenantRepository,
) {

	@BeforeEach
	fun migrate() {
		Flyway.configure()
			.dataSource(mysql.jdbcUrl, mysql.username, mysql.password)
			.locations("classpath:db/migration")
			.load()
			.migrate()
	}

	@Test
	fun productMasterCsvUploadUpsertsCurrentRows() {
		val tenantId = createTenant()

		mockMvc.multipart("/api/v1/masters/products/uploads") {
			file(
				MockMultipartFile(
					"file",
					"products.csv",
					"text/csv",
					"""
				ezadmin_code,product_name,box_qty,outbound_unit,temperature_type,cbm
				00123,상품A,10,EA,COLD,0.123456
				00456,상품B,5,BOX,FROZEN,0.500000
					""".trimIndent().toByteArray(StandardCharsets.UTF_8),
				),
			)
			param("tenantId", tenantId.toString())
			header("X-Request-Id", "req-product-master-1")
		}.andExpect {
			status { isOk() }
			jsonPath("$.success") { value(true) }
			jsonPath("$.data.rowCount") { value(2) }
			jsonPath("$.data.insertedCount") { value(2) }
			jsonPath("$.data.updatedCount") { value(0) }
			jsonPath("$.data.unchangedCount") { value(0) }
			jsonPath("$.data.failedCount") { value(0) }
			jsonPath("$.data.status") { value("APPLIED") }
			jsonPath("$.meta.requestId") { value("req-product-master-1") }
		}

		mockMvc.multipart("/api/v1/masters/products/uploads") {
			file(
				MockMultipartFile(
					"file",
					"products.csv",
					"text/csv",
					"""
				ezadmin_code,product_name,box_qty,outbound_unit,temperature_type,cbm
				00123,상품A-수정,10,EA,COLD,0.123456
				00456,상품B,5,BOX,FROZEN,0.500000
					""".trimIndent().toByteArray(StandardCharsets.UTF_8),
				),
			)
			param("tenantId", tenantId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.rowCount") { value(2) }
			jsonPath("$.data.insertedCount") { value(0) }
			jsonPath("$.data.updatedCount") { value(1) }
			jsonPath("$.data.unchangedCount") { value(1) }
			jsonPath("$.data.failedCount") { value(0) }
		}

		mockMvc.get("/api/v1/masters/products") {
			param("tenantId", tenantId.toString())
			param("ezadminCode", "00123")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.items", hasSize<Any>(1))
			jsonPath("$.data.items[0].ezadminCode") { value("00123") }
			jsonPath("$.data.items[0].productName") { value("상품A-수정") }
		}
	}

	@Test
	fun storeRouteMasterXlsxUploadUpsertsCurrentRows() {
		val tenantId = createTenant()

		mockMvc.multipart("/api/v1/masters/store-routes/uploads") {
			file(
				MockMultipartFile(
					"file",
					"store-routes.xlsx",
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					storeRouteWorkbookBytes("매장A", "차량1"),
				),
			)
			param("tenantId", tenantId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.rowCount") { value(1) }
			jsonPath("$.data.insertedCount") { value(1) }
			jsonPath("$.data.status") { value("APPLIED") }
		}

		mockMvc.multipart("/api/v1/masters/store-routes/uploads") {
			file(
				MockMultipartFile(
					"file",
					"store-routes.xlsx",
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					storeRouteWorkbookBytes("매장A-수정", "차량2"),
				),
			)
			param("tenantId", tenantId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.rowCount") { value(1) }
			jsonPath("$.data.insertedCount") { value(0) }
			jsonPath("$.data.updatedCount") { value(1) }
		}

		mockMvc.get("/api/v1/masters/store-routes") {
			param("tenantId", tenantId.toString())
			param("baljugoCode", "000777")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.items", hasSize<Any>(1))
			jsonPath("$.data.items[0].baljugoCode") { value("000777") }
			jsonPath("$.data.items[0].storeName") { value("매장A-수정") }
			jsonPath("$.data.items[0].vehicleName") { value("차량2") }
		}
	}

	@Test
	fun invalidProductMasterExtensionReturnsCommonErrorResponse() {
		val tenantId = createTenant()

		mockMvc.multipart("/api/v1/masters/products/uploads") {
			file(
				MockMultipartFile(
					"file",
					"products.xlsx",
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					"ezadmin_code,product_name\n00123,상품A".toByteArray(StandardCharsets.UTF_8),
				),
			)
			param("tenantId", tenantId.toString())
		}.andExpect {
			status { isBadRequest() }
			jsonPath("$.success") { value(false) }
			jsonPath("$.error.code") { value("INVALID_FILE_EXTENSION") }
			jsonPath("$.meta.requestId") { exists() }
		}
	}

	@Test
	fun storeRouteMasterUploadUsesStoreDataSheetAndSupportsCustomerCodeAndActiveFilters() {
		val tenantId = createTenant()

		mockMvc.multipart("/api/v1/masters/store-routes/uploads") {
			file(
				MockMultipartFile(
					"file",
					"store-routes.xlsx",
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					storeRouteWorkbookBytes(
						storeName = "강남점",
						vehicleName = "11가1234",
						sheetName = "●Store_Data",
						includeJunkFirstSheet = true,
						customerCode = "seouldkb_017",
						deliveryDay = "월,화,수,목,금,토",
						activeStatus = "종료",
					),
				),
			)
			param("tenantId", tenantId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.rowCount") { value(1) }
			jsonPath("$.data.insertedCount") { value(1) }
			jsonPath("$.data.status") { value("APPLIED") }
		}

		mockMvc.get("/api/v1/masters/store-routes") {
			param("tenantId", tenantId.toString())
			param("storeCode", "seouldkb_017")
			param("activeYn", "false")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.items", hasSize<Any>(1))
			jsonPath("$.data.items[0].baljugoCode") { value("000777") }
			jsonPath("$.data.items[0].customerCode") { value("seouldkb_017") }
			jsonPath("$.data.items[0].storeName") { value("강남점") }
			jsonPath("$.data.items[0].area") { value("권역A") }
			jsonPath("$.data.items[0].deliveryDay") { value("월,화,수,목,금,토") }
			jsonPath("$.data.items[0].vehicleName") { value("11가1234") }
			jsonPath("$.data.items[0].activeYn") { value(false) }
		}
	}

	private fun createTenant(): Long =
		tenantRepository.saveAndFlush(
			TenantEntity(
				code = "tenant-${UUID.randomUUID()}",
				name = "Tenant",
			),
		).id!!

	private fun storeRouteWorkbookBytes(
		storeName: String,
		vehicleName: String,
		sheetName: String = "store_routes",
		includeJunkFirstSheet: Boolean = false,
		customerCode: String = "C001",
		deliveryDay: String = "월",
		activeStatus: String = "운영",
	): ByteArray {
		XSSFWorkbook().use { workbook ->
			if (includeJunkFirstSheet) {
				val junk = workbook.createSheet("cover")
				junk.createRow(0).createCell(0).setCellValue("not_a_master_sheet")
			}

			val sheet = workbook.createSheet(sheetName)
			val header = sheet.createRow(0)
			listOf(
				"baljugo_code",
				"customer_code",
				"brand_name",
				"store_name",
				"area",
				"delivery_day",
				"delivery_round",
				"vehicle_name",
				"driver_name",
				"address",
				"area",
				"operation_status",
			).forEachIndexed { index, value -> header.createCell(index).setCellValue(value) }

			val row = sheet.createRow(1)
			listOf(
				"000777",
				customerCode,
				"브랜드A",
				storeName,
				"권역A",
				deliveryDay,
				"1",
				vehicleName,
				"기사A",
				"서울",
				"뒤쪽권역",
				activeStatus,
			).forEachIndexed { index, value -> row.createCell(index).setCellValue(value) }

			return ByteArrayOutputStream().use { output ->
				workbook.write(output)
				output.toByteArray()
			}
		}
	}

	companion object {
		@Container
		@JvmStatic
		val mysql: MasterApiMySqlContainer = MasterApiMySqlContainer("mysql:8.4")
			.withDatabaseName("oms")
			.withUsername("oms")
			.withPassword("change-me")

		@JvmStatic
		private val storageRoot = Files.createTempDirectory("oms-master-api-test").toString()

		@JvmStatic
		@DynamicPropertySource
		fun datasourceProperties(registry: DynamicPropertyRegistry) {
			registry.add("spring.datasource.url", mysql::getJdbcUrl)
			registry.add("spring.datasource.username", mysql::getUsername)
			registry.add("spring.datasource.password", mysql::getPassword)
			registry.add("spring.datasource.driver-class-name") { "com.mysql.cj.jdbc.Driver" }
			registry.add("spring.jpa.hibernate.ddl-auto") { "none" }
			registry.add("spring.flyway.enabled") { "true" }
			registry.add("oms.file-storage.root-path") { storageRoot }
		}
	}
}

class MasterApiMySqlContainer(imageName: String) : MySQLContainer<MasterApiMySqlContainer>(imageName)
