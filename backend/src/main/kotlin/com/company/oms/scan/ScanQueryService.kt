package com.company.oms.scan

import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
@Profile("local")
class ScanQueryService(
	private val scanLineRepository: ScanLineRepository,
	private val uploadBatchRepository: UploadBatchRepository,
) {

	@Transactional(readOnly = true)
	fun listScanLines(
		tenantId: Long,
		clientId: Long?,
		batchId: Long?,
		deliveryDate: LocalDate?,
		scanCenter: String?,
		storeCode: String?,
		productCode: String?,
		barcode: String?,
		confirmedOnly: Boolean,
		page: Int,
		size: Int,
	): PageResponse<ScanLineResponse> {
		val statusByBatchId = batchStatusById(tenantId, clientId)
		val rows = scanLineRepository.findAll()
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.filter { batchId == null || it.batchId == batchId }

		return rows
			.asSequence()
			.filter { !confirmedOnly || statusByBatchId[it.batchId] == BatchStatus.CONFIRMED }
			.filter { deliveryDate == null || it.deliveryDate == deliveryDate }
			.filter { scanCenter == null || it.scanCenter == scanCenter }
			.filter { storeCode == null || it.orderBusinessSiteCode == storeCode }
			.filter { productCode == null || it.productCode == productCode }
			.filter { barcode == null || it.barcode == barcode }
			.sortedBy { it.id ?: 0 }
			.map { it.toResponse() }
			.toList()
			.toPageResponse(page, size)
	}

	private fun batchStatusById(tenantId: Long, clientId: Long?): Map<Long, BatchStatus> =
		uploadBatchRepository.findAll()
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.mapNotNull { batch -> batch.id?.let { it to batch.status } }
			.toMap()
}
