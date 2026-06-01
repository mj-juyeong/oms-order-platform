package com.company.oms

import com.company.oms.common.scope.ClientEntity
import com.company.oms.common.scope.ClientRepository
import com.company.oms.common.scope.TenantEntity
import com.company.oms.common.scope.TenantRepository
import com.company.oms.auth.ApiKeyEntity
import com.company.oms.auth.ApiKeyHash
import com.company.oms.auth.ApiKeyRepository
import com.company.oms.auth.RoleEntity
import com.company.oms.auth.RoleRepository
import com.company.oms.auth.UserEntity
import com.company.oms.auth.UserRepository
import com.company.oms.auth.UserRoleEntity
import com.company.oms.auth.UserRoleId
import com.company.oms.auth.UserRoleRepository
import com.company.oms.audit.BatchAuditLogRepository
import com.company.oms.common.persistence.UserScopeType
import com.company.oms.download.DownloadLogRepository
import com.company.oms.externalapi.ApiCallLogRepository
import com.company.oms.master.ProductMasterItemEntity
import com.company.oms.master.ProductMasterItemRepository
import com.company.oms.master.StoreRouteMasterItemEntity
import com.company.oms.master.StoreRouteMasterItemRepository
import com.company.oms.batch.UploadBatchRepository
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.flywaydb.core.Flyway
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
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.time.LocalDate
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@Testcontainers
@EnabledIfSystemProperty(named = "oms.test.db", matches = "true")
class Phase7ApiTest @Autowired constructor(
	private val mockMvc: MockMvc,
	private val tenantRepository: TenantRepository,
	private val clientRepository: ClientRepository,
	private val productMasterItemRepository: ProductMasterItemRepository,
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
	private val uploadBatchRepository: UploadBatchRepository,
	private val apiKeyRepository: ApiKeyRepository,
	private val userRepository: UserRepository,
	private val roleRepository: RoleRepository,
	private val userRoleRepository: UserRoleRepository,
	private val apiCallLogRepository: ApiCallLogRepository,
	private val downloadLogRepository: DownloadLogRepository,
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
	fun internalQueryApisReturnUploadedOperationalRows() {
		val scope = createScope()
		seedMasters(scope.tenantId, productCode = "001234", storeCode = "000777", vehicleName = "차량1")
		val batchId = uploadValidateAndConfirm(scope)
		val uploadedOnlyBatchId = uploadWorkbook(scope, productCode = "001234", storeCode = "000777", vehicleName = "차량1")

		mockMvc.get("/api/v1/orders") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("batchId", batchId.toString())
			param("orderNo", "0000000001")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.items[0].batchId") { value(batchId.toInt()) }
			jsonPath("$.data.items[0].orderNo") { value("0000000001") }
			jsonPath("$.data.items[0].brandName") { value("브랜드A") }
			jsonPath("$.data.items[0].productCode") { value("001234") }
			jsonPath("$.data.items[0].batchStatus") { value("CONFIRMED") }
			jsonPath("$.data.items[0].confirmed") { value(true) }
		}

		mockMvc.get("/api/v1/orders") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("brandName", "브랜드A")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(1) }
			jsonPath("$.data.items[0].brandName") { value("브랜드A") }
		}

		mockMvc.get("/api/v1/orders") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("confirmedOnly", "true")
			param("size", "20")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(1) }
			jsonPath("$.data.items[0].batchId") { value(batchId.toInt()) }
		}

		mockMvc.get("/api/v1/orders") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("batchId", uploadedOnlyBatchId.toString())
			param("confirmedOnly", "true")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(0) }
		}

		mockMvc.get("/api/v1/scan-lines") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("batchId", batchId.toString())
			param("barcode", "0000123456789")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.items[0].scanCenter") { value("장지") }
			jsonPath("$.data.items[0].barcode") { value("0000123456789") }
			jsonPath("$.data.items[0].orderBusinessSiteCode") { value("000777") }
		}

		mockMvc.get("/api/v1/scan-lines") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("batchId", uploadedOnlyBatchId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(0) }
		}

		mockMvc.get("/api/v1/scan-lines") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("batchId", uploadedOnlyBatchId.toString())
			param("confirmedOnly", "false")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(1) }
		}

		mockMvc.get("/api/v1/pl-lines") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("batchId", batchId.toString())
			param("plType", "EA")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.items[0].plType") { value("EA") }
			jsonPath("$.data.items[0].qrCode") { value("PL-QR-0001") }
		}

		mockMvc.get("/api/v1/pl-lines") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("batchId", uploadedOnlyBatchId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(0) }
		}

		mockMvc.get("/api/v1/pl-lines") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("batchId", uploadedOnlyBatchId.toString())
			param("confirmedOnly", "false")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(1) }
		}

		mockMvc.get("/api/v1/label-lines") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("batchId", batchId.toString())
			param("labelType", "EA")
			param("qrCode", "LABEL-QR-0001")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.items[0].labelType") { value("EA") }
			jsonPath("$.data.items[0].brandName") { value("브랜드A") }
			jsonPath("$.data.items[0].matchingCode") { value("MATCH-0001") }
		}

		mockMvc.get("/api/v1/label-lines") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("batchId", uploadedOnlyBatchId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(0) }
		}

		mockMvc.get("/api/v1/label-lines") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("batchId", uploadedOnlyBatchId.toString())
			param("confirmedOnly", "false")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(2) }
		}
	}

	@Test
	fun externalApisExposeOnlyConfirmedBatchesAndWriteApiCallLogs() {
		val scope = createScope()
		seedMasters(scope.tenantId, productCode = "001234", storeCode = "000777", vehicleName = "차량1")
		val apiKey = createApiKey(scope.tenantId, scope.clientId, setOf("WOS_SCAN_READ", "PL_READ"))
		val confirmedBatchId = uploadValidateAndConfirm(scope)
		val uploadedOnlyBatchId = uploadWorkbook(scope, productCode = "001234", storeCode = "000777", vehicleName = "차량1")

		mockMvc.get("/external/v1/wos/scan-upload") {
			param("batchId", confirmedBatchId.toString())
			param("deliveryDate", "2026-05-29")
			header("X-Api-Key", apiKey)
			header("X-Request-Id", "req-wos-phase7")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.items[0].batchId") { value(confirmedBatchId.toInt()) }
			jsonPath("$['data']['items'][0]['바코드']") { value("0000123456789") }
			jsonPath("$.meta.requestId") { value("req-wos-phase7") }
		}

		mockMvc.get("/external/v1/pl/picking-list") {
			param("batchId", confirmedBatchId.toString())
			param("plType", "EA")
			header("X-Api-Key", apiKey)
		}.andExpect {
			status { isOk() }
			jsonPath("$['data']['items'][0]['주문번호']") { value("0000000001") }
			jsonPath("$['data']['items'][0]['QR코드']") { value("PL-QR-0001") }
		}

		mockMvc.get("/external/v1/wos/scan-upload") {
			param("batchId", uploadedOnlyBatchId.toString())
			header("X-Api-Key", apiKey)
		}.andExpect {
			status { isBadRequest() }
			jsonPath("$.error.code") { value("BATCH_NOT_CONFIRMED") }
		}

		val logs = apiCallLogRepository.findAllByTenantIdAndClientIdAndPath(
			scope.tenantId,
			scope.clientId,
			"/external/v1/wos/scan-upload",
		)
		assertTrue(logs.any { it.requestId == "req-wos-phase7" && it.responseStatus == 200 })
		assertTrue(logs.any { it.responseStatus == 400 })
	}

	@Test
	fun externalApisReturnAllConfirmedBatchesForDeliveryDateWhenBatchIdIsOmitted() {
		val scope = createScope()
		seedMasters(scope.tenantId, productCode = "001234", storeCode = "000777", vehicleName = "차량1")
		seedMasters(scope.tenantId, productCode = "009999", storeCode = "000888", vehicleName = "차량2")
		seedMasters(scope.tenantId, productCode = "007777", storeCode = "000999", vehicleName = "차량3")
		val apiKey = createApiKey(scope.tenantId, scope.clientId, setOf("WOS_SCAN_READ", "PL_READ"))
		val olderBatchId = uploadValidateAndConfirm(scope, productCode = "007777", storeCode = "000999", vehicleName = "차량3")
		val firstBatchId = uploadValidateAndConfirm(scope, productCode = "001234", storeCode = "000777", vehicleName = "차량1")
		val secondBatchId = uploadValidateAndConfirm(scope, productCode = "009999", storeCode = "000888", vehicleName = "차량2")

		val olderBatch = uploadBatchRepository.findById(olderBatchId).orElseThrow()
		olderBatch.deliveryDate = LocalDate.of(2026, 5, 28)
		uploadBatchRepository.saveAndFlush(olderBatch)

		mockMvc.get("/external/v1/wos/scan-upload") {
			param("deliveryDate", "2026-05-29")
			param("size", "20")
			header("X-Api-Key", apiKey)
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(2) }
			jsonPath("$.data.items[0].batchId") { value(firstBatchId.toInt()) }
			jsonPath("$.data.items[1].batchId") { value(secondBatchId.toInt()) }
		}

		mockMvc.get("/external/v1/pl/picking-list") {
			param("deliveryDate", "2026-05-29")
			param("size", "20")
			header("X-Api-Key", apiKey)
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(2) }
			jsonPath("$.data.items[0].batchId") { value(firstBatchId.toInt()) }
			jsonPath("$.data.items[1].batchId") { value(secondBatchId.toInt()) }
		}

		mockMvc.get("/external/v1/wos/scan-upload") {
			param("size", "20")
			header("X-Api-Key", apiKey)
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(2) }
			jsonPath("$.data.items[0].batchId") { value(firstBatchId.toInt()) }
			jsonPath("$.data.items[1].batchId") { value(secondBatchId.toInt()) }
		}
	}

	@Test
	fun labelDownloadRequiresConfirmedBatchAndWritesDownloadLog() {
		val scope = createScope()
		val operatorUserId = createUser(scope, "OPERATOR")
		seedMasters(scope.tenantId, productCode = "001234", storeCode = "000777", vehicleName = "차량1")
		val confirmedBatchId = uploadValidateAndConfirm(scope)
		val uploadedOnlyBatchId = uploadWorkbook(scope, productCode = "001234", storeCode = "000777", vehicleName = "차량1")

		mockMvc.get("/api/v1/downloads/labels") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("batchId", uploadedOnlyBatchId.toString())
		}.andExpect {
			status { isUnauthorized() }
			jsonPath("$.error.code") { value("UNAUTHORIZED") }
		}

		mockMvc.get("/api/v1/downloads/labels") {
			header("X-User-Id", operatorUserId.toString())
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("batchId", uploadedOnlyBatchId.toString())
		}.andExpect {
			status { isBadRequest() }
			jsonPath("$.error.code") { value("BATCH_NOT_CONFIRMED") }
		}

		val result =
			mockMvc.get("/api/v1/downloads/labels") {
				header("X-User-Id", operatorUserId.toString())
				param("tenantId", scope.tenantId.toString())
				param("clientId", scope.clientId.toString())
				param("batchId", confirmedBatchId.toString())
				param("labelType", "EA")
				header("X-Request-Id", "req-label-download")
			}.andExpect {
				status { isOk() }
				header { exists("Content-Disposition") }
			}.andReturn()

		val content = result.response.contentAsByteArray
		assertTrue(content.size > 100)
		assertEquals('P'.code.toByte(), content[0])
		assertEquals('K'.code.toByte(), content[1])
		XSSFWorkbook(ByteArrayInputStream(content)).use { workbook ->
			assertEquals("_metadata", workbook.getSheetName(0))
			assertEquals("Label_EA", workbook.getSheetName(1))
			assertEquals(2, workbook.numberOfSheets)
			assertEquals("주문번호", workbook.getSheet("Label_EA").getRow(0).getCell(0).stringCellValue)
			assertEquals("브랜드", workbook.getSheet("Label_EA").getRow(0).getCell(3).stringCellValue)
			assertEquals("브랜드A", workbook.getSheet("Label_EA").getRow(1).getCell(3).stringCellValue)
		}

		val log = downloadLogRepository.findAllByBatchId(confirmedBatchId).single()
		assertEquals("LABEL", log.downloadType)
		assertEquals("req-label-download", log.requestId)
		assertEquals(1, log.rowCount)
		assertEquals(operatorUserId, log.downloadedBy)
		assertTrue(
			batchAuditLogRepository.findAllByBatchId(confirmedBatchId).any {
				it.action == "DOWNLOAD_REQUESTED" &&
					it.requestId == "req-label-download" &&
					it.actorId == operatorUserId
			},
		)

		val allLabelsResult =
			mockMvc.get("/api/v1/downloads/labels") {
				header("X-User-Id", operatorUserId.toString())
				param("tenantId", scope.tenantId.toString())
				param("clientId", scope.clientId.toString())
				param("batchId", confirmedBatchId.toString())
				header("X-Request-Id", "req-label-download-all")
			}.andExpect {
				status { isOk() }
			}.andReturn()
		XSSFWorkbook(ByteArrayInputStream(allLabelsResult.response.contentAsByteArray)).use { workbook ->
			assertEquals("_metadata", workbook.getSheetName(0))
			assertEquals("Label_Box", workbook.getSheetName(1))
			assertEquals("Label_EA", workbook.getSheetName(2))
			assertEquals(3, workbook.numberOfSheets)
		}

		mockMvc.get("/api/v1/downloads/${log.id}") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.downloadType") { value("LABEL") }
			jsonPath("$.data.rowCount") { value(1) }
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

	private fun createApiKey(
		tenantId: Long,
		clientId: Long?,
		scopes: Set<String>,
	): String {
		val plainKey = "phase7-${UUID.randomUUID()}"
		apiKeyRepository.saveAndFlush(
			ApiKeyEntity(
				tenantId = tenantId,
				clientId = clientId,
				name = "phase7-key",
				keyHash = ApiKeyHash.sha256Hex(plainKey),
				status = "ACTIVE",
				allowedScope = scopes.joinToString(prefix = "[", postfix = "]") { "\"$it\"" },
			),
		)
		return plainKey
	}

	private fun createUser(
		scope: TestScope,
		roleCode: String,
	): Long {
		val role = roleRepository.findByCode(roleCode) ?: roleRepository.saveAndFlush(RoleEntity(code = roleCode, name = roleCode))
		val user =
			userRepository.saveAndFlush(
				UserEntity(
					userScopeType = UserScopeType.TENANT,
					tenantId = scope.tenantId,
					loginId = "phase7-user-${UUID.randomUUID()}",
					name = "Phase7 User",
					passwordHash = "test",
				),
			)
		userRoleRepository.saveAndFlush(UserRoleEntity(UserRoleId(user.id!!, role.id!!)))
		return user.id!!
	}

	private fun uploadValidateAndConfirm(
		scope: TestScope,
		productCode: String = "001234",
		storeCode: String = "000777",
		vehicleName: String = "차량1",
	): Long {
		val batchId = uploadWorkbook(scope, productCode = productCode, storeCode = storeCode, vehicleName = vehicleName)
		mockMvc.post("/api/v1/order-excel-batches/$batchId/validate") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.status") { value("READY_TO_CONFIRM") }
		}
		mockMvc.post("/api/v1/order-excel-batches/$batchId/confirm") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.status") { value("CONFIRMED") }
		}
		return batchId
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
		listOf(
			"order_no",
			"store_code",
			"store_name",
			"brand_name",
			"product_code",
			"product_name",
			"due_date",
			"order_qty",
			"vehicle_name",
			"qr_code",
		).writeTo(sheet.createRow(0))
		listOf(
			"0000000001",
			storeCode,
			"매장",
			"브랜드A",
			productCode,
			"상품",
			"2026-05-29",
			"3",
			vehicleName,
			"PL-QR-0001",
		).writeTo(sheet.createRow(1))
	}

	private fun createLabelSheet(workbook: XSSFWorkbook, productCode: String, storeCode: String) {
		val sheet = workbook.createSheet("Label_EA")
		listOf(
			"order_no",
			"store_code",
			"store_name",
			"brand_name",
			"product_code",
			"product_name",
			"order_qty",
			"matching_code",
			"qr_code",
		).writeTo(sheet.createRow(0))
		listOf("0000000001", storeCode, "매장", "브랜드A", productCode, "상품", "3", "MATCH-0001", "LABEL-QR-0001")
			.writeTo(sheet.createRow(1))

		val boxSheet = workbook.createSheet("Label_Box")
		listOf(
			"order_no",
			"store_code",
			"store_name",
			"brand_name",
			"product_code",
			"product_name",
			"order_qty",
			"box_sequence",
			"total_box_qty",
			"matching_code",
			"qr_code",
		).writeTo(boxSheet.createRow(0))
		listOf("0000000001", storeCode, "매장", "브랜드A", productCode, "상품", "1", "1", "1", "MATCH-BOX-0001", "LABEL-BOX-QR-0001")
			.writeTo(boxSheet.createRow(1))
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
		val mysql: Phase7MySqlContainer = Phase7MySqlContainer("mysql:8.4")
			.withDatabaseName("oms")
			.withUsername("oms")
			.withPassword("change-me")

		@JvmStatic
		private val storageRoot = Files.createTempDirectory("oms-phase7-test").toString()

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

class Phase7MySqlContainer(imageName: String) : MySQLContainer<Phase7MySqlContainer>(imageName)
