package com.company.oms.order

import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import com.company.oms.master.StoreRouteMasterItemRepository
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
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
) {

	@Transactional(readOnly = true)
	fun listOrders(
		tenantId: Long,
		clientId: Long?,
		batchId: Long?,
		deliveryDate: LocalDate?,
		storeCode: String?,
		storeName: String?,
		brandName: String?,
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
		val rows = orderLineRepository.findAll()
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.filter { batchId == null || it.batchId == batchId }
			.filter { deliveryDate == null || it.dueDate == deliveryDate }

		val filteredRows = rows
			.asSequence()
			.filter { !confirmedOnly || statusByBatchId[it.batchId] == BatchStatus.CONFIRMED }
			.filter { storeCode == null || it.storeCode == storeCode }
			.filter { storeName.isNullOrBlank() || it.storeName.containsIgnoringCase(storeName) }
			.filter { brandName.isNullOrBlank() || it.brandName.containsIgnoringCase(brandName) }
			.filter { productCode == null || it.productCode == productCode }
			.filter { productName.isNullOrBlank() || it.productName.containsIgnoringCase(productName) }
			.filter { orderNo == null || it.orderNo == orderNo }
			.filter { unit.isNullOrBlank() || it.unit.equals(unit, ignoreCase = true) }
			.filter { vehicleName.isNullOrBlank() || it.vehicleName.containsIgnoringCase(vehicleName) }
			.filter { dueDateFrom == null || (it.dueDate != null && !it.dueDate!!.isBefore(dueDateFrom)) }
			.filter { dueDateTo == null || (it.dueDate != null && !it.dueDate!!.isAfter(dueDateTo)) }
			.sortedBy { it.id ?: 0 }
			.toList()

		val fallbackStoreNames = fallbackStoreNames(tenantId, filteredRows.map { it.storeCode })

		return filteredRows
			.map { it.toResponse(statusByBatchId[it.batchId], fallbackStoreNames[it.storeCode]) }
			.toPageResponse(page, size)
	}

	@Transactional(readOnly = true)
	fun getOrderLine(
		tenantId: Long,
		clientId: Long?,
		orderLineId: Long,
	): OrderLineResponse {
		val row =
			orderLineRepository.findById(orderLineId).orElseThrow {
				OmsException(ErrorCode.ORDER_LINE_NOT_FOUND, status = HttpStatus.NOT_FOUND)
			}
		if (row.tenantId != tenantId || (clientId != null && row.clientId != clientId)) {
			throw OmsException(ErrorCode.ORDER_LINE_NOT_FOUND, status = HttpStatus.NOT_FOUND)
		}
		return row.toResponse(batchStatusById(tenantId, clientId)[row.batchId], fallbackStoreName(tenantId, row.storeCode))
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
			.mapNotNull { code -> fallbackStoreName(tenantId, code)?.let { code to it } }
			.toMap()

	private fun fallbackStoreName(
		tenantId: Long,
		storeCode: String?,
	): String? {
		val code = storeCode?.trim()?.takeIf(String::isNotBlank) ?: return null
		return storeRouteMasterItemRepository.findByTenantIdAndBaljugoCode(tenantId, code)
			?.storeName
			?.takeIf(String::isNotBlank)
	}
}

private fun String?.containsIgnoringCase(query: String): Boolean =
	this?.contains(query.trim(), ignoreCase = true) == true
