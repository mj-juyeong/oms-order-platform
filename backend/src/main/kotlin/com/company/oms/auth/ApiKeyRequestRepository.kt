package com.company.oms.auth

import com.company.oms.common.persistence.ApiKeyRequestStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor

interface ApiKeyRequestRepository :
	JpaRepository<ApiKeyRequestEntity, Long>,
	JpaSpecificationExecutor<ApiKeyRequestEntity> {
	fun countByTenantIdAndStatus(
		tenantId: Long,
		status: ApiKeyRequestStatus,
	): Long

	fun countByTenantIdAndClientIdAndStatus(
		tenantId: Long,
		clientId: Long,
		status: ApiKeyRequestStatus,
	): Long
}

interface ApiKeyRequestEventRepository : JpaRepository<ApiKeyRequestEventEntity, Long>
