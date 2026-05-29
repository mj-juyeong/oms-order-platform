package com.company.oms.validation

import com.company.oms.common.persistence.UploadDomain
import com.company.oms.common.persistence.ValidationSeverity
import org.springframework.data.jpa.repository.JpaRepository

interface ValidationErrorRepository : JpaRepository<ValidationErrorEntity, Long> {
	fun findAllByBatchId(batchId: Long): List<ValidationErrorEntity>

	fun deleteAllByBatchId(batchId: Long)

	fun findAllByBatchIdAndSeverity(batchId: Long, severity: ValidationSeverity): List<ValidationErrorEntity>

	fun findAllByBatchIdAndDomain(batchId: Long, domain: UploadDomain): List<ValidationErrorEntity>

	fun existsByBatchIdAndSeverityAndResolvedYn(
		batchId: Long,
		severity: ValidationSeverity,
		resolvedYn: Boolean,
	): Boolean
}
