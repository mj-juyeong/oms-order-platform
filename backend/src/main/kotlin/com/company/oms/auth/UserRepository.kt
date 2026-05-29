package com.company.oms.auth

import com.company.oms.common.persistence.UserScopeType
import org.springframework.data.jpa.repository.JpaRepository

interface UserRepository : JpaRepository<UserEntity, Long> {
	fun findByLoginId(loginId: String): UserEntity?

	fun existsByLoginId(loginId: String): Boolean

	fun findAllByUserScopeTypeAndStatus(userScopeType: UserScopeType, status: String): List<UserEntity>

	fun findAllByTenantIdAndStatus(tenantId: Long, status: String): List<UserEntity>
}
