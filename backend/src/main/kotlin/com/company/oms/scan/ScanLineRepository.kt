package com.company.oms.scan

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.time.LocalDate

interface ScanLineRepository : JpaRepository<ScanLineEntity, Long>, JpaSpecificationExecutor<ScanLineEntity> {
	fun findAllByTenantIdAndClientIdAndBatchId(
		tenantId: Long,
		clientId: Long,
		batchId: Long,
	): List<ScanLineEntity>

	fun findAllByTenantIdAndClientIdAndDeliveryDateAndScanCenter(
		tenantId: Long,
		clientId: Long,
		deliveryDate: LocalDate,
		scanCenter: String,
	): List<ScanLineEntity>

	fun findAllByTenantIdAndClientIdAndBarcode(
		tenantId: Long,
		clientId: Long,
		barcode: String,
	): List<ScanLineEntity>
}
