package com.company.oms.download

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "download_logs")
class DownloadLogEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "batch_id")
	var batchId: Long? = null,

	@Column(name = "download_type", nullable = false, length = 32)
	var downloadType: String = "",

	@Column(name = "file_name", nullable = false, length = 255)
	var fileName: String = "",

	@Column(name = "filter_json", columnDefinition = "json")
	var filterJson: String? = null,

	@Column(name = "row_count")
	var rowCount: Int? = null,

	@Column(name = "downloaded_by")
	var downloadedBy: Long? = null,

	@Column(name = "request_id", length = 100)
	var requestId: String? = null,

	@Column(name = "downloaded_at", nullable = false)
	var downloadedAt: LocalDateTime = LocalDateTime.now(),
) {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

