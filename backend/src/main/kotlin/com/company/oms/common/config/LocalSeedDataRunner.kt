package com.company.oms.common.config

import com.company.oms.auth.RoleEntity
import com.company.oms.auth.RoleRepository
import com.company.oms.auth.UserEntity
import com.company.oms.auth.UserRepository
import com.company.oms.auth.UserRoleEntity
import com.company.oms.auth.UserRoleId
import com.company.oms.auth.UserRoleRepository
import com.company.oms.common.persistence.UserScopeType
import com.company.oms.common.scope.ClientEntity
import com.company.oms.common.scope.ClientRepository
import com.company.oms.common.scope.TenantEntity
import com.company.oms.common.scope.TenantRepository
import org.springframework.boot.CommandLineRunner
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
@Profile("local")
class LocalSeedDataRunner(
	private val tenantRepository: TenantRepository,
	private val clientRepository: ClientRepository,
	private val userRepository: UserRepository,
	private val roleRepository: RoleRepository,
	private val userRoleRepository: UserRoleRepository,
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

		val tenantId = requireNotNull(tenant.id)
		clientRepository.findByTenantIdAndCode(tenantId, "WELLSTORY")
			?: clientRepository.saveAndFlush(
				ClientEntity(
					tenantId = tenantId,
					code = "WELLSTORY",
					name = "웰스토리",
					status = "ACTIVE",
				),
			)

		val adminRole = roleRepository.findByCode("ADMIN")
			?: roleRepository.saveAndFlush(
				RoleEntity(
					code = "ADMIN",
					name = "Admin",
					description = "Local development administrator role",
				),
			)
		roleRepository.findByCode("OPERATOR")
			?: roleRepository.saveAndFlush(
				RoleEntity(
					code = "OPERATOR",
					name = "Operator",
					description = "Local development operator role",
				),
			)
		roleRepository.findByCode("VIEWER")
			?: roleRepository.saveAndFlush(
				RoleEntity(
					code = "VIEWER",
					name = "Viewer",
					description = "Local development viewer role",
				),
			)

		val user = userRepository.findByLoginId("ops01")
			?: userRepository.saveAndFlush(
				UserEntity(
					userScopeType = UserScopeType.TENANT,
					tenantId = tenantId,
					clientId = null,
					loginId = "ops01",
					name = "운영자01",
					email = "ops01@example.local",
					passwordHash = "{noop}local-only",
					status = "ACTIVE",
				),
			)

		val userId = requireNotNull(user.id)
		val roleId = requireNotNull(adminRole.id)
		val userRoleId = UserRoleId(userId = userId, roleId = roleId)
		if (!userRoleRepository.existsById(userRoleId)) {
			userRoleRepository.save(UserRoleEntity(userRoleId))
		}
	}
}
