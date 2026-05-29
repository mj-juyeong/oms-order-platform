package com.company.oms.auth

import org.springframework.data.jpa.repository.JpaRepository

interface RoleRepository : JpaRepository<RoleEntity, Long> {
	fun findByCode(code: String): RoleEntity?
}

