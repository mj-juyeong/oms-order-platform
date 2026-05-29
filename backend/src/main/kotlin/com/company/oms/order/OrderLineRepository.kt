package com.company.oms.order

import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate

interface OrderLineRepository : JpaRepository<OrderLineEntity, Long> {
	fun findAllByTenantIdAndClientId(
		tenantId: Long,
		clientId: Long,
	): List<OrderLineEntity>

	fun findAllByTenantIdAndClientIdAndBatchId(
		tenantId: Long,
		clientId: Long,
		batchId: Long,
	): List<OrderLineEntity>

	fun findBySourcePlLineId(sourcePlLineId: Long): OrderLineEntity?

	fun findAllByTenantIdAndClientIdAndDueDate(
		tenantId: Long,
		clientId: Long,
		dueDate: LocalDate,
	): List<OrderLineEntity>
}
