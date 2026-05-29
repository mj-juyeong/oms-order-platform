package com.company.oms.scan

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
) {

	@Transactional(readOnly = true)
	fun listScanLines(
		tenantId: Long,
		clientId: Long,
		batchId: Long?,
		deliveryDate: LocalDate?,
		scanCenter: String?,
		storeCode: String?,
		productCode: String?,
		barcode: String?,
		page: Int,
		size: Int,
	): PageResponse<ScanLineResponse> {
		val rows =
			when {
				batchId != null -> scanLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, clientId, batchId)
				deliveryDate != null && scanCenter != null ->
					scanLineRepository.findAllByTenantIdAndClientIdAndDeliveryDateAndScanCenter(
						tenantId,
						clientId,
						deliveryDate,
						scanCenter,
					)
				barcode != null -> scanLineRepository.findAllByTenantIdAndClientIdAndBarcode(tenantId, clientId, barcode)
				else -> scanLineRepository.findAll().filter { it.tenantId == tenantId && it.clientId == clientId }
			}

		return rows
			.asSequence()
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
}
