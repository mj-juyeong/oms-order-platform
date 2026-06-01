package com.company.oms.common.config

import com.company.oms.auth.RoleEntity
import com.company.oms.auth.RoleRepository
import com.company.oms.auth.UserEntity
import com.company.oms.auth.UserRepository
import com.company.oms.auth.UserRoleEntity
import com.company.oms.auth.UserRoleId
import com.company.oms.auth.UserRoleRepository
import com.company.oms.common.persistence.UserScopeType
import com.company.oms.common.scope.TenantEntity
import com.company.oms.common.scope.TenantRepository
import jakarta.persistence.EntityManager
import org.springframework.boot.CommandLineRunner
import org.springframework.context.annotation.Profile
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
@Profile("local")
class LocalSeedDataRunner(
	private val tenantRepository: TenantRepository,
	private val userRepository: UserRepository,
	private val roleRepository: RoleRepository,
	private val userRoleRepository: UserRoleRepository,
	private val passwordEncoder: PasswordEncoder,
	private val entityManager: EntityManager,
) : CommandLineRunner {

	@Transactional
	override fun run(vararg args: String) {
		val tenant = tenantRepository.findByCode("SAMPLE_TENANT")
			?: tenantRepository.saveAndFlush(
				TenantEntity(
					code = "SAMPLE_TENANT",
					name = "샘플 물류사",
					status = "ACTIVE",
				),
			)

		val systemAdminRole = ensureRole(
			code = "SYSTEM_ADMIN",
			name = "System Admin",
			description = "Local development system administrator role",
		)
		ensureRole(
			code = "ADMIN",
			name = "Admin",
			description = "Tenant administrator role",
		)
		ensureRole(
			code = "OPERATOR",
			name = "Operator",
			description = "Tenant operator role",
		)
		ensureRole(
			code = "VIEWER",
			name = "Viewer",
			description = "Read-only viewer role",
		)

		val user = userRepository.findByLoginId("admin")
			?: run {
				resetLocalUsers()
				userRepository.saveAndFlush(
					UserEntity(
						userScopeType = UserScopeType.SYSTEM,
						tenantId = null,
						clientId = null,
						loginId = "admin",
						name = "System Admin",
						email = "admin@example.local",
						passwordHash = passwordEncoder.encode("admin1234") ?: "",
						status = "ACTIVE",
					),
				)
			}
		user.userScopeType = UserScopeType.SYSTEM
		user.tenantId = null
		user.clientId = null
		user.name = "System Admin"
		user.email = "admin@example.local"
		user.passwordHash = passwordEncoder.encode("admin1234") ?: ""
		user.status = "ACTIVE"

		val userId = requireNotNull(user.id)
		val roleId = requireNotNull(systemAdminRole.id)
		userRoleRepository.deleteAllById_UserId(userId)
		val userRoleId = UserRoleId(userId = userId, roleId = roleId)
		if (!userRoleRepository.existsById(userRoleId)) {
			userRoleRepository.save(UserRoleEntity(userRoleId))
		}
	}

	private fun ensureRole(
		code: String,
		name: String,
		description: String,
	): RoleEntity =
		roleRepository.findByCode(code)
			?: roleRepository.saveAndFlush(
				RoleEntity(
					code = code,
					name = name,
					description = description,
				),
			)

	private fun resetLocalUsers() {
		listOf(
			"UPDATE api_keys SET created_by = NULL WHERE created_by IS NOT NULL",
			"UPDATE master_upload_batches SET uploaded_by = NULL WHERE uploaded_by IS NOT NULL",
			"UPDATE upload_batches SET uploaded_by = NULL WHERE uploaded_by IS NOT NULL",
			"UPDATE upload_batches SET confirmed_by = NULL WHERE confirmed_by IS NOT NULL",
			"UPDATE uploaded_files SET created_by = NULL WHERE created_by IS NOT NULL",
			"UPDATE batch_audit_logs SET actor_id = NULL WHERE actor_id IS NOT NULL",
			"UPDATE download_logs SET downloaded_by = NULL WHERE downloaded_by IS NOT NULL",
		).forEach { sql ->
			entityManager.createNativeQuery(sql).executeUpdate()
		}

		userRoleRepository.deleteAllInBatch()
		userRepository.deleteAllInBatch()
	}
}
