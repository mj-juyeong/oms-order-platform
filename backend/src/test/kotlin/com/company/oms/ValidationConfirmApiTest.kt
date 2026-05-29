package com.company.oms

import com.company.oms.audit.BatchAuditLogRepository
import com.company.oms.common.scope.ClientEntity
import com.company.oms.common.scope.ClientRepository
import com.company.oms.common.scope.TenantEntity
import com.company.oms.common.scope.TenantRepository
import com.company.oms.master.ProductMasterItemEntity
import com.company.oms.master.ProductMasterItemRepository
import com.company.oms.master.StoreRouteMasterItemEntity
import com.company.oms.master.StoreRouteMasterItemRepository
import com.company.oms.batch.UploadBatchRepository
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.flywaydb.core.Flyway
import org.hamcrest.Matchers.hasItem
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
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
import org.springframework.test.web.servlet.post
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
class ValidationConfirmApiTest @Autowired constructor(
	private val mockMvc: MockMvc,
	private val tenantRepository: TenantRepository,
	private val clientRepository: ClientRepository,
	private val productMasterItemRepository: ProductMasterItemRepository,
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
	private val uploadBatchRepository: UploadBatchRepository,
	private val batchAuditLogRepository: BatchAuditLogRepository,
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
	fun validationPassesThenConfirmAndRollback() {
		val scope = createScope()
		seedMasters(scope.tenantId, productCode = "001234", storeCode = "000777", vehicleName = "차량1")
		val batchId = uploadWorkbook(scope, productCode = "001234", storeCode = "000777", vehicleName = "차량1")

		mockMvc.post("/api/v1/order-excel-batches/$batchId/validate") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("memo", "검증")
			param("actorId", "100")
			header("X-Request-Id", "req-validate-ok")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.status") { value("READY_TO_CONFIRM") }
			jsonPath("$.data.errorCount") { value(0) }
			jsonPath("$.data.warningCount") { value(0) }
			jsonPath("$.data.productMasterCheckedAt") { exists() }
			jsonPath("$.meta.requestId") { value("req-validate-ok") }
		}

		mockMvc.post("/api/v1/order-excel-batches/$batchId/confirm") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("actorId", "100")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.status") { value("CONFIRMED") }
			jsonPath("$.data.confirmedAt") { exists() }
		}

		mockMvc.post("/api/v1/order-excel-batches/$batchId/rollback") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			contentType = org.springframework.http.MediaType.APPLICATION_JSON
			content = """{"reason":"운영 요청","actorId":100}"""
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.status") { value("ROLLED_BACK") }
			jsonPath("$.data.rolledBackAt") { exists() }
		}

		val actions = batchAuditLogRepository.findAllByBatchId(batchId).map { it.action }
		assertTrue(actions.contains("VALIDATION_STARTED"))
		assertTrue(actions.contains("VALIDATION_COMPLETED"))
		assertTrue(actions.contains("CONFIRMED"))
		assertTrue(actions.contains("ROLLED_BACK"))
	}

	@Test
	fun validationFailsWhenProductMasterIsMissingAndConfirmIsBlocked() {
		val scope = createScope()
		seedMasters(scope.tenantId, productCode = "001234", storeCode = "000777", vehicleName = "차량1")
		val batchId = uploadWorkbook(scope, productCode = "009999", storeCode = "000777", vehicleName = "차량1")

		mockMvc.post("/api/v1/order-excel-batches/$batchId/validate") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.status") { value("VALIDATION_FAILED") }
			jsonPath("$.data.errorCount") { value(2) }
		}

		mockMvc.get("/api/v1/order-excel-batches/$batchId/validation-errors") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("severity", "ERROR")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.items[*].errorCode") { value(hasItem("PRODUCT_MASTER_NOT_FOUND")) }
		}

		mockMvc.post("/api/v1/order-excel-batches/$batchId/confirm") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
		}.andExpect {
			status { isBadRequest() }
			jsonPath("$.error.code") { value("INVALID_BATCH_STATUS") }
		}
	}

	@Test
	fun warningOnlyValidationCanBeConfirmedAndUploadedBatchCanBeCancelled() {
		val scope = createScope()
		seedMasters(scope.tenantId, productCode = "001234", storeCode = "000777", vehicleName = "차량1")
		val warningBatchId = uploadWorkbook(scope, productCode = "001234", storeCode = "000777", vehicleName = "차량2")

		mockMvc.post("/api/v1/order-excel-batches/$warningBatchId/validate") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.status") { value("READY_TO_CONFIRM") }
			jsonPath("$.data.errorCount") { value(0) }
			jsonPath("$.data.warningCount") { value(1) }
		}

		mockMvc.post("/api/v1/order-excel-batches/$warningBatchId/confirm") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.status") { value("CONFIRMED") }
		}

		val cancelBatchId = uploadWorkbook(scope, productCode = "001234", storeCode = "000777", vehicleName = "차량1")
		mockMvc.post("/api/v1/order-excel-batches/$cancelBatchId/cancel") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			contentType = org.springframework.http.MediaType.APPLICATION_JSON
			content = """{"reason":"잘못된 파일 업로드"}"""
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.status") { value("CANCELLED") }
			jsonPath("$.data.cancelledAt") { exists() }
		}
	}

	private fun createScope(): TestScope {
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
		return TestScope(tenant.id!!, client.id!!)
	}

	private fun seedMasters(
		tenantId: Long,
		productCode: String,
		storeCode: String,
		vehicleName: String,
	) {
		productMasterItemRepository.saveAndFlush(
			ProductMasterItemEntity(
				tenantId = tenantId,
				ezadminCode = productCode,
				productName = "상품",
			),
		)
		storeRouteMasterItemRepository.saveAndFlush(
			StoreRouteMasterItemEntity(
				tenantId = tenantId,
				baljugoCode = storeCode,
				storeName = "매장",
				vehicleName = vehicleName,
			),
		)
	}

	private fun uploadWorkbook(
		scope: TestScope,
		productCode: String,
		storeCode: String,
		vehicleName: String,
	): Long {
		mockMvc.multipart("/api/v1/order-excel-batches") {
			file(
				MockMultipartFile(
					"file",
					"ois-input.xlsx",
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					oisWorkbookBytes(productCode, storeCode, vehicleName),
				),
			)
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
		}.andExpect {
			status { isOk() }
		}

		return uploadBatchRepository.findAllByTenantIdAndClientId(scope.tenantId, scope.clientId)
			.maxBy { it.uploadedAt }
			.id!!
	}

	private fun oisWorkbookBytes(
		productCode: String,
		storeCode: String,
		vehicleName: String,
	): ByteArray {
		XSSFWorkbook().use { workbook ->
			createScanSheet(workbook, productCode, storeCode)
			createPlSheet(workbook, productCode, storeCode, vehicleName)
			createLabelSheet(workbook, productCode, storeCode)

			return ByteArrayOutputStream().use { output ->
				workbook.write(output)
				output.toByteArray()
			}
		}
	}

	private fun createScanSheet(workbook: XSSFWorkbook, productCode: String, storeCode: String) {
		val sheet = workbook.createSheet("Scan_upload_장지")
		listOf("delivery_date", "barcode", "order_business_site_code", "product_code", "product_name").writeTo(sheet.createRow(0))
		listOf("2026-05-29", "0000123456789", storeCode, productCode, "상품").writeTo(sheet.createRow(1))
	}

	private fun createPlSheet(workbook: XSSFWorkbook, productCode: String, storeCode: String, vehicleName: String) {
		val sheet = workbook.createSheet("PL_EA")
		listOf("order_no", "store_code", "store_name", "product_code", "product_name", "due_date", "order_qty", "vehicle_name").writeTo(sheet.createRow(0))
		listOf("0000000001", storeCode, "매장", productCode, "상품", "2026-05-29", "3", vehicleName).writeTo(sheet.createRow(1))
	}

	private fun createLabelSheet(workbook: XSSFWorkbook, productCode: String, storeCode: String) {
		val sheet = workbook.createSheet("Label_EA")
		listOf("order_no", "store_code", "store_name", "product_code", "product_name", "order_qty", "matching_code", "qr_code").writeTo(sheet.createRow(0))
		listOf("0000000001", storeCode, "매장", productCode, "상품", "3", "MATCH-0001", "QR-0001").writeTo(sheet.createRow(1))
	}

	private fun List<String>.writeTo(row: org.apache.poi.ss.usermodel.Row) {
		forEachIndexed { index, value -> row.createCell(index).setCellValue(value) }
	}

	data class TestScope(
		val tenantId: Long,
		val clientId: Long,
	)

	companion object {
		@Container
		@JvmStatic
		val mysql: ValidationConfirmMySqlContainer = ValidationConfirmMySqlContainer("mysql:8.4")
			.withDatabaseName("oms")
			.withUsername("oms")
			.withPassword("change-me")

		@JvmStatic
		private val storageRoot = Files.createTempDirectory("oms-validation-confirm-test").toString()

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

class ValidationConfirmMySqlContainer(imageName: String) : MySQLContainer<ValidationConfirmMySqlContainer>(imageName)
