package com.company.oms.master

import com.company.oms.batch.UploadBatchEntity
import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.label.LabelLineRepository
import com.company.oms.order.OrderLineRepository
import com.company.oms.pl.PlLineRepository
import com.company.oms.scan.ScanLineRepository
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

data class MasterConfirmedUsageSummary(
	val latestBatchId: Long,
	val latestBatchNo: String,
	val latestConfirmedAt: LocalDateTime,
)

@Service
@Profile("local")
class MasterConfirmedUsageService(
	private val uploadBatchRepository: UploadBatchRepository,
	private val orderLineRepository: OrderLineRepository,
	private val scanLineRepository: ScanLineRepository,
	private val plLineRepository: PlLineRepository,
	private val labelLineRepository: LabelLineRepository,
) {
	@Transactional(readOnly = true)
	fun latestProductUsageByTenant(
		tenantId: Long,
		clientId: Long? = null,
	): Map<String, MasterConfirmedUsageSummary> =
		confirmedBatches(tenantId, clientId).toLatestUsageMap { batch ->
			val batchId = batch.id ?: return@toLatestUsageMap emptyList()
			listOf(
				orderLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, batch.clientId, batchId).mapNotNull { it.productCode },
				scanLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, batch.clientId, batchId).mapNotNull { it.productCode },
				plLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, batch.clientId, batchId).mapNotNull { it.productCode },
				labelLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, batch.clientId, batchId).mapNotNull { it.productCode },
			).flatten()
		}

	@Transactional(readOnly = true)
	fun latestStoreRouteUsageByTenant(
		tenantId: Long,
		clientId: Long? = null,
	): Map<String, MasterConfirmedUsageSummary> =
		confirmedBatches(tenantId, clientId).toLatestUsageMap { batch ->
			val batchId = batch.id ?: return@toLatestUsageMap emptyList()
			listOf(
				orderLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, batch.clientId, batchId).mapNotNull { it.storeCode },
				scanLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, batch.clientId, batchId).mapNotNull { it.orderBusinessSiteCode },
				plLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, batch.clientId, batchId).mapNotNull { it.storeCode },
				labelLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, batch.clientId, batchId).mapNotNull { it.storeCode },
			).flatten()
		}

	private fun confirmedBatches(
		tenantId: Long,
		clientId: Long?,
	): List<UploadBatchEntity> =
		if (clientId == null) {
			uploadBatchRepository.findAllByTenantIdAndStatus(tenantId, BatchStatus.CONFIRMED)
		} else {
			uploadBatchRepository.findAllByTenantIdAndClientIdAndStatus(tenantId, clientId, BatchStatus.CONFIRMED)
		}

	private fun List<UploadBatchEntity>.toLatestUsageMap(
		resolveCodes: (UploadBatchEntity) -> List<String>,
	): Map<String, MasterConfirmedUsageSummary> {
		val latestByCode = linkedMapOf<String, MasterConfirmedUsageSummary>()
		sortedByDescending { it.confirmedAt ?: it.uploadedAt }.forEach { batch ->
			val batchId = batch.id ?: return@forEach
			val confirmedAt = batch.confirmedAt ?: batch.uploadedAt
			resolveCodes(batch)
				.mapNotNull { it.trim().takeIf(String::isNotBlank) }
				.distinct()
				.forEach { code ->
					val current = latestByCode[code]
					if (current == null || confirmedAt.isAfter(current.latestConfirmedAt)) {
						latestByCode[code] = MasterConfirmedUsageSummary(
							latestBatchId = batchId,
							latestBatchNo = batch.batchNo,
							latestConfirmedAt = confirmedAt,
						)
					}
				}
		}
		return latestByCode
	}
}
