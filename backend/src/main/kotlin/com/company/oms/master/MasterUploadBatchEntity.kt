package com.company.oms.master

import com.company.oms.common.persistence.MasterType
import com.company.oms.common.persistence.MasterUploadStatus
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
@Table(name = "master_upload_batches")
class MasterUploadBatchEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Enumerated(EnumType.STRING)
	@Column(name = "master_type", nullable = false, length = 32)
	var masterType: MasterType = MasterType.PRODUCT,

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 32)
	var status: MasterUploadStatus = MasterUploadStatus.UPLOADED,

	@Column(name = "original_file_name", nullable = false, length = 255)
	var originalFileName: String = "",

	@Column(name = "stored_path", length = 1000)
	var storedPath: String? = null,

	@Column(name = "file_hash", length = 128)
	var fileHash: String? = null,

	@Column(name = "file_size")
	var fileSize: Long? = null,

	@Column(name = "content_type", length = 255)
	var contentType: String? = null,

	@Column(name = "row_count", nullable = false)
	var rowCount: Int = 0,

	@Column(name = "inserted_count", nullable = false)
	var insertedCount: Int = 0,

	@Column(name = "updated_count", nullable = false)
	var updatedCount: Int = 0,

	@Column(name = "unchanged_count", nullable = false)
	var unchangedCount: Int = 0,

	@Column(name = "failed_count", nullable = false)
	var failedCount: Int = 0,

	@Column(name = "uploaded_by")
	var uploadedBy: Long? = null,

	@Column(name = "uploaded_at", nullable = false)
	var uploadedAt: LocalDateTime = LocalDateTime.now(),

	@Column(name = "applied_at")
	var appliedAt: LocalDateTime? = null,

	@Column(name = "request_id", length = 100)
	var requestId: String? = null,

	@Column(name = "message", length = 1000)
	var message: String? = null,
) {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

