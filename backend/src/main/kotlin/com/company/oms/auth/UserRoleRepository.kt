package com.company.oms.auth

import org.springframework.data.jpa.repository.JpaRepository

interface UserRoleRepository : JpaRepository<UserRoleEntity, UserRoleId> {
	fun findAllById_UserId(userId: Long): List<UserRoleEntity>

	fun deleteAllById_UserId(userId: Long)
}
