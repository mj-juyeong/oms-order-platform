package com.company.oms.batch

import com.company.oms.common.persistence.BatchStatus
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDate
import java.time.LocalDateTime

@Entity
@Table(name = "upload_batches")
class UploadBatchEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "batch_no", nullable = false, length = 64)
	var batchNo: String = "",

	@Column(name = "parent_batch_id")
	var parentBatchId: Long? = null,

	@Column(name = "revision_no", nullable = false)
	var revisionNo: Int = 1,

	@Column(name = "reupload_reason", length = 1000)
	var reuploadReason: String? = null,

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 32)
	var status: BatchStatus = BatchStatus.UPLOADED,

	@Column(name = "delivery_date")
	var deliveryDate: LocalDate? = null,

	@Column(name = "product_master_checked_at")
	var productMasterCheckedAt: LocalDateTime? = null,

	@Column(name = "store_route_master_checked_at")
	var storeRouteMasterCheckedAt: LocalDateTime? = null,

	@Column(name = "uploaded_by")
	var uploadedBy: Long? = null,

	@Column(name = "uploaded_at", nullable = false)
	var uploadedAt: LocalDateTime = LocalDateTime.now(),

	@Column(name = "validated_at")
	var validatedAt: LocalDateTime? = null,

	@Column(name = "confirmed_at")
	var confirmedAt: LocalDateTime? = null,

	@Column(name = "cancelled_at")
	var cancelledAt: LocalDateTime? = null,

	@Column(name = "rolled_back_at")
	var rolledBackAt: LocalDateTime? = null,

	@Column(name = "confirmed_by")
	var confirmedBy: Long? = null,

	@Column(name = "error_count", nullable = false)
	var errorCount: Int = 0,

	@Column(name = "warning_count", nullable = false)
	var warningCount: Int = 0,

	@Column(name = "info_count", nullable = false)
	var infoCount: Int = 0,

	@Column(name = "memo", length = 1000)
	var memo: String? = null,
) {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}
