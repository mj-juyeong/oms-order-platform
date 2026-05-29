package com.company.oms.upload

import com.company.oms.common.persistence.CreatedAtEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "uploaded_files")
class UploadedFileEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "batch_id", nullable = false)
	var batchId: Long = 0,

	@Column(name = "file_type", nullable = false, length = 32)
	var fileType: String = "",

	@Column(name = "original_file_name", nullable = false, length = 255)
	var originalFileName: String = "",

	@Column(name = "stored_path", nullable = false, length = 1000)
	var storedPath: String = "",

	@Column(name = "file_hash", nullable = false, length = 128)
	var fileHash: String = "",

	@Column(name = "file_size", nullable = false)
	var fileSize: Long = 0,

	@Column(name = "content_type", length = 255)
	var contentType: String? = null,

	@Column(name = "created_by")
	var createdBy: Long? = null,
) : CreatedAtEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

