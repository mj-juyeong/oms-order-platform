package com.company.oms.batch

import com.company.oms.common.persistence.BatchStatus
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate

interface UploadBatchRepository : JpaRepository<UploadBatchEntity, Long>, JpaSpecificationExecutor<UploadBatchEntity> {
	fun findAllByTenantIdAndClientId(
		tenantId: Long,
		clientId: Long,
	): List<UploadBatchEntity>

	fun findByTenantIdAndClientIdAndBatchNo(
		tenantId: Long,
		clientId: Long,
		batchNo: String,
	): UploadBatchEntity?

	fun findAllByParentBatchId(parentBatchId: Long): List<UploadBatchEntity>

	fun findAllByTenantIdAndClientIdAndStatus(
		tenantId: Long,
		clientId: Long,
		status: BatchStatus,
	): List<UploadBatchEntity>

	fun findAllByTenantIdAndStatus(
		tenantId: Long,
		status: BatchStatus,
	): List<UploadBatchEntity>

	fun findAllByTenantIdAndClientIdAndDeliveryDate(
		tenantId: Long,
		clientId: Long,
		deliveryDate: LocalDate,
	): List<UploadBatchEntity>

	fun countByTenantIdAndStatus(
		tenantId: Long,
		status: BatchStatus,
	): Long

	fun countByTenantIdAndClientIdAndStatus(
		tenantId: Long,
		clientId: Long,
		status: BatchStatus,
	): Long

	fun countByTenantIdAndStatusNotIn(
		tenantId: Long,
		statuses: Collection<BatchStatus>,
	): Long

	fun countByTenantIdAndClientIdAndStatusNotIn(
		tenantId: Long,
		clientId: Long,
		statuses: Collection<BatchStatus>,
	): Long
}
