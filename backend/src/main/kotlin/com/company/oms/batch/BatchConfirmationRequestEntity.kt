package com.company.oms.batch

import com.company.oms.common.persistence.BaseTimeEntity
import com.company.oms.common.persistence.BatchConfirmationRequestStatus
import com.company.oms.common.persistence.BatchSupplementRequestType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "batch_confirmation_requests")
class BatchConfirmationRequestEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "batch_id", nullable = false)
	var batchId: Long = 0,

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 32)
	var status: BatchConfirmationRequestStatus = BatchConfirmationRequestStatus.REQUESTED,

	@Column(name = "requested_by")
	var requestedBy: Long? = null,

	@Column(name = "requested_at", nullable = false)
	var requestedAt: LocalDateTime = LocalDateTime.now(),

	@Column(name = "request_memo", length = 1000)
	var requestMemo: String? = null,

	@Column(name = "reviewed_by")
	var reviewedBy: Long? = null,

	@Column(name = "reviewed_at")
	var reviewedAt: LocalDateTime? = null,

	@Column(name = "review_comment", length = 1000)
	var reviewComment: String? = null,

	@Enumerated(EnumType.STRING)
	@Column(name = "supplement_type", length = 32)
	var supplementType: BatchSupplementRequestType? = null,
) : BaseTimeEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}
