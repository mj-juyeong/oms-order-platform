package com.company.oms.auth

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.UserScopeType
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Profile("local")
class UserManagementService(
	private val authGuard: AuthGuard,
	private val userRepository: UserRepository,
	private val roleRepository: RoleRepository,
	private val userRoleRepository: UserRoleRepository,
	private val passwordEncoder: PasswordEncoder,
) {

	@Transactional(readOnly = true)
	fun me(): CurrentUserResponse {
		val currentUser = authGuard.requireUser()
		val user =
			currentUser.userId?.let { userRepository.findById(it).orElse(null) }
		return CurrentUserResponse(
			id = currentUser.userId,
			loginId = currentUser.loginId,
			name = user?.name,
			userScopeType = currentUser.userScopeType,
			tenantId = currentUser.tenantId,
			clientId = currentUser.clientId,
			roles = currentUser.roles,
		)
	}

	@Transactional(readOnly = true)
	fun listUsers(
		userScopeType: UserScopeType?,
		tenantId: Long?,
		clientId: Long?,
		status: String?,
		keyword: String?,
		page: Int,
		size: Int,
	): PageResponse<UserResponse> {
		authGuard.requireAdmin()
		return userRepository.findAll()
			.asSequence()
			.filter { userScopeType == null || it.userScopeType == userScopeType }
			.filter { tenantId == null || it.tenantId == tenantId }
			.filter { clientId == null || it.clientId == clientId }
			.filter { status == null || it.status == status }
			.filter {
				keyword == null ||
					it.loginId.contains(keyword, ignoreCase = true) ||
					it.name.contains(keyword, ignoreCase = true) ||
					(it.email?.contains(keyword, ignoreCase = true) == true)
			}
			.sortedBy { it.id ?: 0 }
			.map { it.toResponse(loadRoleCodes(requireNotNull(it.id))) }
			.toList()
			.toPageResponse(page, size)
	}

	@Transactional
	fun createUser(request: CreateUserRequest): UserMutationResponse {
		authGuard.requireAdmin()
		validateUserScope(request.userScopeType, request.tenantId, request.clientId)
		if (userRepository.existsByLoginId(request.loginId)) {
			throw OmsException(ErrorCode.DUPLICATE_LOGIN_ID)
		}

		val user =
			userRepository.save(
				UserEntity(
					userScopeType = request.userScopeType,
					tenantId = request.tenantId,
					clientId = request.clientId,
					loginId = request.loginId,
					name = request.name,
					email = request.email,
					passwordHash = passwordEncoder.encode(request.password) ?: "",
					status = "ACTIVE",
				),
			)
		replaceRoles(requireNotNull(user.id), request.roleCodes)
		return UserMutationResponse(id = requireNotNull(user.id), updated = false)
	}

	@Transactional
	fun updateUser(
		userId: Long,
		request: UpdateUserRequest,
	): UserMutationResponse {
		authGuard.requireAdmin()
		val user =
			userRepository.findById(userId).orElseThrow {
				OmsException(ErrorCode.USER_NOT_FOUND, status = HttpStatus.NOT_FOUND)
			}
		val nextScope = request.userScopeType ?: user.userScopeType
		val nextTenantId = request.tenantId ?: user.tenantId
		val nextClientId = request.clientId ?: user.clientId
		validateUserScope(nextScope, nextTenantId, nextClientId)

		request.name?.let { user.name = it }
		request.email?.let { user.email = it }
		user.userScopeType = nextScope
		user.tenantId = nextTenantId
		user.clientId = nextClientId
		request.status?.let { user.status = it }
		request.roleCodes?.let { replaceRoles(userId, it) }

		return UserMutationResponse(id = userId)
	}

	private fun validateUserScope(
		userScopeType: UserScopeType,
		tenantId: Long?,
		clientId: Long?,
	) {
		val valid =
			when (userScopeType) {
				UserScopeType.SYSTEM -> tenantId == null && clientId == null
				UserScopeType.TENANT -> tenantId != null && clientId == null
				UserScopeType.CLIENT -> tenantId != null && clientId != null
			}
		if (!valid) {
			throw OmsException(ErrorCode.INVALID_USER_SCOPE)
		}
	}

	private fun replaceRoles(
		userId: Long,
		roleCodes: Set<String>,
	) {
		val roleIds =
			roleCodes.map { code ->
				roleRepository.findByCode(code)
					?: createDefaultRoleIfKnown(code)
					?: throw OmsException(ErrorCode.INVALID_ROLE)
			}.map { requireNotNull(it.id) }

		userRoleRepository.deleteAllById_UserId(userId)
		userRoleRepository.saveAll(
			roleIds.map { roleId ->
				UserRoleEntity(UserRoleId(userId = userId, roleId = roleId))
			},
		)
	}

	private fun loadRoleCodes(userId: Long): Set<String> =
		userRoleRepository.findAllById_UserId(userId)
			.mapNotNull { roleRepository.findById(it.id.roleId).orElse(null)?.code }
			.toSet()

	private fun createDefaultRoleIfKnown(code: String): RoleEntity? {
		if (UserRole.entries.none { it.name == code }) {
			return null
		}
		return roleRepository.save(
			RoleEntity(
				code = code,
				name = code,
				description = "OMS $code role",
			),
		)
	}

	private fun UserEntity.toResponse(roleCodes: Set<String>): UserResponse =
		UserResponse(
			id = requireNotNull(id),
			loginId = loginId,
			name = name,
			email = email,
			userScopeType = userScopeType,
			tenantId = tenantId,
			clientId = clientId,
			status = status,
			roles = roleCodes,
			lastLoginAt = lastLoginAt,
		)
}
