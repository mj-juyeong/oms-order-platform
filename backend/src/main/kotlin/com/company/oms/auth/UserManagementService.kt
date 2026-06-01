package com.company.oms.auth

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.UserScopeType
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import com.company.oms.common.scope.ClientRepository
import com.company.oms.common.scope.TenantRepository
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Profile("local")
class UserManagementService(
	private val accessScopeService: AccessScopeService,
	private val userRepository: UserRepository,
	private val roleRepository: RoleRepository,
	private val userRoleRepository: UserRoleRepository,
	private val passwordEncoder: PasswordEncoder,
	private val tenantRepository: TenantRepository,
	private val clientRepository: ClientRepository,
) {

	@Transactional(readOnly = true)
	fun me(): CurrentUserResponse {
		val currentUser = accessScopeService.requireUser()
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
		val currentUser = requireUserManagementActor()
		val effectiveTenantId =
			if (currentUser.isSystemAdmin()) {
				if (clientId != null) {
					val requestedTenantId =
						tenantId ?: throw OmsException(
							errorCode = ErrorCode.INVALID_REQUEST,
							message = "tenantId is required when filtering users by clientId.",
							status = HttpStatus.BAD_REQUEST,
						)
					accessScopeService.requireClientAccess(requestedTenantId, clientId)
				}
				tenantId
			} else {
				val actorTenantId = currentUser.requireTenantId()
				if (tenantId != null && tenantId != actorTenantId) {
					throwForbidden("TENANT admins can only list users in their own tenant.")
				}
				if (userScopeType == UserScopeType.SYSTEM) {
					throwForbidden("TENANT admins cannot list SYSTEM users.")
				}
				if (clientId != null) {
					accessScopeService.requireClientAccess(actorTenantId, clientId)
				}
				actorTenantId
			}

		return userRepository.findAll()
			.asSequence()
			.filter { userScopeType == null || it.userScopeType == userScopeType }
			.filter { effectiveTenantId == null || it.tenantId == effectiveTenantId }
			.filter { currentUser.isSystemAdmin() || it.userScopeType != UserScopeType.SYSTEM }
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
		val currentUser = requireUserManagementActor()
		validateUserScope(request.userScopeType, request.tenantId, request.clientId)
		validateTargetUserManagementPolicy(
			currentUser = currentUser,
			targetScope = request.userScopeType,
			targetTenantId = request.tenantId,
			targetClientId = request.clientId,
			targetRoleCodes = request.roleCodes,
		)
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
		val currentUser = requireUserManagementActor()
		val user =
			userRepository.findById(userId).orElseThrow {
				OmsException(ErrorCode.USER_NOT_FOUND, status = HttpStatus.NOT_FOUND)
			}
		validateExistingUserManagementBoundary(currentUser, user)

		val nextScope = request.userScopeType ?: user.userScopeType
		val nextTenantId =
			when (nextScope) {
				UserScopeType.SYSTEM -> null
				UserScopeType.TENANT, UserScopeType.CLIENT -> request.tenantId ?: user.tenantId
			}
		val nextClientId =
			when (nextScope) {
				UserScopeType.SYSTEM, UserScopeType.TENANT -> null
				UserScopeType.CLIENT -> request.clientId ?: user.clientId
			}
		validateUserScope(nextScope, nextTenantId, nextClientId)
		val nextRoleCodes = request.roleCodes ?: loadRoleCodes(userId)
		validateTargetUserManagementPolicy(
			currentUser = currentUser,
			targetScope = nextScope,
			targetTenantId = nextTenantId,
			targetClientId = nextClientId,
			targetRoleCodes = nextRoleCodes,
		)

		request.name?.let { user.name = it }
		request.email?.let { user.email = it }
		user.userScopeType = nextScope
		user.tenantId = nextTenantId
		user.clientId = nextClientId
		request.status?.let { user.status = it }
		request.roleCodes?.let { replaceRoles(userId, it) }

		return UserMutationResponse(id = userId)
	}

	private fun requireUserManagementActor(): CurrentUser {
		val currentUser = accessScopeService.requireAnyRole(UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		if (currentUser.isSystemAdmin() || currentUser.isTenantAdmin()) {
			return currentUser
		}
		throwForbidden("User management requires SYSTEM_ADMIN or TENANT ADMIN access.")
	}

	private fun validateExistingUserManagementBoundary(
		currentUser: CurrentUser,
		user: UserEntity,
	) {
		if (currentUser.isSystemAdmin()) {
			return
		}
		if (user.userScopeType == UserScopeType.SYSTEM) {
			throwForbidden("TENANT admins cannot manage SYSTEM users.")
		}
		if (user.tenantId != currentUser.requireTenantId()) {
			throwForbidden("TENANT admins can only manage users in their own tenant.")
		}
	}

	private fun validateTargetUserManagementPolicy(
		currentUser: CurrentUser,
		targetScope: UserScopeType,
		targetTenantId: Long?,
		targetClientId: Long?,
		targetRoleCodes: Set<String>,
	) {
		val targetRoles = validateKnownRoles(targetRoleCodes)
		validateAllowedRoleCombination(targetScope, targetRoles)

		when {
			currentUser.isSystemAdmin() -> validateSystemAdminTargetScope(targetScope, targetTenantId, targetClientId)
			currentUser.isTenantAdmin() -> validateTenantAdminTargetScope(currentUser, targetScope, targetTenantId, targetClientId)
			else -> throwForbidden("User management requires SYSTEM_ADMIN or TENANT ADMIN access.")
		}
	}

	private fun validateSystemAdminTargetScope(
		targetScope: UserScopeType,
		targetTenantId: Long?,
		targetClientId: Long?,
	) {
		when (targetScope) {
			UserScopeType.SYSTEM -> Unit
			UserScopeType.TENANT -> accessScopeService.requireTenantAccess(
				targetTenantId ?: throwInvalidUserScope("TENANT user requires tenantId."),
			)
			UserScopeType.CLIENT -> accessScopeService.requireClientAccess(
				targetTenantId ?: throwInvalidUserScope("CLIENT user requires tenantId."),
				targetClientId ?: throwInvalidUserScope("CLIENT user requires clientId."),
			)
		}
	}

	private fun validateTenantAdminTargetScope(
		currentUser: CurrentUser,
		targetScope: UserScopeType,
		targetTenantId: Long?,
		targetClientId: Long?,
	) {
		if (targetScope == UserScopeType.SYSTEM) {
			throwForbidden("TENANT admins cannot manage SYSTEM users.")
		}
		val actorTenantId = currentUser.requireTenantId()
		if (targetTenantId != actorTenantId) {
			throwForbidden("TENANT admins can only manage users in their own tenant.")
		}
		when (targetScope) {
			UserScopeType.SYSTEM -> throwForbidden("TENANT admins cannot manage SYSTEM users.")
			UserScopeType.TENANT -> accessScopeService.requireTenantAccess(actorTenantId)
			UserScopeType.CLIENT -> accessScopeService.requireClientAccess(
				actorTenantId,
				targetClientId ?: throwInvalidUserScope("CLIENT user requires clientId."),
			)
		}
	}

	private fun validateKnownRoles(roleCodes: Set<String>): Set<UserRole> {
		if (roleCodes.isEmpty()) {
			throw OmsException(ErrorCode.INVALID_ROLE)
		}
		return roleCodes.map { code ->
			runCatching { UserRole.valueOf(code) }
				.getOrElse { throw OmsException(ErrorCode.INVALID_ROLE) }
		}.toSet()
	}

	private fun validateAllowedRoleCombination(
		targetScope: UserScopeType,
		targetRoles: Set<UserRole>,
	) {
		val valid =
			when (targetScope) {
				UserScopeType.SYSTEM -> targetRoles == setOf(UserRole.SYSTEM_ADMIN)
				UserScopeType.TENANT -> targetRoles.all { it in tenantUserRoles }
				UserScopeType.CLIENT -> targetRoles == setOf(UserRole.VIEWER)
			}
		if (!valid) {
			throwForbidden("Requested roles are not allowed for $targetScope users.")
		}
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
			tenantName = tenantId?.let { tenantRepository.findById(it).orElse(null)?.name },
			clientId = clientId,
			clientName = clientId?.let { clientRepository.findById(it).orElse(null)?.name },
			status = status,
			roles = roleCodes,
			lastLoginAt = lastLoginAt,
		)

	private fun CurrentUser.isSystemAdmin(): Boolean =
		userScopeType == UserScopeType.SYSTEM && roles.contains(UserRole.SYSTEM_ADMIN)

	private fun CurrentUser.isTenantAdmin(): Boolean =
		userScopeType == UserScopeType.TENANT && roles.contains(UserRole.ADMIN)

	private fun CurrentUser.requireTenantId(): Long =
		tenantId ?: throw OmsException(ErrorCode.INVALID_USER_SCOPE)

	private fun throwInvalidUserScope(message: String): Nothing =
		throw OmsException(
			errorCode = ErrorCode.INVALID_USER_SCOPE,
			message = message,
			status = HttpStatus.BAD_REQUEST,
		)

	private fun throwForbidden(message: String): Nothing =
		throw OmsException(
			errorCode = ErrorCode.FORBIDDEN,
			message = message,
			status = HttpStatus.FORBIDDEN,
		)

	companion object {
		private val tenantUserRoles = setOf(UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
	}
}
