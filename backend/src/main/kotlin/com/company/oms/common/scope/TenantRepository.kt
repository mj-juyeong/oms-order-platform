package com.company.oms.common.scope

import org.springframework.data.jpa.repository.JpaRepository

interface TenantRepository : JpaRepository<TenantEntity, Long> {
	fun findByCode(code: String): TenantEntity?

	fun findAllByStatus(status: String): List<TenantEntity>
}
