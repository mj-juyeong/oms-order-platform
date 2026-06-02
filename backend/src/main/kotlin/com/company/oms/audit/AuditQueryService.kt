package com.company.oms.audit

import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.UserScopeType
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import com.company.oms.download.DownloadLogRepository
import com.company.oms.externalapi.ApiCallLogRepository
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Profile("local")
class AuditQueryService(
	private val accessScopeService: AccessScopeService,
	private val batchAuditLogRepository: BatchAuditLogRepository,
	private val apiCallLogRepository: ApiCallLogRepository,
	private val downloadLogRepository: DownloadLogRepository,
) {

	@Transactional(readOnly = true)
	fun listBatchAuditLogs(
		tenantId: Long,
		clientId: Long?,
		batchId: Long?,
		action: String?,
		from: LocalDateTime?,
		to: LocalDateTime?,
		page: Int,
		size: Int,
	): PageResponse<BatchAuditLogResponse> {
		val resolvedTenantId = requireAuditTenant(tenantId)
		return batchAuditLogRepository.findAll()
			.asSequence()
			.filter { it.tenantId == resolvedTenantId && (clientId == null || it.clientId == clientId) }
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
		clientId: Long?,
		apiKeyId: Long?,
		path: String?,
		responseStatus: Int?,
		from: LocalDateTime?,
		to: LocalDateTime?,
		page: Int,
		size: Int,
	): PageResponse<ApiCallLogResponse> {
		val resolvedTenantId = requireAuditTenant(tenantId)
		return apiCallLogRepository.findAll()
			.asSequence()
			.filter { it.tenantId == resolvedTenantId && (clientId == null || it.clientId == clientId) }
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
		clientId: Long?,
		batchId: Long?,
		downloadType: String?,
		downloadedBy: Long?,
		from: LocalDateTime?,
		to: LocalDateTime?,
		page: Int,
		size: Int,
	): PageResponse<AuditDownloadLogResponse> {
		val resolvedTenantId = requireAuditTenant(tenantId)
		return downloadLogRepository.findAll()
			.asSequence()
			.filter { it.tenantId == resolvedTenantId && (clientId == null || it.clientId == clientId) }
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

	private fun requireAuditTenant(tenantId: Long): Long {
		val currentUser = accessScopeService.requireAnyRole(UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		if (currentUser.userScopeType == UserScopeType.CLIENT) {
			throw OmsException(
				errorCode = ErrorCode.FORBIDDEN,
				message = "CLIENT users cannot access tenant audit logs.",
				status = HttpStatus.FORBIDDEN,
			)
		}
		return accessScopeService.requireTenantAccess(tenantId)
	}
}
