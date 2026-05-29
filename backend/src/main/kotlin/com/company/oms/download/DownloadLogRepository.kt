package com.company.oms.download

import org.springframework.data.jpa.repository.JpaRepository

interface DownloadLogRepository : JpaRepository<DownloadLogEntity, Long> {
	fun findAllByBatchId(batchId: Long): List<DownloadLogEntity>

	fun findAllByTenantIdAndClientIdAndDownloadType(
		tenantId: Long,
		clientId: Long,
		downloadType: String,
	): List<DownloadLogEntity>
}

