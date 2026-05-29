package com.company.oms

import com.company.oms.audit.BatchAuditLogEntity
import com.company.oms.audit.BatchAuditLogRepository
import com.company.oms.auth.ApiKeyEntity
import com.company.oms.auth.ApiKeyRepository
import com.company.oms.auth.RoleEntity
import com.company.oms.auth.RoleRepository
import com.company.oms.auth.UserEntity
import com.company.oms.auth.UserRepository
import com.company.oms.auth.UserRoleEntity
import com.company.oms.auth.UserRoleId
import com.company.oms.auth.UserRoleRepository
import com.company.oms.batch.UploadBatchEntity
import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.LabelType
import com.company.oms.common.persistence.MasterType
import com.company.oms.common.persistence.MasterUploadStatus
import com.company.oms.common.persistence.PlType
import com.company.oms.common.persistence.SheetType
import com.company.oms.common.persistence.UploadDomain
import com.company.oms.common.persistence.UserScopeType
import com.company.oms.common.persistence.ValidationSeverity
import com.company.oms.common.scope.ClientEntity
import com.company.oms.common.scope.ClientRepository
import com.company.oms.common.scope.TenantEntity
import com.company.oms.common.scope.TenantRepository
import com.company.oms.download.DownloadLogEntity
import com.company.oms.download.DownloadLogRepository
import com.company.oms.excel.ExcelSheetResultEntity
import com.company.oms.excel.ExcelSheetResultRepository
import com.company.oms.externalapi.ApiCallLogEntity
import com.company.oms.externalapi.ApiCallLogRepository
import com.company.oms.label.LabelLineEntity
import com.company.oms.label.LabelLineRepository
import com.company.oms.master.MasterUploadBatchEntity
import com.company.oms.master.MasterUploadBatchRepository
import com.company.oms.master.ProductMasterItemEntity
import com.company.oms.master.ProductMasterItemRepository
import com.company.oms.master.StoreRouteMasterItemEntity
import com.company.oms.master.StoreRouteMasterItemRepository
import com.company.oms.order.OrderLineEntity
import com.company.oms.order.OrderLineRepository
import com.company.oms.pl.PlLineEntity
import com.company.oms.pl.PlLineRepository
import com.company.oms.scan.ScanLineEntity
import com.company.oms.scan.ScanLineRepository
import com.company.oms.upload.UploadedFileEntity
import com.company.oms.upload.UploadedFileRepository
import com.company.oms.validation.ValidationErrorEntity
import com.company.oms.validation.ValidationErrorRepository
import org.flywaydb.core.Flyway
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfSystemProperty
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.MySQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

@SpringBootTest
@ActiveProfiles("local")
@Testcontainers
@EnabledIfSystemProperty(named = "oms.test.db", matches = "true")
class PersistenceMappingSmokeTest @Autowired constructor(
	private val tenantRepository: TenantRepository,
	private val clientRepository: ClientRepository,
	private val userRepository: UserRepository,
	private val roleRepository: RoleRepository,
	private val userRoleRepository: UserRoleRepository,
	private val apiKeyRepository: ApiKeyRepository,
	private val masterUploadBatchRepository: MasterUploadBatchRepository,
	private val productMasterItemRepository: ProductMasterItemRepository,
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
	private val uploadBatchRepository: UploadBatchRepository,
	private val uploadedFileRepository: UploadedFileRepository,
	private val excelSheetResultRepository: ExcelSheetResultRepository,
	private val scanLineRepository: ScanLineRepository,
	private val plLineRepository: PlLineRepository,
	private val labelLineRepository: LabelLineRepository,
	private val orderLineRepository: OrderLineRepository,
	private val validationErrorRepository: ValidationErrorRepository,
	private val batchAuditLogRepository: BatchAuditLogRepository,
	private val apiCallLogRepository: ApiCallLogRepository,
	private val downloadLogRepository: DownloadLogRepository,
) {

	@Test
	fun entitiesCanPersistAgainstInitialSchema() {
		Flyway.configure()
			.dataSource(mysql.jdbcUrl, mysql.username, mysql.password)
			.locations("classpath:db/migration")
			.load()
			.migrate()

		val tenant = tenantRepository.saveAndFlush(
			TenantEntity(
				code = "tenant-a",
				name = "Tenant A",
			),
		)
		val tenantId = tenant.id!!

		val client = clientRepository.saveAndFlush(
			ClientEntity(
				tenantId = tenantId,
				code = "client-a",
				name = "Client A",
			),
		)
		val clientId = client.id!!

		val user = userRepository.saveAndFlush(
			UserEntity(
				userScopeType = UserScopeType.TENANT,
				tenantId = tenantId,
				loginId = "operator-a",
				name = "Operator A",
				passwordHash = "hash",
			),
		)
		val userId = user.id!!

		val role = roleRepository.saveAndFlush(
			RoleEntity(
				code = "OPERATOR",
				name = "Operator",
			),
		)
		userRoleRepository.saveAndFlush(UserRoleEntity(UserRoleId(userId = userId, roleId = role.id!!)))

		apiKeyRepository.saveAndFlush(
			ApiKeyEntity(
				tenantId = tenantId,
				clientId = clientId,
				name = "WOS",
				keyHash = "hashed-api-key",
				allowedScope = """{"domains":["SCAN"]}""",
				createdBy = userId,
			),
		)

		val masterUpload = masterUploadBatchRepository.saveAndFlush(
			MasterUploadBatchEntity(
				tenantId = tenantId,
				masterType = MasterType.PRODUCT,
				status = MasterUploadStatus.APPLIED,
				originalFileName = "product.csv",
				rowCount = 1,
				insertedCount = 1,
				uploadedBy = userId,
				appliedAt = LocalDateTime.now(),
				requestId = "req-persist-master",
			),
		)

		productMasterItemRepository.saveAndFlush(
			ProductMasterItemEntity(
				tenantId = tenantId,
				ezadminCode = "001234",
				productName = "상품 A",
				boxQty = BigDecimal("12.000"),
				lastMasterUploadBatchId = masterUpload.id,
				rawRowJson = """{"ezadmin_code":"001234"}""",
			),
		)
		storeRouteMasterItemRepository.saveAndFlush(
			StoreRouteMasterItemEntity(
				tenantId = tenantId,
				baljugoCode = "000777",
				storeName = "매장 A",
				vehicleName = "차량 A",
				rawRowJson = """{"baljugo_code":"000777"}""",
			),
		)

		val batch = uploadBatchRepository.saveAndFlush(
			UploadBatchEntity(
				tenantId = tenantId,
				clientId = clientId,
				batchNo = "BATCH-001",
				status = BatchStatus.UPLOADED,
				deliveryDate = LocalDate.of(2026, 5, 28),
				uploadedBy = userId,
			),
		)
		val batchId = batch.id!!

		uploadedFileRepository.saveAndFlush(
			UploadedFileEntity(
				tenantId = tenantId,
				clientId = clientId,
				batchId = batchId,
				fileType = "ORDER_EXCEL",
				originalFileName = "ois.xlsx",
				storedPath = "uploads/ois.xlsx",
				fileHash = "file-hash",
				fileSize = 1024,
				createdBy = userId,
			),
		)
		excelSheetResultRepository.saveAndFlush(
			ExcelSheetResultEntity(
				tenantId = tenantId,
				clientId = clientId,
				batchId = batchId,
				sheetName = "Scan_upload_군량리",
				sheetType = SheetType.SCAN_UPLOAD,
				suffixValue = "군량리",
				headerRowNo = 1,
				dataRowCount = 0,
				status = "PARSED",
			),
		)

		scanLineRepository.saveAndFlush(
			ScanLineEntity(
				tenantId = tenantId,
				clientId = clientId,
				batchId = batchId,
				sheetName = "Scan_upload_장지",
				scanCenter = "장지",
				barcode = "0000123456789",
				orderBusinessSiteCode = "000777",
				productCode = "001234",
				rowNo = 2,
				rawRowJson = """{"barcode":"0000123456789"}""",
			),
		)
		val plLine = plLineRepository.saveAndFlush(
			PlLineEntity(
				tenantId = tenantId,
				clientId = clientId,
				batchId = batchId,
				sheetName = "PL_EA",
				plType = PlType.EA,
				orderNo = "0000000001",
				storeCode = "000777",
				productCode = "001234",
				orderQty = BigDecimal("3.000"),
				qrCode = "QR-0001",
				rowNo = 2,
			),
		)
		labelLineRepository.saveAndFlush(
			LabelLineEntity(
				tenantId = tenantId,
				clientId = clientId,
				batchId = batchId,
				sheetName = "Label_EA",
				labelType = LabelType.EA,
				orderNo = "0000000001",
				storeCode = "000777",
				productCode = "001234",
				matchingCode = "MATCH-0001",
				qrCode = "QR-0001",
				rowNo = 2,
			),
		)
		orderLineRepository.saveAndFlush(
			OrderLineEntity(
				tenantId = tenantId,
				clientId = clientId,
				batchId = batchId,
				sourcePlLineId = plLine.id!!,
				orderNo = "0000000001",
				storeCode = "000777",
				productCode = "001234",
				orderQty = BigDecimal("3.000"),
			),
		)

		validationErrorRepository.saveAndFlush(
			ValidationErrorEntity(
				tenantId = tenantId,
				clientId = clientId,
				batchId = batchId,
				severity = ValidationSeverity.WARNING,
				errorCode = "VEHICLE_NAME_MISMATCH",
				domain = UploadDomain.PL,
				sheetName = "PL_EA",
				rowNo = 2,
				message = "차량명 확인 필요",
				originalValue = "차량 A",
			),
		)
		batchAuditLogRepository.saveAndFlush(
			BatchAuditLogEntity(
				tenantId = tenantId,
				clientId = clientId,
				batchId = batchId,
				action = "BATCH_CREATED",
				afterStatus = BatchStatus.UPLOADED,
				actorId = userId,
				requestId = "req-persist-audit",
			),
		)
		apiCallLogRepository.saveAndFlush(
			ApiCallLogEntity(
				tenantId = tenantId,
				clientId = clientId,
				requestId = "req-persist-api",
				path = "/external/v1/scan",
				method = "GET",
				responseStatus = 200,
			),
		)
		downloadLogRepository.saveAndFlush(
			DownloadLogEntity(
				tenantId = tenantId,
				clientId = clientId,
				batchId = batchId,
				downloadType = "LABEL",
				fileName = "label.xlsx",
				downloadedBy = userId,
				requestId = "req-persist-download",
			),
		)

		assertNotNull(tenantRepository.findByCode("tenant-a"))
		assertEquals("상품 A", productMasterItemRepository.findByTenantIdAndEzadminCode(tenantId, "001234")?.productName)
		assertEquals("매장 A", storeRouteMasterItemRepository.findByTenantIdAndBaljugoCode(tenantId, "000777")?.storeName)
		assertEquals(0, excelSheetResultRepository.findAllByBatchId(batchId).first().dataRowCount)
		assertFalse(validationErrorRepository.existsByBatchIdAndSeverityAndResolvedYn(batchId, ValidationSeverity.ERROR, false))
		assertEquals("0000000001", orderLineRepository.findBySourcePlLineId(plLine.id!!)?.orderNo)
	}

	companion object {
		@Container
		@JvmStatic
		val mysql: PersistenceMySqlContainer = PersistenceMySqlContainer("mysql:8.4")
			.withDatabaseName("oms")
			.withUsername("oms")
			.withPassword("change-me")

		@JvmStatic
		@DynamicPropertySource
		fun datasourceProperties(registry: DynamicPropertyRegistry) {
			registry.add("spring.datasource.url", mysql::getJdbcUrl)
			registry.add("spring.datasource.username", mysql::getUsername)
			registry.add("spring.datasource.password", mysql::getPassword)
			registry.add("spring.datasource.driver-class-name") { "com.mysql.cj.jdbc.Driver" }
			registry.add("spring.jpa.hibernate.ddl-auto") { "none" }
			registry.add("spring.flyway.enabled") { "true" }
		}
	}
}

class PersistenceMySqlContainer(imageName: String) : MySQLContainer<PersistenceMySqlContainer>(imageName)
