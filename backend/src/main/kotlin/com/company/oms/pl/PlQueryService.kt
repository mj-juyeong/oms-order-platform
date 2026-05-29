package com.company.oms.pl

import com.company.oms.common.persistence.PlType
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
@Profile("local")
class PlQueryService(
	private val plLineRepository: PlLineRepository,
) {

	@Transactional(readOnly = true)
	fun listPlLines(
		tenantId: Long,
		clientId: Long,
		batchId: Long?,
		plType: PlType?,
		dueDate: LocalDate?,
		vehicleName: String?,
		storeCode: String?,
		productCode: String?,
		orderNo: String?,
		page: Int,
		size: Int,
	): PageResponse<PlLineResponse> {
		val rows =
			when {
				batchId != null -> plLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, clientId, batchId)
				dueDate != null && plType != null -> plLineRepository.findAllByTenantIdAndClientIdAndDueDateAndPlType(
					tenantId,
					clientId,
					dueDate,
					plType,
				)
				orderNo != null -> plLineRepository.findAllByTenantIdAndClientIdAndOrderNo(tenantId, clientId, orderNo)
				else -> plLineRepository.findAll().filter { it.tenantId == tenantId && it.clientId == clientId }
			}

		return rows
			.asSequence()
			.filter { plType == null || it.plType == plType }
			.filter { dueDate == null || it.dueDate == dueDate }
			.filter { vehicleName == null || it.vehicleName == vehicleName }
			.filter { storeCode == null || it.storeCode == storeCode }
			.filter { productCode == null || it.productCode == productCode }
			.filter { orderNo == null || it.orderNo == orderNo }
			.sortedBy { it.id ?: 0 }
			.map { it.toResponse() }
			.toList()
			.toPageResponse(page, size)
	}
}
