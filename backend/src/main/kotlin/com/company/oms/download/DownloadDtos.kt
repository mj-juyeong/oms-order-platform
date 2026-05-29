package com.company.oms.download

import java.time.LocalDateTime

data class LabelDownloadFile(
	val fileName: String,
	val content: ByteArray,
) {
	val contentLength: Int = content.size
}

data class DownloadLogResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val batchId: Long?,
	val downloadType: String,
	val fileName: String,
	val filterJson: String?,
	val rowCount: Int?,
	val downloadedBy: Long?,
	val requestId: String?,
	val downloadedAt: LocalDateTime,
)

fun DownloadLogEntity.toResponse(): DownloadLogResponse =
	DownloadLogResponse(
		id = requireNotNull(id),
		tenantId = tenantId,
		clientId = clientId,
		batchId = batchId,
		downloadType = downloadType,
		fileName = fileName,
		filterJson = filterJson,
		rowCount = rowCount,
		downloadedBy = downloadedBy,
		requestId = requestId,
		downloadedAt = downloadedAt,
	)
