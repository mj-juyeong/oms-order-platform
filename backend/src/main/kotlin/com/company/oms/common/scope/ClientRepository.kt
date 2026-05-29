package com.company.oms.common.scope

import org.springframework.data.jpa.repository.JpaRepository

interface ClientRepository : JpaRepository<ClientEntity, Long> {
	fun findByTenantIdAndCode(tenantId: Long, code: String): ClientEntity?

	fun findAllByTenantIdAndStatus(tenantId: Long, status: String): List<ClientEntity>
}

