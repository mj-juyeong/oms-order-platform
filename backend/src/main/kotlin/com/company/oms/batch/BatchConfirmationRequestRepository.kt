package com.company.oms.batch

import com.company.oms.common.persistence.BatchConfirmationRequestStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor

interface BatchConfirmationRequestRepository :
	JpaRepository<BatchConfirmationRequestEntity, Long>,
	JpaSpecificationExecutor<BatchConfirmationRequestEntity> {
	fun existsByBatchIdAndStatusIn(
		batchId: Long,
		statuses: Collection<BatchConfirmationRequestStatus>,
	): Boolean

	fun findFirstByBatchIdOrderByRequestedAtDesc(batchId: Long): BatchConfirmationRequestEntity?

	fun findFirstByBatchIdAndStatusOrderByReviewedAtDesc(
		batchId: Long,
		status: BatchConfirmationRequestStatus,
	): BatchConfirmationRequestEntity?

	fun countByTenantIdAndStatus(
		tenantId: Long,
		status: BatchConfirmationRequestStatus,
	): Long

	fun countByTenantIdAndClientIdAndStatus(
		tenantId: Long,
		clientId: Long,
		status: BatchConfirmationRequestStatus,
	): Long
}
