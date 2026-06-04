package com.company.oms.order

import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.validatePageRequest
import com.company.oms.common.scope.ClientRepository
import com.company.oms.master.StoreRouteMasterItemRepository
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Predicate
import jakarta.persistence.criteria.Root
import org.springframework.context.annotation.Profile
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
@Profile("local")
class OrderQueryService(
	private val orderLineRepository: OrderLineRepository,
	private val uploadBatchRepository: UploadBatchRepository,
	private val clientRepository: ClientRepository,
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
		sortBy: String?,
		sortDirection: String?,
		page: Int,
		size: Int,
	): PageResponse<OrderLineResponse> {
		validatePageRequest(page, size)

		val effectiveDueDateFrom = deliveryDate ?: dueDateFrom
		val effectiveDueDateTo = deliveryDate ?: dueDateTo
		val rows =
			orderLineRepository.findAll(
				orderLineSpecification(
					tenantId = tenantId,
					clientId = clientId,
					batchId = batchId,
					dueDateFrom = effectiveDueDateFrom,
					dueDateTo = effectiveDueDateTo,
					storeCode = storeCode,
					storeName = storeName,
					brandName = brandName,
					productCode = productCode,
					productName = productName,
					orderNo = orderNo,
					unit = unit,
					vehicleName = vehicleName,
					confirmedOnly = confirmedOnly,
				),
				PageRequest.of(page, size, resolveSort(sortBy, sortDirection)),
			)

		val fallbackStoreNames = fallbackStoreNames(tenantId, rows.content.map { it.storeCode })
		val clientNamesById = clientNamesById(rows.content.map { it.clientId })
		val statusByBatchId = batchStatusById(rows.content.map { it.batchId })

		return rows.toResponsePage {
			it.toResponse(
				batchStatus = statusByBatchId[it.batchId],
				clientName = clientNamesById[it.clientId],
				fallbackStoreName = fallbackStoreNames[it.storeCode],
			)
		}
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
		return row.toResponse(
			batchStatus = batchStatusById(listOf(row.batchId))[row.batchId],
			clientName = clientName(row.clientId),
			fallbackStoreName = fallbackStoreName(tenantId, row.storeCode),
		)
	}

	private fun batchStatusById(batchIds: List<Long>): Map<Long, BatchStatus> =
		uploadBatchRepository.findAllById(batchIds.distinct())
			.mapNotNull { batch -> batch.id?.let { it to batch.status } }
			.toMap()

	private fun clientNamesById(clientIds: List<Long>): Map<Long, String> =
		clientRepository.findAllById(clientIds.distinct())
			.mapNotNull { client ->
				val name = client.name.takeIf(String::isNotBlank) ?: return@mapNotNull null
				client.id?.let { it to name }
			}
			.toMap()

	private fun clientName(clientId: Long): String? =
		clientRepository.findById(clientId)
			.orElse(null)
			?.name
			?.takeIf(String::isNotBlank)

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

private fun orderLineSpecification(
	tenantId: Long,
	clientId: Long?,
	batchId: Long?,
	dueDateFrom: LocalDate?,
	dueDateTo: LocalDate?,
	storeCode: String?,
	storeName: String?,
	brandName: String?,
	productCode: String?,
	productName: String?,
	orderNo: String?,
	unit: String?,
	vehicleName: String?,
	confirmedOnly: Boolean,
): Specification<OrderLineEntity> =
	Specification { root, _, criteriaBuilder ->
		val predicates = mutableListOf<Predicate>(
			criteriaBuilder.equal(root.get<Long>("tenantId"), tenantId),
		)

		if (clientId != null) {
			predicates += criteriaBuilder.equal(root.get<Long>("clientId"), clientId)
		}
		if (batchId != null) {
			predicates += criteriaBuilder.equal(root.get<Long>("batchId"), batchId)
		}
		if (confirmedOnly) {
			predicates += criteriaBuilder.equal(root.get<Any>("batch").get<BatchStatus>("status"), BatchStatus.CONFIRMED)
		}
		if (dueDateFrom != null) {
			predicates += criteriaBuilder.greaterThanOrEqualTo(root.get("dueDate"), dueDateFrom)
		}
		if (dueDateTo != null) {
			predicates += criteriaBuilder.lessThanOrEqualTo(root.get("dueDate"), dueDateTo)
		}
		containsPredicate(criteriaBuilder, root, "storeCode", storeCode)?.let { predicates += it }
		containsPredicate(criteriaBuilder, root, "storeName", storeName)?.let { predicates += it }
		containsPredicate(criteriaBuilder, root, "brandName", brandName)?.let { predicates += it }
		containsPredicate(criteriaBuilder, root, "productCode", productCode)?.let { predicates += it }
		containsPredicate(criteriaBuilder, root, "productName", productName)?.let { predicates += it }
		containsPredicate(criteriaBuilder, root, "orderNo", orderNo)?.let { predicates += it }
		containsPredicate(criteriaBuilder, root, "unit", unit)?.let { predicates += it }
		containsPredicate(criteriaBuilder, root, "vehicleName", vehicleName)?.let { predicates += it }

		criteriaBuilder.and(*predicates.toTypedArray())
	}

private val orderSortFields =
	mapOf(
		"id" to "id",
		"batchId" to "batchId",
		"sourcePlLineId" to "sourcePlLineId",
		"orderNo" to "orderNo",
		"clientName" to "client.name",
		"storeCode" to "storeCode",
		"storeName" to "storeName",
		"brandName" to "brandName",
		"productCode" to "productCode",
		"productName" to "productName",
		"unit" to "unit",
		"orderQty" to "orderQty",
		"dueDate" to "dueDate",
		"vehicleName" to "vehicleName",
		"deliveryRound" to "deliveryRound",
		"area" to "area",
		"batchStatus" to "batch.status",
	)

private fun resolveSort(sortBy: String?, sortDirection: String?): Sort {
	val field = orderSortFields[sortBy] ?: "id"
	val direction =
		if (sortDirection.equals("desc", ignoreCase = true)) {
			Sort.Direction.DESC
		} else {
			Sort.Direction.ASC
		}
	return Sort.by(direction, field).and(Sort.by(Sort.Direction.ASC, "id"))
}

private fun containsPredicate(
	criteriaBuilder: CriteriaBuilder,
	root: Root<OrderLineEntity>,
	field: String,
	query: String?,
): Predicate? {
	val normalizedQuery = query.normalizedQuery() ?: return null
	return criteriaBuilder.like(
		criteriaBuilder.lower(criteriaBuilder.coalesce(root.get<String>(field), "")),
		"%${normalizedQuery.lowercase()}%",
	)
}

private fun String?.normalizedQuery(): String? =
	this?.trim()?.takeIf(String::isNotBlank)

private fun <TEntity : Any, TResponse> Page<TEntity>.toResponsePage(mapper: (TEntity) -> TResponse): PageResponse<TResponse> =
	PageResponse(
		items = content.map(mapper),
		page = number,
		size = size,
		totalElements = totalElements,
		totalPages = totalPages,
	)
