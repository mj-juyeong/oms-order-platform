package com.company.oms.master

import org.springframework.data.jpa.repository.JpaRepository

interface ClientProductCodeMappingRepository : JpaRepository<ClientProductCodeMappingEntity, Long> {
	fun findByTenantIdAndClientIdAndClientProductCode(
		tenantId: Long,
		clientId: Long,
		clientProductCode: String,
	): ClientProductCodeMappingEntity?

	fun findAllByTenantIdAndClientId(
		tenantId: Long,
		clientId: Long,
	): List<ClientProductCodeMappingEntity>
}
