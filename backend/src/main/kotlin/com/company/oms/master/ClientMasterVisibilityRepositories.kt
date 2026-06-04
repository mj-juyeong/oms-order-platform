package com.company.oms.master

import com.company.oms.common.persistence.ClientMasterScopeStatus
import org.springframework.data.jpa.repository.JpaRepository

interface ClientMasterVisibilitySettingRepository : JpaRepository<ClientMasterVisibilitySettingEntity, Long> {
	fun findByTenantIdAndClientId(
		tenantId: Long,
		clientId: Long,
	): ClientMasterVisibilitySettingEntity?
}

interface ClientProductMasterScopeRepository : JpaRepository<ClientProductMasterScopeEntity, Long> {
	fun findByTenantIdAndClientIdAndProductMasterItemId(
		tenantId: Long,
		clientId: Long,
		productMasterItemId: Long,
	): ClientProductMasterScopeEntity?

	fun findAllByTenantIdAndClientIdAndStatus(
		tenantId: Long,
		clientId: Long,
		status: ClientMasterScopeStatus,
	): List<ClientProductMasterScopeEntity>

	fun findAllByTenantIdAndClientId(
		tenantId: Long,
		clientId: Long,
	): List<ClientProductMasterScopeEntity>

	fun countByTenantIdAndProductMasterItemIdAndStatus(
		tenantId: Long,
		productMasterItemId: Long,
		status: ClientMasterScopeStatus,
	): Long
}

interface ClientStoreRouteMasterScopeRepository : JpaRepository<ClientStoreRouteMasterScopeEntity, Long> {
	fun findByTenantIdAndClientIdAndStoreRouteMasterItemId(
		tenantId: Long,
		clientId: Long,
		storeRouteMasterItemId: Long,
	): ClientStoreRouteMasterScopeEntity?

	fun findAllByTenantIdAndClientIdAndStatus(
		tenantId: Long,
		clientId: Long,
		status: ClientMasterScopeStatus,
	): List<ClientStoreRouteMasterScopeEntity>

	fun findAllByTenantIdAndClientId(
		tenantId: Long,
		clientId: Long,
	): List<ClientStoreRouteMasterScopeEntity>

	fun countByTenantIdAndStoreRouteMasterItemIdAndStatus(
		tenantId: Long,
		storeRouteMasterItemId: Long,
		status: ClientMasterScopeStatus,
	): Long
}
