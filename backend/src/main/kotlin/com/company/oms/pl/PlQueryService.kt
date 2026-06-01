package com.company.oms.pl

import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.PlType
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import com.company.oms.master.StoreRouteMasterItemRepository
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
@Profile("local")
class PlQueryService(
	private val plLineRepository: PlLineRepository,
	private val uploadBatchRepository: UploadBatchRepository,
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
) {

	@Transactional(readOnly = true)
	fun listPlLines(
		tenantId: Long,
		clientId: Long?,
		batchId: Long?,
		plType: PlType?,
		dueDate: LocalDate?,
		vehicleName: String?,
		storeCode: String?,
		productCode: String?,
		orderNo: String?,
		confirmedOnly: Boolean,
		page: Int,
		size: Int,
	): PageResponse<PlLineResponse> {
		val statusByBatchId = batchStatusById(tenantId, clientId)
		val rows = plLineRepository.findAll()
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.filter { batchId == null || it.batchId == batchId }

		val filteredRows = rows
			.asSequence()
			.filter { !confirmedOnly || statusByBatchId[it.batchId] == BatchStatus.CONFIRMED }
			.filter { plType == null || it.plType == plType }
			.filter { dueDate == null || it.dueDate == dueDate }
			.filter { vehicleName == null || it.vehicleName == vehicleName }
			.filter { storeCode == null || it.storeCode == storeCode }
			.filter { productCode == null || it.productCode == productCode }
			.filter { orderNo == null || it.orderNo == orderNo }
			.sortedBy { it.id ?: 0 }
			.toList()

		val fallbackStoreNames = fallbackStoreNames(tenantId, filteredRows.map { it.storeCode })

		return filteredRows
			.map { it.toResponse(fallbackStoreNames[it.storeCode]) }
			.toPageResponse(page, size)
	}

	private fun batchStatusById(tenantId: Long, clientId: Long?): Map<Long, BatchStatus> =
		uploadBatchRepository.findAll()
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.mapNotNull { batch -> batch.id?.let { it to batch.status } }
			.toMap()

	private fun fallbackStoreNames(
		tenantId: Long,
		storeCodes: List<String?>,
	): Map<String, String> =
		storeCodes
			.mapNotNull { it?.trim()?.takeIf(String::isNotBlank) }
			.distinct()
			.mapNotNull { code ->
				storeRouteMasterItemRepository.findByTenantIdAndBaljugoCode(tenantId, code)
					?.storeName
					?.takeIf(String::isNotBlank)
					?.let { code to it }
			}
			.toMap()
}
