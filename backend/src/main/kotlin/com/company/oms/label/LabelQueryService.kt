package com.company.oms.label

import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.LabelType
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
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Profile("local")
class LabelQueryService(
	private val labelLineRepository: LabelLineRepository,
	private val uploadBatchRepository: UploadBatchRepository,
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
) {

	@Transactional(readOnly = true)
	fun listLabelLines(
		tenantId: Long,
		clientId: Long?,
		batchId: Long?,
		labelType: LabelType?,
		storeCode: String?,
		storeName: String?,
		brandName: String?,
		productCode: String?,
		productName: String?,
		orderNo: String?,
		matchingCode: String?,
		qrCode: String?,
		confirmedOnly: Boolean,
		sortBy: String?,
		sortDirection: String?,
		page: Int,
		size: Int,
	): PageResponse<LabelLineResponse> {
		validatePageRequest(page, size)

		val batchStatusById = batchStatusById(tenantId, clientId)
		val confirmedBatchIds =
			if (confirmedOnly) {
				batchStatusById.filterValues { it == BatchStatus.CONFIRMED }.keys.toList()
			} else {
				null
			}
		if (confirmedOnly && confirmedBatchIds.isNullOrEmpty()) {
			return emptyPage(page, size)
		}

		val rows = labelLineRepository.findAll(
			labelLineSpecification(
				tenantId = tenantId,
				clientId = clientId,
				batchId = batchId,
				confirmedBatchIds = confirmedBatchIds,
				labelType = labelType,
				storeCode = storeCode,
				storeName = storeName,
				brandName = brandName,
				productCode = productCode,
				productName = productName,
				orderNo = orderNo,
				matchingCode = matchingCode,
				qrCode = qrCode,
			),
			PageRequest.of(page, size, resolveSort(sortBy, sortDirection)),
		)
		val fallbackStoreNames = fallbackStoreNames(tenantId, rows.content.map { it.storeCode })
		return rows.toResponsePage { it.toResponse(batchStatusById[it.batchId], fallbackStoreNames[it.storeCode]) }
	}

	@Transactional(readOnly = true)
	fun getLabelLine(
		tenantId: Long,
		clientId: Long?,
		labelLineId: Long,
	): LabelLineResponse {
		val row =
			labelLineRepository.findById(labelLineId).orElseThrow {
				OmsException(ErrorCode.LABEL_LINE_NOT_FOUND, status = HttpStatus.NOT_FOUND)
			}
		if (row.tenantId != tenantId || (clientId != null && row.clientId != clientId)) {
			throw OmsException(ErrorCode.LABEL_LINE_NOT_FOUND, status = HttpStatus.NOT_FOUND)
		}
		val batchStatus = uploadBatchRepository.findById(row.batchId).orElse(null)?.status
		return row.toResponse(batchStatus, fallbackStoreName(tenantId, row.storeCode))
	}

	private fun batchStatusById(tenantId: Long, clientId: Long?): Map<Long, BatchStatus> =
		uploadBatchRepository.findAll()
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.mapNotNull { batch -> batch.id?.let { it to batch.status } }
			.toMap()

	private fun labelLineSpecification(
		tenantId: Long,
		clientId: Long?,
		batchId: Long?,
		confirmedBatchIds: List<Long>?,
		labelType: LabelType?,
		storeCode: String?,
		storeName: String?,
		brandName: String?,
		productCode: String?,
		productName: String?,
		orderNo: String?,
		matchingCode: String?,
		qrCode: String?,
	): Specification<LabelLineEntity> =
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
			if (labelType != null) {
				predicates += criteriaBuilder.equal(root.get<LabelType>("labelType"), labelType)
			}
			containsPredicate(criteriaBuilder, root, "storeCode", storeCode)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "storeName", storeName)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "brandName", brandName)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "productCode", productCode)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "productName", productName)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "orderNo", orderNo)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "matchingCode", matchingCode)?.let { predicates += it }
			containsPredicate(criteriaBuilder, root, "qrCode", qrCode)?.let { predicates += it }

			criteriaBuilder.and(*predicates.toTypedArray())
		}

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

private val labelSortFields =
	mapOf(
		"id" to "id",
		"batchId" to "batchId",
		"sheetName" to "sheetName",
		"labelType" to "labelType",
		"orderNo" to "orderNo",
		"storeCode" to "storeCode",
		"storeName" to "storeName",
		"brandName" to "brandName",
		"productCode" to "productCode",
		"productName" to "productName",
		"orderQty" to "orderQty",
		"sequenceNo" to "sequenceNo",
		"matchingCode" to "matchingCode",
		"qrCode" to "qrCode",
		"boxSequence" to "boxSequence",
		"totalBoxQty" to "totalBoxQty",
		"rowNo" to "rowNo",
	)

private fun resolveSort(sortBy: String?, sortDirection: String?): Sort {
	val field = labelSortFields[sortBy] ?: "id"
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
	root: Root<LabelLineEntity>,
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
