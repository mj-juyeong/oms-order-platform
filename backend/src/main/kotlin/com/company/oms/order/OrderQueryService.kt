package com.company.oms.order

import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
@Profile("local")
class OrderQueryService(
	private val orderLineRepository: OrderLineRepository,
	private val uploadBatchRepository: UploadBatchRepository,
) {

	@Transactional(readOnly = true)
	fun listOrders(
		tenantId: Long,
		clientId: Long,
		batchId: Long?,
		deliveryDate: LocalDate?,
		storeCode: String?,
		storeName: String?,
		productCode: String?,
		productName: String?,
		orderNo: String?,
		unit: String?,
		vehicleName: String?,
		confirmedOnly: Boolean,
		dueDateFrom: LocalDate?,
		dueDateTo: LocalDate?,
		page: Int,
		size: Int,
	): PageResponse<OrderLineResponse> {
		val statusByBatchId = batchStatusById(tenantId, clientId)
		val rows =
			when {
				batchId != null -> orderLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, clientId, batchId)
				deliveryDate != null -> orderLineRepository.findAllByTenantIdAndClientIdAndDueDate(tenantId, clientId, deliveryDate)
				else -> orderLineRepository.findAllByTenantIdAndClientId(tenantId, clientId)
			}

		return rows
			.asSequence()
			.filter { !confirmedOnly || statusByBatchId[it.batchId] == BatchStatus.CONFIRMED }
			.filter { storeCode == null || it.storeCode == storeCode }
			.filter { storeName.isNullOrBlank() || it.storeName.containsIgnoringCase(storeName) }
			.filter { productCode == null || it.productCode == productCode }
			.filter { productName.isNullOrBlank() || it.productName.containsIgnoringCase(productName) }
			.filter { orderNo == null || it.orderNo == orderNo }
			.filter { unit.isNullOrBlank() || it.unit.equals(unit, ignoreCase = true) }
			.filter { vehicleName.isNullOrBlank() || it.vehicleName.containsIgnoringCase(vehicleName) }
			.filter { dueDateFrom == null || (it.dueDate != null && !it.dueDate!!.isBefore(dueDateFrom)) }
			.filter { dueDateTo == null || (it.dueDate != null && !it.dueDate!!.isAfter(dueDateTo)) }
			.sortedBy { it.id ?: 0 }
			.map { it.toResponse(statusByBatchId[it.batchId]) }
			.toList()
			.toPageResponse(page, size)
	}

	@Transactional(readOnly = true)
	fun getOrderLine(
		tenantId: Long,
		clientId: Long,
		orderLineId: Long,
	): OrderLineResponse {
		val row =
			orderLineRepository.findById(orderLineId).orElseThrow {
				OmsException(ErrorCode.ORDER_LINE_NOT_FOUND, status = HttpStatus.NOT_FOUND)
			}
		if (row.tenantId != tenantId || row.clientId != clientId) {
			throw OmsException(ErrorCode.ORDER_LINE_NOT_FOUND, status = HttpStatus.NOT_FOUND)
		}
		return row.toResponse(batchStatusById(tenantId, clientId)[row.batchId])
	}

	private fun batchStatusById(tenantId: Long, clientId: Long): Map<Long, BatchStatus> =
		uploadBatchRepository.findAllByTenantIdAndClientId(tenantId, clientId)
			.mapNotNull { batch -> batch.id?.let { it to batch.status } }
			.toMap()
}

private fun String?.containsIgnoringCase(query: String): Boolean =
	this?.contains(query.trim(), ignoreCase = true) == true
