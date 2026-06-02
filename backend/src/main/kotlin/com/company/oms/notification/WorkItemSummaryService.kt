package com.company.oms.notification

import com.company.oms.auth.CurrentUser
import com.company.oms.batch.BatchConfirmationRequestRepository
import com.company.oms.batch.UploadBatchEntity
import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.persistence.BatchConfirmationRequestStatus
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.UserScopeType
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.CriteriaQuery
import jakarta.persistence.criteria.Predicate
import jakarta.persistence.criteria.Root
import org.springframework.context.annotation.Profile
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Profile("local")
class WorkItemSummaryService(
	private val confirmationRequestRepository: BatchConfirmationRequestRepository,
	private val uploadBatchRepository: UploadBatchRepository,
	private val notificationService: NotificationService,
) {
	@Transactional(readOnly = true)
	fun summarize(
		currentUser: CurrentUser,
		tenantId: Long,
		clientId: Long?,
	): WorkItemSummaryResponse {
		val unreadNotifications = notificationService.countUnread(currentUser, tenantId, clientId).unreadCount
		val scopedClientId = if (currentUser.userScopeType == UserScopeType.CLIENT) currentUser.clientId else clientId

		return WorkItemSummaryResponse(
			unreadNotifications = unreadNotifications,
			incompleteBatches = countIncompleteBatches(tenantId, scopedClientId),
			pendingConfirmationRequests = countConfirmationRequests(tenantId, scopedClientId, BatchConfirmationRequestStatus.REQUESTED),
			needsMoreInfoBatches = countBatches(tenantId, scopedClientId, BatchStatus.NEEDS_MORE_INFO),
			rejectedConfirmationRequests = countConfirmationRequests(tenantId, scopedClientId, BatchConfirmationRequestStatus.REJECTED),
			validationErrorBatches = countBatches(tenantId, scopedClientId, BatchStatus.VALIDATION_FAILED),
		)
	}

	private fun countIncompleteBatches(
		tenantId: Long,
		clientId: Long?,
	): Long {
		val completedStatuses = listOf(BatchStatus.CONFIRMED, BatchStatus.CANCELLED, BatchStatus.ROLLED_BACK)
		return uploadBatchRepository.count(
			workItemBatchSpec(
				tenantId = tenantId,
				clientId = clientId,
				excludedStatuses = completedStatuses,
			),
		)
	}

	private fun countConfirmationRequests(
		tenantId: Long,
		clientId: Long?,
		status: BatchConfirmationRequestStatus,
	): Long =
		if (clientId == null) {
			confirmationRequestRepository.countByTenantIdAndStatus(tenantId, status)
		} else {
			confirmationRequestRepository.countByTenantIdAndClientIdAndStatus(tenantId, clientId, status)
		}

	private fun countBatches(
		tenantId: Long,
		clientId: Long?,
		status: BatchStatus,
	): Long =
		uploadBatchRepository.count(
			workItemBatchSpec(
				tenantId = tenantId,
				clientId = clientId,
				status = status,
			),
		)
}

private fun workItemBatchSpec(
	tenantId: Long,
	clientId: Long?,
	status: BatchStatus? = null,
	excludedStatuses: Collection<BatchStatus> = emptyList(),
): Specification<UploadBatchEntity> =
	Specification { root, query, criteriaBuilder ->
		val predicates = mutableListOf<Predicate>(
			criteriaBuilder.equal(root.get<Long>("tenantId"), tenantId),
		)
		if (clientId != null) {
			predicates += criteriaBuilder.equal(root.get<Long>("clientId"), clientId)
		}
		if (status != null) {
			predicates += criteriaBuilder.equal(root.get<BatchStatus>("status"), status)
		}
		if (excludedStatuses.isNotEmpty()) {
			predicates += criteriaBuilder.not(root.get<BatchStatus>("status").`in`(excludedStatuses))
		}
		predicates += unresolvedSupplementParentPredicate(root, query, criteriaBuilder)

		criteriaBuilder.and(*predicates.toTypedArray())
	}

private fun unresolvedSupplementParentPredicate(
	root: Root<UploadBatchEntity>,
	query: CriteriaQuery<*>,
	criteriaBuilder: CriteriaBuilder,
): Predicate {
	val confirmedSupplementParents = query.subquery(Long::class.java)
	val childBatch = confirmedSupplementParents.from(UploadBatchEntity::class.java)
	confirmedSupplementParents
		.select(childBatch.get<Long>("parentBatchId"))
		.where(
			criteriaBuilder.isNotNull(childBatch.get<Long>("parentBatchId")),
			criteriaBuilder.equal(childBatch.get<BatchStatus>("status"), BatchStatus.CONFIRMED),
		)
	return criteriaBuilder.or(
		criteriaBuilder.notEqual(root.get<BatchStatus>("status"), BatchStatus.NEEDS_MORE_INFO),
		criteriaBuilder.not(root.get<Long>("id").`in`(confirmedSupplementParents)),
	)
}
