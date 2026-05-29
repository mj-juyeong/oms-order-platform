package com.company.oms.master

import org.springframework.data.jpa.repository.JpaRepository

interface ProductMasterItemRepository : JpaRepository<ProductMasterItemEntity, Long> {
	fun findByTenantIdAndEzadminCode(tenantId: Long, ezadminCode: String): ProductMasterItemEntity?

	fun existsByTenantIdAndEzadminCode(tenantId: Long, ezadminCode: String): Boolean

	fun findAllByTenantId(tenantId: Long): List<ProductMasterItemEntity>

	fun findAllByTenantIdAndActiveYn(tenantId: Long, activeYn: Boolean): List<ProductMasterItemEntity>
}
