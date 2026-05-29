package com.company.oms.auth

import org.springframework.data.jpa.repository.JpaRepository

interface ApiKeyRepository : JpaRepository<ApiKeyEntity, Long> {
	fun findByTenantIdAndKeyHash(tenantId: Long, keyHash: String): ApiKeyEntity?

	fun findByKeyHash(keyHash: String): ApiKeyEntity?

	fun findAllByTenantIdAndStatus(tenantId: Long, status: String): List<ApiKeyEntity>

	fun findAllByTenantId(tenantId: Long): List<ApiKeyEntity>
}
