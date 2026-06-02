package com.company.oms.batch

import com.company.oms.common.persistence.BatchConfirmationRequestStatus
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.BatchSupplementRequestType
import java.time.LocalDate
import java.time.LocalDateTime

data class BatchConfirmationRequestCreateRequest(
	val memo: String? = null,
	val actorId: Long? = null,
)

data class BatchConfirmationReviewRequest(
	val comment: String? = null,
	val supplementType: BatchSupplementRequestType? = null,
	val actorId: Long? = null,
)

data class BatchConfirmationRequestResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val batchId: Long,
	val batchNo: String,
	val batchStatus: BatchStatus,
	val deliveryDate: LocalDate?,
	val errorCount: Int,
	val warningCount: Int,
	val infoCount: Int,
	val status: BatchConfirmationRequestStatus,
	val requestedBy: Long?,
	val requestedAt: LocalDateTime,
	val requestMemo: String?,
	val reviewedBy: Long?,
	val reviewedAt: LocalDateTime?,
	val reviewComment: String?,
	val supplementType: BatchSupplementRequestType?,
)
