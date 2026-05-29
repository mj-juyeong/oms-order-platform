package com.company.oms.audit

import org.springframework.data.jpa.repository.JpaRepository

interface BatchAuditLogRepository : JpaRepository<BatchAuditLogEntity, Long> {
	fun findAllByBatchId(batchId: Long): List<BatchAuditLogEntity>

	fun findAllByTenantIdAndClientIdAndAction(
		tenantId: Long,
		clientId: Long,
		action: String,
	): List<BatchAuditLogEntity>
}

