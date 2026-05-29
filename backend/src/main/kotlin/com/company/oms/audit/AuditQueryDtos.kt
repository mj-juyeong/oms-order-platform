package com.company.oms.audit

import com.company.oms.common.persistence.BatchStatus
import com.company.oms.download.DownloadLogEntity
import com.company.oms.externalapi.ApiCallLogEntity
import java.time.LocalDateTime

data class BatchAuditLogResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val batchId: Long?,
	val action: String,
	val beforeStatus: BatchStatus?,
	val afterStatus: BatchStatus?,
	val actorId: Long?,
	val requestId: String?,
	val message: String?,
	val metadataJson: String?,
	val createdAt: LocalDateTime?,
)

data class ApiCallLogResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val apiKeyId: Long?,
	val requestId: String?,
	val path: String,
	val method: String,
	val queryString: String?,
	val responseStatus: Int,
	val responseTimeMs: Int?,
	val clientIp: String?,
	val createdAt: LocalDateTime?,
)

data class AuditDownloadLogResponse(
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

fun BatchAuditLogEntity.toResponse(): BatchAuditLogResponse =
	BatchAuditLogResponse(
		id = requireNotNull(id),
		tenantId = tenantId,
		clientId = clientId,
		batchId = batchId,
		action = action,
		beforeStatus = beforeStatus,
		afterStatus = afterStatus,
		actorId = actorId,
		requestId = requestId,
		message = message,
		metadataJson = metadataJson,
		createdAt = createdAt,
	)

fun ApiCallLogEntity.toResponse(): ApiCallLogResponse =
	ApiCallLogResponse(
		id = requireNotNull(id),
		tenantId = tenantId,
		clientId = clientId,
		apiKeyId = apiKeyId,
		requestId = requestId,
		path = path,
		method = method,
		queryString = queryString,
		responseStatus = responseStatus,
		responseTimeMs = responseTimeMs,
		clientIp = clientIp,
		createdAt = createdAt,
	)

fun DownloadLogEntity.toAuditResponse(): AuditDownloadLogResponse =
	AuditDownloadLogResponse(
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
