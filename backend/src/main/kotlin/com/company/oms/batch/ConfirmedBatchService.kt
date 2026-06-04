package com.company.oms.batch

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.BatchStatus
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
@Profile("local")
class ConfirmedBatchService(
	private val uploadBatchRepository: UploadBatchRepository,
) {

	@Transactional(readOnly = true)
	fun requireConfirmedBatch(
		tenantId: Long,
		clientId: Long?,
		batchId: Long,
	): UploadBatchEntity {
		val batch =
			uploadBatchRepository.findById(batchId).orElseThrow {
				OmsException(ErrorCode.BATCH_NOT_FOUND, status = HttpStatus.NOT_FOUND)
			}
		if (batch.tenantId != tenantId || (clientId != null && batch.clientId != clientId)) {
			throw OmsException(ErrorCode.BATCH_NOT_FOUND, status = HttpStatus.NOT_FOUND)
		}
		if (batch.status != BatchStatus.CONFIRMED) {
			throw OmsException(ErrorCode.BATCH_NOT_CONFIRMED)
		}
		return batch
	}

	@Transactional(readOnly = true)
	fun findLatestConfirmedBatch(
		tenantId: Long,
		clientId: Long,
		deliveryDate: LocalDate?,
	): UploadBatchEntity =
		uploadBatchRepository.findAllByTenantIdAndClientIdAndStatus(tenantId, clientId, BatchStatus.CONFIRMED)
			.asSequence()
			.filter { deliveryDate == null || it.deliveryDate == deliveryDate }
			.maxByOrNull { it.uploadedAt }
			?: throw OmsException(ErrorCode.NO_CONFIRMED_BATCH, status = HttpStatus.NOT_FOUND)

	@Transactional(readOnly = true)
	fun findConfirmedBatchesForExternalQuery(
		tenantId: Long,
		clientId: Long,
		deliveryDate: LocalDate?,
	): List<UploadBatchEntity> {
		val confirmedBatches =
			uploadBatchRepository.findAllByTenantIdAndClientIdAndStatus(tenantId, clientId, BatchStatus.CONFIRMED)

		if (confirmedBatches.isEmpty()) {
			throw OmsException(ErrorCode.NO_CONFIRMED_BATCH, status = HttpStatus.NOT_FOUND)
		}

		if (deliveryDate != null) {
			return confirmedBatches
				.filter { it.deliveryDate == deliveryDate }
				.sortedWith(compareBy<UploadBatchEntity> { it.uploadedAt }.thenBy { it.id ?: 0 })
				.ifEmpty {
					throw OmsException(ErrorCode.NO_CONFIRMED_BATCH, status = HttpStatus.NOT_FOUND)
				}
		}

		val latestDeliveryDate = confirmedBatches.mapNotNull { it.deliveryDate }.maxOrNull()
		val selectedBatches =
			if (latestDeliveryDate != null) {
				confirmedBatches.filter { it.deliveryDate == latestDeliveryDate }
			} else {
				listOf(confirmedBatches.maxBy { it.uploadedAt })
			}

		return selectedBatches.sortedWith(compareBy<UploadBatchEntity> { it.uploadedAt }.thenBy { it.id ?: 0 })
	}

	@Transactional(readOnly = true)
	fun findTenantConfirmedBatchesForExternalQuery(
		tenantId: Long,
		deliveryDate: LocalDate?,
	): List<UploadBatchEntity> {
		val confirmedBatches = uploadBatchRepository.findAllByTenantIdAndStatus(tenantId, BatchStatus.CONFIRMED)

		if (confirmedBatches.isEmpty()) {
			throw OmsException(ErrorCode.NO_CONFIRMED_BATCH, status = HttpStatus.NOT_FOUND)
		}

		return confirmedBatches
			.asSequence()
			.filter { deliveryDate == null || it.deliveryDate == deliveryDate }
			.sortedWith(compareBy<UploadBatchEntity> { it.uploadedAt }.thenBy { it.id ?: 0 })
			.toList()
			.ifEmpty {
				throw OmsException(ErrorCode.NO_CONFIRMED_BATCH, status = HttpStatus.NOT_FOUND)
			}
	}

	@Transactional(readOnly = true)
	fun resolveConfirmedBatch(
		tenantId: Long,
		clientId: Long,
		batchId: Long?,
		deliveryDate: LocalDate?,
	): UploadBatchEntity =
		if (batchId != null) {
			requireConfirmedBatch(tenantId, clientId, batchId)
		} else {
			findLatestConfirmedBatch(tenantId, clientId, deliveryDate)
		}

	@Transactional(readOnly = true)
	fun resolveConfirmedBatches(
		tenantId: Long,
		clientId: Long,
		batchId: Long?,
		deliveryDate: LocalDate?,
	): List<UploadBatchEntity> =
		if (batchId != null) {
			listOf(requireConfirmedBatch(tenantId, clientId, batchId))
		} else {
			findConfirmedBatchesForExternalQuery(tenantId, clientId, deliveryDate)
		}

	@Transactional(readOnly = true)
	fun resolveConfirmedBatches(
		tenantId: Long,
		clientId: Long?,
		batchId: Long?,
		deliveryDate: LocalDate?,
	): List<UploadBatchEntity> =
		if (clientId != null) {
			resolveConfirmedBatches(tenantId, clientId, batchId, deliveryDate)
		} else if (batchId != null) {
			listOf(requireConfirmedBatch(tenantId, clientId, batchId))
		} else {
			findTenantConfirmedBatchesForExternalQuery(tenantId, deliveryDate)
		}
}
