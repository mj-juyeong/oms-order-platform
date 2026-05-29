package com.company.oms.label

import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.LabelType
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Profile("local")
class LabelQueryService(
	private val labelLineRepository: LabelLineRepository,
	private val uploadBatchRepository: UploadBatchRepository,
) {

	@Transactional(readOnly = true)
	fun listLabelLines(
		tenantId: Long,
		clientId: Long,
		batchId: Long?,
		labelType: LabelType?,
		storeCode: String?,
		storeName: String?,
		productCode: String?,
		productName: String?,
		orderNo: String?,
		matchingCode: String?,
		qrCode: String?,
		page: Int,
		size: Int,
	): PageResponse<LabelLineResponse> {
		val rows =
			when {
				batchId != null && labelType != null ->
					labelLineRepository.findAllByTenantIdAndClientIdAndBatchIdAndLabelType(
						tenantId,
						clientId,
						batchId,
						labelType,
					)
				batchId != null -> labelLineRepository.findAllByTenantIdAndClientIdAndBatchId(tenantId, clientId, batchId)
				qrCode != null -> labelLineRepository.findAllByTenantIdAndClientIdAndQrCode(tenantId, clientId, qrCode)
				else -> labelLineRepository.findAll().filter { it.tenantId == tenantId && it.clientId == clientId }
			}

		val filteredRows = rows
			.asSequence()
			.filter { batchId == null || it.batchId == batchId }
			.filter { labelType == null || it.labelType == labelType }
			.filter { matchesExact(it.storeCode, storeCode) }
			.filter { matchesContains(it.storeName, storeName) }
			.filter { matchesExact(it.productCode, productCode) }
			.filter { matchesContains(it.productName, productName) }
			.filter { matchesExact(it.orderNo, orderNo) }
			.filter { matchesExact(it.matchingCode, matchingCode) }
			.filter { matchesExact(it.qrCode, qrCode) }
			.sortedBy { it.id ?: 0 }
			.toList()

		val batchStatuses =
			filteredRows
				.map { it.batchId }
				.distinct()
				.associateWith { id -> uploadBatchRepository.findById(id).orElse(null)?.status }

		return filteredRows
			.map { it.toResponse(batchStatuses[it.batchId]) }
			.toPageResponse(page, size)
	}

	@Transactional(readOnly = true)
	fun getLabelLine(
		tenantId: Long,
		clientId: Long,
		labelLineId: Long,
	): LabelLineResponse {
		val row =
			labelLineRepository.findById(labelLineId).orElseThrow {
				OmsException(ErrorCode.LABEL_LINE_NOT_FOUND, status = HttpStatus.NOT_FOUND)
			}
		if (row.tenantId != tenantId || row.clientId != clientId) {
			throw OmsException(ErrorCode.LABEL_LINE_NOT_FOUND, status = HttpStatus.NOT_FOUND)
		}
		val batchStatus = uploadBatchRepository.findById(row.batchId).orElse(null)?.status
		return row.toResponse(batchStatus)
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
