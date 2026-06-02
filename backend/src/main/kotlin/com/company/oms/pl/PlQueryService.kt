package com.company.oms.pl

import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.PlType
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.validatePageRequest
import com.company.oms.master.StoreRouteMasterItemRepository
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Predicate
import jakarta.persistence.criteria.Root
import org.springframework.context.annotation.Profile
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
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
		dueDateFrom: LocalDate?,
		dueDateTo: LocalDate?,
		vehicleName: String?,
		storeCode: String?,
		storeName: String?,
		productCode: String?,
		productName: String?,
		orderNo: String?,
		confirmedOnly: Boolean,
		sortBy: String?,
		sortDirection: String?,
		page: Int,
		size: Int,
	): PageResponse<PlLineResponse> {
		validatePageRequest(page, size)

		val confirmedBatchIds = if (confirmedOnly) confirmedBatchIds(tenantId, clientId) else null
		if (confirmedOnly && confirmedBatchIds.isNullOrEmpty()) {
			return emptyPage(page, size)
		}

		val effectiveDueDateFrom = dueDate ?: dueDateFrom
		val effectiveDueDateTo = dueDate ?: dueDateTo
		val rows = plLineRepository.findAll(
			plLineSpecification(
				tenantId = tenantId,
				clientId = clientId,
				batchId = batchId,
				confirmedBatchIds = confirmedBatchIds,
				plType = plType,
				dueDateFrom = effectiveDueDateFrom,
				dueDateTo = effectiveDueDateTo,
				vehicleName = vehicleName,
				storeCode = storeCode,
				storeName = storeName,
				productCode = productCode,
				productName = productName,
				orderNo = orderNo,
			),
			PageRequest.of(page, size, resolveSort(sortBy, sortDirection)),
		)
		val fallbackStoreNames = fallbackStoreNames(tenantId, rows.content.map { it.storeCode })
		return rows.toResponsePage { it.toResponse(fallbackStoreNames[it.storeCode]) }
	}

	private fun confirmedBatchIds(tenantId: Long, clientId: Long?): List<Long> =
		uploadBatchRepository.findAll()
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.filter { it.status == BatchStatus.CONFIRMED }
			.mapNotNull { it.id }

	private fun plLineSpecification(
		tenantId: Long,
		clientId: Long?,
		batchId: Long?,
		confirmedBatchIds: List<Long>?,
		plType: PlType?,
		dueDateFrom: LocalDate?,
		dueDateTo: LocalDate?,
		vehicleName: String?,
		storeCode: String?,
		storeName: String?,
		productCode: String?,
		productName: String?,
		orderNo: String?,
	): Specification<PlLineEntity> =
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
			if (confirmedBatchIds != null) {
				predicates += root.get<Long>("batchId").`in`(confirmedBatchIds)
			}
			if (plType != null) {
				predicates += criteriaBuilder.equal(root.get<PlType>("plType"), plType)
			}
			if (dueDateFrom != null) {
				predicates += criteriaBuilder.greaterThanOrEqualTo(root.get("dueDate"), dueDateFrom)
			}
			if (dueDateTo != null) {
				predicates += criteriaBuilder.lessThanOrEqualTo(root.get("dueDate"), dueDateTo)
			}
			containsPredicate(criteriaBuilder, root, "vehicleName", vehicleName)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "storeCode", storeCode)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "storeName", storeName)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "productCode", productCode)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "productName", productName)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "orderNo", orderNo)?.let { predicates += it }

			criteriaBuilder.and(*predicates.toTypedArray())
		}

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

private val plSortFields =
	mapOf(
		"id" to "id",
		"batchId" to "batchId",
		"sheetName" to "sheetName",
		"plType" to "plType",
		"orderNo" to "orderNo",
		"storeCode" to "storeCode",
		"storeName" to "storeName",
		"brandName" to "brandName",
		"productCode" to "productCode",
		"productName" to "productName",
		"unit" to "unit",
		"storageTemperature" to "storageTemperature",
		"dueDate" to "dueDate",
		"orderQty" to "orderQty",
		"vehicleName" to "vehicleName",
		"cbm" to "cbm",
		"qrCode" to "qrCode",
		"boxQty" to "boxQty",
		"rowNo" to "rowNo",
	)

private fun resolveSort(sortBy: String?, sortDirection: String?): Sort {
	val field = plSortFields[sortBy] ?: "id"
	val direction =
		if (sortDirection.equals("desc", ignoreCase = true)) {
			Sort.Direction.DESC
		} else {
			Sort.Direction.ASC
		}
	return Sort.by(direction, field)
}

private fun containsPredicate(
	criteriaBuilder: CriteriaBuilder,
	root: Root<PlLineEntity>,
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

private fun <T> emptyPage(
	page: Int,
	size: Int,
): PageResponse<T> =
	PageResponse(
		items = emptyList(),
		page = page,
		size = size,
		totalElements = 0,
		totalPages = 0,
	)
