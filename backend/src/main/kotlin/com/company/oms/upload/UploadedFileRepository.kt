package com.company.oms.upload

import org.springframework.data.jpa.repository.JpaRepository

interface UploadedFileRepository : JpaRepository<UploadedFileEntity, Long> {
	fun findAllByBatchId(batchId: Long): List<UploadedFileEntity>

	fun findAllByTenantIdAndClientIdAndOriginalFileNameContaining(
		tenantId: Long,
		clientId: Long,
		originalFileName: String,
	): List<UploadedFileEntity>
}

