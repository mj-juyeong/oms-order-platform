package com.company.oms.master

import org.springframework.data.jpa.repository.JpaRepository

interface StoreRouteMasterItemRepository : JpaRepository<StoreRouteMasterItemEntity, Long> {
	fun findByTenantIdAndBaljugoCode(tenantId: Long, baljugoCode: String): StoreRouteMasterItemEntity?

	fun existsByTenantIdAndBaljugoCode(tenantId: Long, baljugoCode: String): Boolean

	fun findAllByTenantId(tenantId: Long): List<StoreRouteMasterItemEntity>

	fun findAllByTenantIdAndActiveYn(tenantId: Long, activeYn: Boolean): List<StoreRouteMasterItemEntity>
}
