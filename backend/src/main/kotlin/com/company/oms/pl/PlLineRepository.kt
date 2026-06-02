package com.company.oms.pl

import com.company.oms.common.persistence.PlType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.time.LocalDate

interface PlLineRepository : JpaRepository<PlLineEntity, Long>, JpaSpecificationExecutor<PlLineEntity> {
	fun findAllByTenantIdAndClientIdAndBatchId(
		tenantId: Long,
		clientId: Long,
		batchId: Long,
	): List<PlLineEntity>

	fun findAllByTenantIdAndClientIdAndDueDateAndPlType(
		tenantId: Long,
		clientId: Long,
		dueDate: LocalDate,
		plType: PlType,
	): List<PlLineEntity>

	fun findAllByTenantIdAndClientIdAndOrderNo(
		tenantId: Long,
		clientId: Long,
		orderNo: String,
	): List<PlLineEntity>
}
