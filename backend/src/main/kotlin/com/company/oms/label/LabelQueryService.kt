package com.company.oms.label

import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.LabelType
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import com.company.oms.master.StoreRouteMasterItemRepository
import org.springframework.context.annotation.Profile
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
		page: Int,
		size: Int,
	): PageResponse<LabelLineResponse> {
		val batchStatusById = batchStatusById(tenantId, clientId)
		val rows = labelLineRepository.findAll()
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.filter { batchId == null || it.batchId == batchId }

		val filteredRows = rows
			.asSequence()
			.filter { !confirmedOnly || batchStatusById[it.batchId] == BatchStatus.CONFIRMED }
			.filter { batchId == null || it.batchId == batchId }
			.filter { labelType == null || it.labelType == labelType }
			.filter { matchesExact(it.storeCode, storeCode) }
			.filter { matchesContains(it.storeName, storeName) }
			.filter { matchesContains(it.brandName, brandName) }
			.filter { matchesExact(it.productCode, productCode) }
			.filter { matchesContains(it.productName, productName) }
			.filter { matchesExact(it.orderNo, orderNo) }
			.filter { matchesExact(it.matchingCode, matchingCode) }
			.filter { matchesExact(it.qrCode, qrCode) }
			.sortedBy { it.id ?: 0 }
			.toList()

		val fallbackStoreNames = fallbackStoreNames(tenantId, filteredRows.map { it.storeCode })

		return filteredRows
			.map { it.toResponse(batchStatusById[it.batchId], fallbackStoreNames[it.storeCode]) }
			.toPageResponse(page, size)
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

	private fun matchesExact(
		value: String?,
		query: String?,
	): Boolean {
		val normalizedQuery = query?.trim()?.takeIf(String::isNotBlank) ?: return true
		return value == normalizedQuery
	}

	private fun matchesContains(
		value: String?,
		query: String?,
	): Boolean {
		val normalizedQuery = query?.trim()?.takeIf(String::isNotBlank) ?: return true
		return value?.contains(normalizedQuery, ignoreCase = true) == true
	}
}
