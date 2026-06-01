package com.company.oms.master

import org.springframework.data.jpa.repository.JpaRepository

interface ClientStoreCodeMappingRepository : JpaRepository<ClientStoreCodeMappingEntity, Long> {
	fun findByTenantIdAndClientIdAndClientStoreCode(
		tenantId: Long,
		clientId: Long,
		clientStoreCode: String,
	): ClientStoreCodeMappingEntity?

	fun findAllByTenantIdAndClientId(
		tenantId: Long,
		clientId: Long,
	): List<ClientStoreCodeMappingEntity>
}
