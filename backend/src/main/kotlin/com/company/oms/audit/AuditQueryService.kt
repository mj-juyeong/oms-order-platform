package com.company.oms.audit

import com.company.oms.auth.AuthGuard
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import com.company.oms.download.DownloadLogRepository
import com.company.oms.externalapi.ApiCallLogRepository
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Profile("local")
class AuditQueryService(
	private val authGuard: AuthGuard,
	private val batchAuditLogRepository: BatchAuditLogRepository,
	private val apiCallLogRepository: ApiCallLogRepository,
	private val downloadLogRepository: DownloadLogRepository,
) {

	@Transactional(readOnly = true)
	fun listBatchAuditLogs(
		tenantId: Long,
		clientId: Long,
		batchId: Long?,
		action: String?,
		from: LocalDateTime?,
		to: LocalDateTime?,
		page: Int,
		size: Int,
	): PageResponse<BatchAuditLogResponse> {
		authGuard.requireAdmin()
		return batchAuditLogRepository.findAll()
			.asSequence()
			.filter { it.tenantId == tenantId && it.clientId == clientId }
			.filter { batchId == null || it.batchId == batchId }
			.filter { action == null || it.action == action }
			.filter { from == null || (it.createdAt != null && !it.createdAt!!.isBefore(from)) }
			.filter { to == null || (it.createdAt != null && !it.createdAt!!.isAfter(to)) }
			.sortedByDescending { it.createdAt }
			.map { it.toResponse() }
			.toList()
			.toPageResponse(page, size)
	}

	@Transactional(readOnly = true)
	fun listApiCallLogs(
		tenantId: Long,
		clientId: Long,
		apiKeyId: Long?,
		path: String?,
		responseStatus: Int?,
		from: LocalDateTime?,
		to: LocalDateTime?,
		page: Int,
		size: Int,
	): PageResponse<ApiCallLogResponse> {
		authGuard.requireAdmin()
		return apiCallLogRepository.findAll()
			.asSequence()
			.filter { it.tenantId == tenantId && it.clientId == clientId }
			.filter { apiKeyId == null || it.apiKeyId == apiKeyId }
			.filter { path == null || it.path == path }
			.filter { responseStatus == null || it.responseStatus == responseStatus }
			.filter { from == null || (it.createdAt != null && !it.createdAt!!.isBefore(from)) }
			.filter { to == null || (it.createdAt != null && !it.createdAt!!.isAfter(to)) }
			.sortedByDescending { it.createdAt }
			.map { it.toResponse() }
			.toList()
			.toPageResponse(page, size)
	}

	@Transactional(readOnly = true)
	fun listDownloadLogs(
		tenantId: Long,
		clientId: Long,
		batchId: Long?,
		downloadType: String?,
		downloadedBy: Long?,
		from: LocalDateTime?,
		to: LocalDateTime?,
		page: Int,
		size: Int,
	): PageResponse<AuditDownloadLogResponse> {
		authGuard.requireAdmin()
		return downloadLogRepository.findAll()
			.asSequence()
			.filter { it.tenantId == tenantId && it.clientId == clientId }
			.filter { batchId == null || it.batchId == batchId }
			.filter { downloadType == null || it.downloadType == downloadType }
			.filter { downloadedBy == null || it.downloadedBy == downloadedBy }
			.filter { from == null || !it.downloadedAt.isBefore(from) }
			.filter { to == null || !it.downloadedAt.isAfter(to) }
			.sortedByDescending { it.downloadedAt }
			.map { it.toAuditResponse() }
			.toList()
			.toPageResponse(page, size)
	}
}
