package com.company.oms.excel

import com.company.oms.common.persistence.SheetType
import org.springframework.data.jpa.repository.JpaRepository

interface ExcelSheetResultRepository : JpaRepository<ExcelSheetResultEntity, Long> {
	fun findAllByBatchId(batchId: Long): List<ExcelSheetResultEntity>

	fun findAllByTenantIdAndClientIdAndBatchIdAndSheetType(
		tenantId: Long,
		clientId: Long,
		batchId: Long,
		sheetType: SheetType,
	): List<ExcelSheetResultEntity>
}

