package com.company.oms.scan

import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate

interface ScanLineRepository : JpaRepository<ScanLineEntity, Long> {
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

