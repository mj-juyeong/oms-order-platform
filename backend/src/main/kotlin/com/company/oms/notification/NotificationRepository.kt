package com.company.oms.notification

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor

interface NotificationRepository :
	JpaRepository<NotificationEntity, Long>,
	JpaSpecificationExecutor<NotificationEntity> {
	fun countByTenantIdAndReadAtIsNull(tenantId: Long): Long

	fun countByTenantIdAndClientIdAndReadAtIsNull(
		tenantId: Long,
		clientId: Long,
	): Long
}
