package com.company.oms.externalapi

import com.company.oms.auth.ApiKeyEntity
import com.company.oms.auth.ApiKeyRepository
import com.company.oms.auth.ApiKeyScopeType
import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
import com.company.oms.batch.UploadBatchEntity
import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import com.company.oms.common.scope.ClientRepository
import com.company.oms.pl.PlLineEntity
import com.company.oms.pl.PlLineRepository
import com.company.oms.scan.ScanLineEntity
import com.company.oms.scan.ScanLineRepository
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

@Service
@Profile("local")
class ExternalApiStatusService(
	private val accessScopeService: AccessScopeService,
	private val uploadBatchRepository: UploadBatchRepository,
	private val scanLineRepository: ScanLineRepository,
	private val plLineRepository: PlLineRepository,
	private val apiKeyRepository: ApiKeyRepository,
	private val apiCallLogRepository: ApiCallLogRepository,
	private val clientRepository: ClientRepository,
) {

	@Transactional(readOnly = true)
	fun listStatus(
		tenantId: Long,
		clientId: Long,
		channel: ExternalApiChannel?,
		batchId: Long?,
		deliveryDate: LocalDate?,
		status: BatchStatus?,
		page: Int,
		size: Int,
	): PageResponse<ExternalApiStatusResponse> {
		accessScopeService.requireAnyRole(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)
		val scope = accessScopeService.requireClientAccess(tenantId, clientId)
		val resolvedTenantId = scope.tenantId
		val resolvedClientId = requireNotNull(scope.clientId)

		val channels = channel?.let { listOf(it) } ?: ExternalApiChannel.entries
		val activeApiKeysByScope = activeApiKeysByScope(resolvedTenantId, resolvedClientId)
		val lastCallsByEndpoint = lastCallsByEndpoint(resolvedTenantId, resolvedClientId)
		val clientName = clientRepository.findById(resolvedClientId).orElse(null)?.name

		return uploadBatchRepository.findAllByTenantIdAndClientId(resolvedTenantId, resolvedClientId)
			.asSequence()
			.filter { batchId == null || it.id == batchId }
			.filter { deliveryDate == null || it.deliveryDate == deliveryDate }
			.filter { status == null || it.status == status }
			.sortedWith(compareByDescending<UploadBatchEntity> { it.uploadedAt }.thenBy { it.id ?: 0 })
			.flatMap { batch ->
				channels.map { selectedChannel ->
					toStatusResponse(
						batch = batch,
						channel = selectedChannel,
						clientName = clientName,
						activeApiKeys = activeApiKeysByScope[selectedChannel.requiredScope].orEmpty(),
						lastCall = lastCallsByEndpoint[selectedChannel.endpoint],
					)
				}
			}
			.toList()
			.sortedWith(
				compareByDescending<ExternalApiStatusResponse> { it.providable }
					.thenByDescending { it.deliveryDate }
					.thenBy { it.channel.name }
					.thenBy { it.batchId },
			)
			.toPageResponse(page, size)
	}

	private fun toStatusResponse(
		batch: UploadBatchEntity,
		channel: ExternalApiChannel,
		clientName: String?,
		activeApiKeys: List<ApiKeyEntity>,
		lastCall: ApiCallLogEntity?,
	): ExternalApiStatusResponse =
		when (channel) {
			ExternalApiChannel.WOS_SCAN -> {
				val rows = scanLineRepository.findAllByTenantIdAndClientIdAndBatchId(batch.tenantId, batch.clientId, requireNotNull(batch.id))
				val exclusion = exclusion(batch, rows.size, activeApiKeys.isNotEmpty())
				ExternalApiStatusResponse(
					channel = channel,
					endpoint = channel.endpoint,
					requiredScope = channel.requiredScope,
					tenantId = batch.tenantId,
					clientId = batch.clientId,
					clientName = clientName,
					batchId = requireNotNull(batch.id),
					batchNo = batch.batchNo,
					deliveryDate = batch.deliveryDate,
					batchStatus = batch.status,
					providable = exclusion == null,
					excludedReasonCode = exclusion?.code,
					excludedReason = exclusion?.message,
					sourceSheets = rows.map { it.sheetName }.distinct().sorted(),
					providedRowCount = rows.size,
					activeApiKeyCount = activeApiKeys.size,
					hasActiveApiKey = activeApiKeys.isNotEmpty(),
					latestApiKeyLastUsedAt = activeApiKeys.mapNotNull { it.lastUsedAt }.maxOrNull(),
					latestApiKeyExpiresAt = activeApiKeys.mapNotNull { it.expiresAt }.minOrNull(),
					lastCalledAt = lastCall?.createdAt,
					lastStatusCode = lastCall?.responseStatus,
					lastRequestId = lastCall?.requestId,
					lastResponseTimeMs = lastCall?.responseTimeMs,
					scanCenterCount = rows.mapNotNull { it.scanCenter }.distinct().size,
					barcodeCount = rows.mapNotNull { it.barcode }.distinct().size,
				)
			}
			ExternalApiChannel.PL -> {
				val rows = plLineRepository.findAllByTenantIdAndClientIdAndBatchId(batch.tenantId, batch.clientId, requireNotNull(batch.id))
				val exclusion = exclusion(batch, rows.size, activeApiKeys.isNotEmpty())
				ExternalApiStatusResponse(
					channel = channel,
					endpoint = channel.endpoint,
					requiredScope = channel.requiredScope,
					tenantId = batch.tenantId,
					clientId = batch.clientId,
					clientName = clientName,
					batchId = requireNotNull(batch.id),
					batchNo = batch.batchNo,
					deliveryDate = batch.deliveryDate,
					batchStatus = batch.status,
					providable = exclusion == null,
					excludedReasonCode = exclusion?.code,
					excludedReason = exclusion?.message,
					sourceSheets = rows.map { it.sheetName }.distinct().sorted(),
					providedRowCount = rows.size,
					activeApiKeyCount = activeApiKeys.size,
					hasActiveApiKey = activeApiKeys.isNotEmpty(),
					latestApiKeyLastUsedAt = activeApiKeys.mapNotNull { it.lastUsedAt }.maxOrNull(),
					latestApiKeyExpiresAt = activeApiKeys.mapNotNull { it.expiresAt }.minOrNull(),
					lastCalledAt = lastCall?.createdAt,
					lastStatusCode = lastCall?.responseStatus,
					lastRequestId = lastCall?.requestId,
					lastResponseTimeMs = lastCall?.responseTimeMs,
					plEaCount = rows.count { it.plType.name == "EA" },
					plBoxCount = rows.count { it.plType.name == "BOX" },
					totalOrderQty = rows.fold(BigDecimal.ZERO) { sum, row -> sum + (row.orderQty ?: BigDecimal.ZERO) },
					storeCount = rows.mapNotNull { it.storeCode }.distinct().size,
					vehicleCount = rows.mapNotNull { it.vehicleName }.distinct().size,
				)
			}
		}

	private fun exclusion(
		batch: UploadBatchEntity,
		rowCount: Int,
		hasActiveApiKey: Boolean,
	): ExternalApiStatusExclusion? {
		if (batch.status != BatchStatus.CONFIRMED) {
			return ExternalApiStatusExclusion(
				code = "BATCH_NOT_CONFIRMED",
				message = "확정 완료 배치만 외부 API로 제공할 수 있습니다.",
			)
		}
		if (rowCount == 0) {
			return ExternalApiStatusExclusion(
				code = "NO_DATA",
				message = "제공할 원천 데이터가 없습니다.",
			)
		}
		if (!hasActiveApiKey) {
			return ExternalApiStatusExclusion(
				code = "NO_ACTIVE_API_KEY",
				message = "해당 채널 scope를 가진 활성 API Key가 없습니다.",
			)
		}
		return null
	}

	private fun activeApiKeysByScope(
		tenantId: Long,
		clientId: Long,
	): Map<String, List<ApiKeyEntity>> {
		val now = LocalDateTime.now()
		return apiKeyRepository.findAllByTenantIdAndStatus(tenantId, "ACTIVE")
			.asSequence()
			.filter { it.clientId == clientId || (it.scopeType == ApiKeyScopeType.TENANT && it.clientId == null) }
			.filter { it.expiresAt == null || it.expiresAt!!.isAfter(now) }
			.flatMap { apiKey -> parseScopes(apiKey.allowedScope).map { scope -> scope to apiKey } }
			.groupBy({ it.first }, { it.second })
	}

	private fun lastCallsByEndpoint(
		tenantId: Long,
		clientId: Long,
	): Map<String, ApiCallLogEntity> =
		ExternalApiChannel.entries.associate { channel ->
			channel.endpoint to
				apiCallLogRepository.findAllByTenantIdAndClientIdAndPath(tenantId, clientId, channel.endpoint)
					.plus(apiCallLogRepository.findAllByTenantIdAndClientIdIsNullAndPath(tenantId, channel.endpoint))
					.maxByOrNull { it.createdAt ?: LocalDateTime.MIN }
		}.filterValues { it != null }
			.mapValues { requireNotNull(it.value) }

	private fun parseScopes(value: String?): Set<String> =
		value
			?.removePrefix("[")
			?.removeSuffix("]")
			?.split(",")
			?.map { it.trim().trim('"') }
			?.filter { it.isNotBlank() }
			?.toSet()
			?: emptySet()
}

private data class ExternalApiStatusExclusion(
	val code: String,
	val message: String,
)
