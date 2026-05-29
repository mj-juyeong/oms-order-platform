package com.company.oms

import com.company.oms.common.scope.ClientEntity
import com.company.oms.common.scope.ClientRepository
import com.company.oms.common.scope.TenantEntity
import com.company.oms.common.scope.TenantRepository
import com.company.oms.excel.ExcelSheetResultRepository
import com.company.oms.order.OrderLineRepository
import com.company.oms.pl.PlLineRepository
import com.company.oms.scan.ScanLineRepository
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.flywaydb.core.Flyway
import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfSystemProperty
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.multipart
import org.testcontainers.containers.MySQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@Testcontainers
@EnabledIfSystemProperty(named = "oms.test.db", matches = "true")
class OisUploadApiTest @Autowired constructor(
	private val mockMvc: MockMvc,
	private val tenantRepository: TenantRepository,
	private val clientRepository: ClientRepository,
	private val excelSheetResultRepository: ExcelSheetResultRepository,
	private val scanLineRepository: ScanLineRepository,
	private val plLineRepository: PlLineRepository,
	private val orderLineRepository: OrderLineRepository,
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
	fun oisExcelUploadStoresBatchSheetsLinesAndRebuiltOrderLines() {
		val (tenantId, clientId) = createScope()

		mockMvc.multipart("/api/v1/order-excel-batches") {
			file(
				MockMultipartFile(
					"file",
					"ois-input.xlsm",
					"application/vnd.ms-excel.sheet.macroEnabled.12",
					oisWorkbookBytes(),
				),
			)
			param("tenantId", tenantId.toString())
			param("clientId", clientId.toString())
			param("memo", "OIS 업로드 테스트")
			header("X-Request-Id", "req-ois-upload-1")
		}.andExpect {
			status { isOk() }
			jsonPath("$.success") { value(true) }
			jsonPath("$.data.tenantId") { value(tenantId.toInt()) }
			jsonPath("$.data.clientId") { value(clientId.toInt()) }
			jsonPath("$.data.status") { value("UPLOADED") }
			jsonPath("$.data.fileName") { value("ois-input.xlsm") }
			jsonPath("$.data.deliveryDate") { value("2026-05-29") }
			jsonPath("$.data.scanLineCount") { value(1) }
			jsonPath("$.data.plLineCount") { value(1) }
			jsonPath("$.data.labelLineCount") { value(1) }
			jsonPath("$.data.orderLineCount") { value(1) }
			jsonPath("$.data.sheetResults[*].sheetName") { value(hasItem("Scan_upload_군량리")) }
			jsonPath("$.meta.requestId") { value("req-ois-upload-1") }
		}

		val scanRows = scanLineRepository.findAllByTenantIdAndClientIdAndBarcode(
			tenantId = tenantId,
			clientId = clientId,
			barcode = "0000123456789",
		)
		assertEquals(1, scanRows.size)
		assertEquals("장지", scanRows.first().scanCenter)
		assertEquals("000777", scanRows.first().orderBusinessSiteCode)
		assertEquals("001234", scanRows.first().productCode)

		val plRows = plLineRepository.findAllByTenantIdAndClientIdAndOrderNo(
			tenantId = tenantId,
			clientId = clientId,
			orderNo = "0000000001",
		)
		assertEquals(1, plRows.size)
		assertEquals("001234", plRows.first().productCode)
		assertEquals("QR-0001", plRows.first().qrCode)

		val orderLine = orderLineRepository.findBySourcePlLineId(plRows.first().id!!)
		assertNotNull(orderLine)
		assertEquals("0000000001", orderLine?.orderNo)
		assertEquals("000777", orderLine?.storeCode)

		val emptyScanSheet = excelSheetResultRepository.findAllByBatchId(plRows.first().batchId)
			.first { it.sheetName == "Scan_upload_군량리" }
		assertEquals(0, emptyScanSheet.dataRowCount)

		mockMvc.get("/api/v1/order-excel-batches/${plRows.first().batchId}") {
			param("tenantId", tenantId.toString())
			param("clientId", clientId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.uploadedFiles", hasSize<Any>(1))
			jsonPath("$.data.sheetResults[*].sheetName") { value(hasItem("PL_EA")) }
			jsonPath("$.data.sheetResults[*].sheetName") { value(hasItem("Label_EA")) }
		}
	}

	private fun createScope(): Pair<Long, Long> {
		val tenant = tenantRepository.saveAndFlush(
			TenantEntity(
				code = "tenant-${UUID.randomUUID()}",
				name = "Tenant",
			),
		)
		val client = clientRepository.saveAndFlush(
			ClientEntity(
				tenantId = tenant.id!!,
				code = "client-${UUID.randomUUID()}",
				name = "Client",
			),
		)
		return tenant.id!! to client.id!!
	}

	private fun oisWorkbookBytes(): ByteArray {
		XSSFWorkbook().use { workbook ->
			createScanSheet(workbook)
			createEmptyScanSheet(workbook)
			createPlSheet(workbook)
			createLabelSheet(workbook)
			workbook.createSheet("메모")

			return ByteArrayOutputStream().use { output ->
				workbook.write(output)
				output.toByteArray()
			}
		}
	}

	private fun createScanSheet(workbook: XSSFWorkbook) {
		val sheet = workbook.createSheet("Scan_upload_장지")
		listOf(
			"delivery_date",
			"bus",
			"barcode",
			"order_business_site_code",
			"store_name",
			"product_code",
			"product_name",
			"label_qty",
			"unit",
			"box_sequence",
			"temperature_type",
		).writeTo(sheet.createRow(0))
		listOf(
			"2026-05-29",
			"BUS-1",
			"0000123456789",
			"000777",
			"매장A",
			"001234",
			"상품A",
			"3",
			"EA",
			"0001",
			"COLD",
		).writeTo(sheet.createRow(1))
	}

	private fun createEmptyScanSheet(workbook: XSSFWorkbook) {
		val sheet = workbook.createSheet("Scan_upload_군량리")
		listOf("delivery_date", "barcode", "order_business_site_code", "product_code").writeTo(sheet.createRow(0))
	}

	private fun createPlSheet(workbook: XSSFWorkbook) {
		val sheet = workbook.createSheet("PL_EA")
		listOf(
			"order_no",
			"store_code",
			"store_name",
			"brand_name",
			"product_code",
			"product_name",
			"unit",
			"storage_temperature",
			"due_date",
			"order_qty",
			"vehicle_name",
			"cbm",
			"qr_code",
			"box_qty",
		).writeTo(sheet.createRow(0))
		listOf(
			"0000000001",
			"000777",
			"매장A",
			"브랜드A",
			"001234",
			"상품A",
			"EA",
			"COLD",
			"2026-05-29",
			"3",
			"차량1",
			"0.123456",
			"QR-0001",
			"12",
		).writeTo(sheet.createRow(1))
	}

	private fun createLabelSheet(workbook: XSSFWorkbook) {
		val sheet = workbook.createSheet("Label_EA")
		listOf(
			"order_no",
			"store_code",
			"store_name",
			"product_code",
			"product_name",
			"order_qty",
			"sequence_no",
			"matching_code",
			"qr_code",
			"box_sequence",
			"total_box_qty",
		).writeTo(sheet.createRow(0))
		listOf(
			"0000000001",
			"000777",
			"매장A",
			"001234",
			"상품A",
			"3",
			"1",
			"MATCH-0001",
			"QR-0001",
			"0001",
			"1",
		).writeTo(sheet.createRow(1))
	}

	private fun List<String>.writeTo(row: org.apache.poi.ss.usermodel.Row) {
		forEachIndexed { index, value -> row.createCell(index).setCellValue(value) }
	}

	companion object {
		@Container
		@JvmStatic
		val mysql: OisUploadMySqlContainer = OisUploadMySqlContainer("mysql:8.4")
			.withDatabaseName("oms")
			.withUsername("oms")
			.withPassword("change-me")

		@JvmStatic
		private val storageRoot = Files.createTempDirectory("oms-ois-upload-test").toString()

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

class OisUploadMySqlContainer(imageName: String) : MySQLContainer<OisUploadMySqlContainer>(imageName)

