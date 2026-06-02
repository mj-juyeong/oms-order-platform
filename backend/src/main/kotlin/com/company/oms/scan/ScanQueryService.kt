package com.company.oms.scan

import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.validatePageRequest
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
		deliveryDateFrom: LocalDate?,
		deliveryDateTo: LocalDate?,
		scanCenter: String?,
		storeCode: String?,
		storeName: String?,
		productCode: String?,
		productName: String?,
		barcode: String?,
		confirmedOnly: Boolean,
		sortBy: String?,
		sortDirection: String?,
		page: Int,
		size: Int,
	): PageResponse<ScanLineResponse> {
		validatePageRequest(page, size)

		val confirmedBatchIds = if (confirmedOnly) confirmedBatchIds(tenantId, clientId) else null
		if (confirmedOnly && confirmedBatchIds.isNullOrEmpty()) {
			return emptyPage(page, size)
		}

		val effectiveDateFrom = deliveryDate ?: deliveryDateFrom
		val effectiveDateTo = deliveryDate ?: deliveryDateTo
		return scanLineRepository
			.findAll(
				scanLineSpecification(
					tenantId = tenantId,
					clientId = clientId,
					batchId = batchId,
					confirmedBatchIds = confirmedBatchIds,
					deliveryDateFrom = effectiveDateFrom,
					deliveryDateTo = effectiveDateTo,
					scanCenter = scanCenter,
					storeCode = storeCode,
					storeName = storeName,
					productCode = productCode,
					productName = productName,
					barcode = barcode,
				),
				PageRequest.of(page, size, resolveSort(sortBy, sortDirection)),
			)
			.toResponsePage { it.toResponse() }
	}

	private fun confirmedBatchIds(tenantId: Long, clientId: Long?): List<Long> =
		uploadBatchRepository.findAll()
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.filter { it.status == BatchStatus.CONFIRMED }
			.mapNotNull { it.id }

	private fun scanLineSpecification(
		tenantId: Long,
		clientId: Long?,
		batchId: Long?,
		confirmedBatchIds: List<Long>?,
		deliveryDateFrom: LocalDate?,
		deliveryDateTo: LocalDate?,
		scanCenter: String?,
		storeCode: String?,
		storeName: String?,
		productCode: String?,
		productName: String?,
		barcode: String?,
	): Specification<ScanLineEntity> =
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
			if (deliveryDateFrom != null) {
				predicates += criteriaBuilder.greaterThanOrEqualTo(root.get("deliveryDate"), deliveryDateFrom)
			}
			if (deliveryDateTo != null) {
				predicates += criteriaBuilder.lessThanOrEqualTo(root.get("deliveryDate"), deliveryDateTo)
			}
			containsPredicate(criteriaBuilder, root, "scanCenter", scanCenter)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "orderBusinessSiteCode", storeCode)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "storeName", storeName)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "productCode", productCode)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "productName", productName)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "barcode", barcode)?.let { predicates += it }

			criteriaBuilder.and(*predicates.toTypedArray())
		}
}

private val scanSortFields =
	mapOf(
		"id" to "id",
		"batchId" to "batchId",
		"sheetName" to "sheetName",
		"scanCenter" to "scanCenter",
		"deliveryDate" to "deliveryDate",
		"bus" to "bus",
		"barcode" to "barcode",
		"orderBusinessSiteCode" to "orderBusinessSiteCode",
		"storeCode" to "orderBusinessSiteCode",
		"storeName" to "storeName",
		"productCode" to "productCode",
		"productName" to "productName",
		"labelQty" to "labelQty",
		"unit" to "unit",
		"temperatureType" to "temperatureType",
		"rowNo" to "rowNo",
	)

private fun resolveSort(sortBy: String?, sortDirection: String?): Sort {
	val field = scanSortFields[sortBy] ?: "id"
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
	root: Root<ScanLineEntity>,
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
