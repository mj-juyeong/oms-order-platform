package com.company.oms

import com.company.oms.audit.BatchAuditLogEntity
import com.company.oms.audit.BatchAuditLogRepository
import com.company.oms.auth.ApiKeyEntity
import com.company.oms.auth.ApiKeyHash
import com.company.oms.auth.ApiKeyRepository
import com.company.oms.batch.UploadBatchEntity
import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.PlType
import com.company.oms.auth.RoleEntity
import com.company.oms.auth.RoleRepository
import com.company.oms.auth.UserEntity
import com.company.oms.auth.UserRepository
import com.company.oms.auth.UserRoleEntity
import com.company.oms.auth.UserRoleId
import com.company.oms.auth.UserRoleRepository
import com.company.oms.common.persistence.UserScopeType
import com.company.oms.common.scope.ClientEntity
import com.company.oms.common.scope.ClientRepository
import com.company.oms.common.scope.TenantEntity
import com.company.oms.common.scope.TenantRepository
import com.company.oms.download.DownloadLogEntity
import com.company.oms.download.DownloadLogRepository
import com.company.oms.externalapi.ApiCallLogEntity
import com.company.oms.externalapi.ApiCallLogRepository
import com.company.oms.pl.PlLineEntity
import com.company.oms.pl.PlLineRepository
import com.company.oms.scan.ScanLineEntity
import com.company.oms.scan.ScanLineRepository
import org.flywaydb.core.Flyway
import org.junit.jupiter.api.Assertions.assertNotNull
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
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.testcontainers.containers.MySQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.math.BigDecimal
import java.nio.file.Files
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@Testcontainers
@EnabledIfSystemProperty(named = "oms.test.db", matches = "true")
class Phase8AuthLogApiTest @Autowired constructor(
	private val mockMvc: MockMvc,
	private val tenantRepository: TenantRepository,
	private val clientRepository: ClientRepository,
	private val userRepository: UserRepository,
	private val roleRepository: RoleRepository,
	private val userRoleRepository: UserRoleRepository,
	private val apiKeyRepository: ApiKeyRepository,
	private val uploadBatchRepository: UploadBatchRepository,
	private val scanLineRepository: ScanLineRepository,
	private val plLineRepository: PlLineRepository,
	private val batchAuditLogRepository: BatchAuditLogRepository,
	private val apiCallLogRepository: ApiCallLogRepository,
	private val downloadLogRepository: DownloadLogRepository,
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
	fun authMeAndUserManagementRequireAdminRole() {
		val scope = createScope()
		val adminUserId = createUser(scope, "ADMIN")
		createUser(scope, "VIEWER")

		mockMvc.get("/api/v1/auth/me")
			.andExpect {
				status { isUnauthorized() }
				jsonPath("$.error.code") { value("UNAUTHORIZED") }
			}

		mockMvc.get("/api/v1/auth/me") {
			header("X-User-Id", adminUserId.toString())
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.id") { value(adminUserId.toInt()) }
			jsonPath("$.data.userScopeType") { value("TENANT") }
			jsonPath("$.data.roles[0]") { value("ADMIN") }
		}

		mockMvc.get("/api/v1/users")
			.andExpect {
				status { isUnauthorized() }
				jsonPath("$.error.code") { value("UNAUTHORIZED") }
			}

		mockMvc.post("/api/v1/users") {
			header("X-User-Id", adminUserId.toString())
			contentType = org.springframework.http.MediaType.APPLICATION_JSON
			content = """
				{
				  "loginId": "ops-${UUID.randomUUID()}",
				  "name": "운영자",
				  "userScopeType": "TENANT",
				  "tenantId": ${scope.tenantId},
				  "clientId": null,
				  "password": "secret",
				  "roleCodes": ["OPERATOR"]
				}
			""".trimIndent()
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.id") { exists() }
			jsonPath("$.data.updated") { value(false) }
		}

		mockMvc.get("/api/v1/users") {
			header("X-User-Id", adminUserId.toString())
			param("tenantId", scope.tenantId.toString())
			param("status", "ACTIVE")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(3) }
		}
	}

	@Test
	fun apiKeyManagementReturnsPlainKeyOnceAndExternalApiRequiresIt() {
		val scope = createScope()
		val adminUserId = createUser(scope, "ADMIN")

		mockMvc.post("/api/v1/api-keys") {
			contentType = org.springframework.http.MediaType.APPLICATION_JSON
			content = """{"tenantId":${scope.tenantId},"clientId":${scope.clientId},"name":"WOS","allowedScope":["WOS_SCAN_READ"],"expiresAt":"2099-01-01T00:00:00"}"""
		}.andExpect {
			status { isUnauthorized() }
			jsonPath("$.error.code") { value("UNAUTHORIZED") }
		}

		val result =
			mockMvc.post("/api/v1/api-keys") {
				header("X-User-Id", adminUserId.toString())
				contentType = org.springframework.http.MediaType.APPLICATION_JSON
				content = """{"tenantId":${scope.tenantId},"clientId":${scope.clientId},"name":"WOS","allowedScope":["WOS_SCAN_READ"],"expiresAt":"2099-01-01T00:00:00"}"""
			}.andExpect {
				status { isOk() }
				jsonPath("$.data.id") { exists() }
				jsonPath("$.data.apiKey") { exists() }
				jsonPath("$.data.status") { value("ACTIVE") }
			}.andReturn()

		val apiKeyId = apiKeyRepository.findAllByTenantId(scope.tenantId).single().id!!
		assertNotNull(apiKeyRepository.findById(apiKeyId).orElse(null)?.keyHash)

		mockMvc.get("/api/v1/api-keys") {
			header("X-User-Id", adminUserId.toString())
			param("tenantId", scope.tenantId.toString())
			param("status", "ACTIVE")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(1) }
			jsonPath("$.data.items[0].allowedScope[0]") { value("WOS_SCAN_READ") }
		}

		mockMvc.get("/external/v1/wos/scan-upload") {
		}.andExpect {
			status { isUnauthorized() }
			jsonPath("$.error.code") { value("INVALID_API_KEY") }
		}

		val plainApiKey = Regex(""""apiKey":"([^"]+)"""").find(result.response.contentAsString)!!.groupValues[1]
		mockMvc.get("/external/v1/wos/scan-upload") {
			header("X-Api-Key", plainApiKey)
		}.andExpect {
			status { isNotFound() }
			jsonPath("$.error.code") { value("NO_CONFIRMED_BATCH") }
		}

		mockMvc.post("/api/v1/api-keys/$apiKeyId/revoke") {
			header("X-User-Id", adminUserId.toString())
			contentType = org.springframework.http.MediaType.APPLICATION_JSON
			content = """{"reason":"rotation"}"""
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.status") { value("REVOKED") }
		}
	}

	@Test
	fun externalApiStatusSummarizesProvidableBatchesKeysAndLastCalls() {
		val scope = createScope()
		val viewerUserId = createUser(scope, "VIEWER")
		val confirmedBatch = createBatch(scope, BatchStatus.CONFIRMED, "BATCH-CONFIRMED")
		val uploadedBatch = createBatch(scope, BatchStatus.UPLOADED, "BATCH-UPLOADED")
		createScanLine(scope, confirmedBatch.id!!)
		createPlLine(scope, confirmedBatch.id!!)
		apiKeyRepository.saveAndFlush(
			ApiKeyEntity(
				tenantId = scope.tenantId,
				clientId = scope.clientId,
				name = "WOS/PL",
				keyHash = ApiKeyHash.sha256Hex("external-status-key"),
				status = "ACTIVE",
				allowedScope = """["WOS_SCAN_READ","PL_READ"]""",
				expiresAt = LocalDateTime.now().plusDays(1),
			),
		)
		apiCallLogRepository.saveAndFlush(
			ApiCallLogEntity(
				tenantId = scope.tenantId,
				clientId = scope.clientId,
				apiKeyId = apiKeyRepository.findAllByTenantId(scope.tenantId).single().id,
				requestId = "req-status-wos",
				path = "/external/v1/wos/scan-upload",
				method = "GET",
				queryString = "batchId=${confirmedBatch.id}",
				responseStatus = 200,
				responseTimeMs = 18,
				clientIp = "127.0.0.1",
			),
		)

		mockMvc.get("/api/v1/external-api/status") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
		}.andExpect {
			status { isUnauthorized() }
			jsonPath("$.error.code") { value("UNAUTHORIZED") }
		}

		mockMvc.get("/api/v1/external-api/status") {
			header("X-User-Id", viewerUserId.toString())
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("channel", "WOS_SCAN")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(2) }
			jsonPath("$.data.items[0].channel") { value("WOS_SCAN") }
			jsonPath("$.data.items[0].batchId") { value(confirmedBatch.id!!.toInt()) }
			jsonPath("$.data.items[0].providable") { value(true) }
			jsonPath("$.data.items[0].providedRowCount") { value(1) }
			jsonPath("$.data.items[0].hasActiveApiKey") { value(true) }
			jsonPath("$.data.items[0].lastRequestId") { value("req-status-wos") }
			jsonPath("$.data.items[1].batchId") { value(uploadedBatch.id!!.toInt()) }
			jsonPath("$.data.items[1].providable") { value(false) }
			jsonPath("$.data.items[1].excludedReasonCode") { value("BATCH_NOT_CONFIRMED") }
		}

		mockMvc.get("/api/v1/external-api/status") {
			header("X-User-Id", viewerUserId.toString())
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("channel", "PL")
			param("status", "CONFIRMED")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.totalElements") { value(1) }
			jsonPath("$.data.items[0].channel") { value("PL") }
			jsonPath("$.data.items[0].providedRowCount") { value(1) }
			jsonPath("$.data.items[0].plEaCount") { value(1) }
			jsonPath("$.data.items[0].totalOrderQty") { value(5.0) }
		}
	}

	@Test
	fun auditLogQueriesRequireAdminAndReturnTrackedRows() {
		val scope = createScope()
		val adminUserId = createUser(scope, "ADMIN")
		batchAuditLogRepository.saveAndFlush(
			BatchAuditLogEntity(
				tenantId = scope.tenantId,
				clientId = scope.clientId,
				batchId = null,
				action = "CONFIRMED",
				requestId = "req-audit-batch",
			),
		)
		apiCallLogRepository.saveAndFlush(
			ApiCallLogEntity(
				tenantId = scope.tenantId,
				clientId = scope.clientId,
				requestId = "req-api-call",
				path = "/external/v1/wos/scan-upload",
				method = "GET",
				responseStatus = 200,
			),
		)
		downloadLogRepository.saveAndFlush(
			DownloadLogEntity(
				tenantId = scope.tenantId,
				clientId = scope.clientId,
				batchId = null,
				downloadType = "LABEL",
				fileName = "labels.xlsx",
				rowCount = 1,
				requestId = "req-download",
				downloadedAt = LocalDateTime.now(),
			),
		)

		mockMvc.get("/api/v1/audit/batches") {
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
		}.andExpect {
			status { isUnauthorized() }
		}

		mockMvc.get("/api/v1/audit/batches") {
			header("X-User-Id", adminUserId.toString())
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("action", "CONFIRMED")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.items[0].requestId") { value("req-audit-batch") }
		}

		mockMvc.get("/api/v1/audit/api-calls") {
			header("X-User-Id", adminUserId.toString())
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("responseStatus", "200")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.items[0].requestId") { value("req-api-call") }
		}

		mockMvc.get("/api/v1/audit/downloads") {
			header("X-User-Id", adminUserId.toString())
			param("tenantId", scope.tenantId.toString())
			param("clientId", scope.clientId.toString())
			param("downloadType", "LABEL")
		}.andExpect {
			status { isOk() }
			jsonPath("$.data.items[0].requestId") { value("req-download") }
		}
	}

	private fun createBatch(
		scope: TestScope,
		status: BatchStatus,
		batchNo: String,
	): UploadBatchEntity =
		uploadBatchRepository.saveAndFlush(
			UploadBatchEntity(
				tenantId = scope.tenantId,
				clientId = scope.clientId,
				batchNo = "$batchNo-${UUID.randomUUID()}",
				status = status,
				deliveryDate = LocalDate.parse("2026-05-29"),
				uploadedAt = LocalDateTime.now(),
				confirmedAt = if (status == BatchStatus.CONFIRMED) LocalDateTime.now() else null,
			),
		)

	private fun createScanLine(
		scope: TestScope,
		batchId: Long,
	) {
		scanLineRepository.saveAndFlush(
			ScanLineEntity(
				tenantId = scope.tenantId,
				clientId = scope.clientId,
				batchId = batchId,
				sheetName = "Scan_upload_장지",
				scanCenter = "장지",
				deliveryDate = LocalDate.parse("2026-05-29"),
				barcode = "0000123456789",
				orderBusinessSiteCode = "000777",
				storeName = "매장",
				productCode = "001234",
				productName = "상품",
				labelQty = BigDecimal.ONE,
				unit = "EA",
				rowNo = 2,
			),
		)
	}

	private fun createPlLine(
		scope: TestScope,
		batchId: Long,
	) {
		plLineRepository.saveAndFlush(
			PlLineEntity(
				tenantId = scope.tenantId,
				clientId = scope.clientId,
				batchId = batchId,
				sheetName = "PL_EA",
				plType = PlType.EA,
				orderNo = "0000000001",
				storeCode = "000777",
				storeName = "매장",
				productCode = "001234",
				productName = "상품",
				unit = "EA",
				dueDate = LocalDate.parse("2026-05-29"),
				orderQty = BigDecimal("5.0"),
				vehicleName = "차량1",
				qrCode = "PL-QR-0001",
				rowNo = 2,
			),
		)
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
					loginId = "user-${UUID.randomUUID()}",
					name = "User",
					passwordHash = "test",
				),
			)
		userRoleRepository.saveAndFlush(UserRoleEntity(UserRoleId(user.id!!, role.id!!)))
		return user.id!!
	}

	data class TestScope(
		val tenantId: Long,
		val clientId: Long,
	)

	companion object {
		@Container
		@JvmStatic
		val mysql: Phase8MySqlContainer = Phase8MySqlContainer("mysql:8.4")
			.withDatabaseName("oms")
			.withUsername("oms")
			.withPassword("change-me")

		@JvmStatic
		private val storageRoot = Files.createTempDirectory("oms-phase8-test").toString()

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

class Phase8MySqlContainer(imageName: String) : MySQLContainer<Phase8MySqlContainer>(imageName)
