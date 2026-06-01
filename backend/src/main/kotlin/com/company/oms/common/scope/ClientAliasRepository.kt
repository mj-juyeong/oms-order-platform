package com.company.oms.common.scope

import org.springframework.data.jpa.repository.JpaRepository

interface ClientAliasRepository : JpaRepository<ClientAliasEntity, Long> {
	fun findAllByTenantIdAndActiveYn(tenantId: Long, activeYn: Boolean): List<ClientAliasEntity>

	fun findByTenantIdAndNormalizedAlias(tenantId: Long, normalizedAlias: String): ClientAliasEntity?
}
