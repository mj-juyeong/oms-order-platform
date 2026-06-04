package com.company.oms.externalapi

import org.springframework.data.jpa.repository.JpaRepository

interface ApiCallLogRepository : JpaRepository<ApiCallLogEntity, Long> {
	fun findByRequestId(requestId: String): ApiCallLogEntity?

	fun findAllByTenantIdAndClientIdAndPath(
		tenantId: Long,
		clientId: Long,
		path: String,
	): List<ApiCallLogEntity>

	fun findAllByTenantIdAndClientIdIsNullAndPath(
		tenantId: Long,
		path: String,
	): List<ApiCallLogEntity>
}
