package com.company.oms.master

import com.company.oms.common.persistence.MasterType
import com.company.oms.common.persistence.MasterUploadStatus
import org.springframework.data.jpa.repository.JpaRepository

interface MasterUploadBatchRepository : JpaRepository<MasterUploadBatchEntity, Long> {
	fun findAllByTenantIdAndMasterType(
		tenantId: Long,
		masterType: MasterType,
	): List<MasterUploadBatchEntity>

	fun findAllByTenantIdAndMasterTypeOrderByUploadedAtDesc(
		tenantId: Long,
		masterType: MasterType,
	): List<MasterUploadBatchEntity>

	fun findAllByTenantIdAndMasterTypeAndStatus(
		tenantId: Long,
		masterType: MasterType,
		status: MasterUploadStatus,
	): List<MasterUploadBatchEntity>
}
