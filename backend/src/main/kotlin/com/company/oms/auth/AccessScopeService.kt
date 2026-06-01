package com.company.oms.auth

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.UserScopeType
import com.company.oms.common.scope.ClientRepository
import com.company.oms.common.scope.TenantRepository
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service

data class ResolvedAccessScope(
	val tenantId: Long,
	val clientId: Long?,
	val isAllClients: Boolean,
	val supportMode: Boolean,
	val userScopeType: UserScopeType,
)

@Service
@Profile("local")
class AccessScopeService(
	private val authGuard: AuthGuard,
	private val tenantRepository: TenantRepository,
	private val clientRepository: ClientRepository,
) {

	fun requireUser(): CurrentUser =
		authGuard.requireUser()

	fun requireAnyRole(vararg roles: UserRole): CurrentUser =
		authGuard.requireAnyRole(*roles)

	fun requireSystemAdmin(): CurrentUser {
		val currentUser = authGuard.requireAnyRole(UserRole.SYSTEM_ADMIN)
		if (currentUser.userScopeType != UserScopeType.SYSTEM) {
			throwForbidden("SYSTEM_ADMIN role must be used with SYSTEM scope.")
		}
		return currentUser
	}

	fun requireTenantAdmin(): CurrentUser {
		val currentUser = authGuard.requireAnyRole(UserRole.ADMIN)
		if (currentUser.userScopeType != UserScopeType.TENANT) {
			throwForbidden("TENANT admin access requires TENANT scope.")
		}
		return currentUser
	}

	fun requireTenantOperator(): CurrentUser {
		val currentUser = authGuard.requireAnyRole(UserRole.ADMIN, UserRole.OPERATOR)
		if (currentUser.userScopeType != UserScopeType.TENANT) {
			throwForbidden("Tenant operation requires TENANT scope.")
		}
		return currentUser
	}

	fun resolveTenantId(requestTenantId: Long?): Long {
		val currentUser = authGuard.requireUser()
		return resolveTenantId(currentUser, requestTenantId)
	}

	fun resolveClientScope(
		requestTenantId: Long?,
		requestClientId: Long?,
		allowAllClients: Boolean = true,
	): ResolvedAccessScope {
		val currentUser = authGuard.requireUser()
		val userScopeType = requireUserScopeType(currentUser)
		val tenantId = resolveTenantId(currentUser, requestTenantId)

		return when (userScopeType) {
			UserScopeType.SYSTEM,
			UserScopeType.TENANT -> {
				if (requestClientId == null) {
					if (!allowAllClients) {
						throwInvalidRequest("clientId is required for this operation.")
					}
					ResolvedAccessScope(
						tenantId = tenantId,
						clientId = null,
						isAllClients = true,
						supportMode = userScopeType == UserScopeType.SYSTEM,
						userScopeType = userScopeType,
					)
				} else {
					validateClientBelongsToTenant(tenantId, requestClientId)
					ResolvedAccessScope(
						tenantId = tenantId,
						clientId = requestClientId,
						isAllClients = false,
						supportMode = userScopeType == UserScopeType.SYSTEM,
						userScopeType = userScopeType,
					)
				}
			}

			UserScopeType.CLIENT -> {
				val currentClientId = currentUser.clientId ?: throwInvalidUserScope("CLIENT scope requires clientId.")
				if (requestClientId != null && requestClientId != currentClientId) {
					throwForbidden("CLIENT users can only access their own client data.")
				}
				validateClientBelongsToTenant(tenantId, currentClientId)
				ResolvedAccessScope(
					tenantId = tenantId,
					clientId = currentClientId,
					isAllClients = false,
					supportMode = false,
					userScopeType = userScopeType,
				)
			}
		}
	}

	fun resolveRequiredClientScope(
		requestTenantId: Long?,
		requestClientId: Long?,
	): ResolvedAccessScope =
		resolveClientScope(
			requestTenantId = requestTenantId,
			requestClientId = requestClientId,
			allowAllClients = false,
		)

	fun requireTenantAccess(tenantId: Long): Long =
		resolveTenantId(tenantId)

	fun requireClientAccess(
		tenantId: Long,
		clientId: Long,
	): ResolvedAccessScope =
		resolveRequiredClientScope(
			requestTenantId = tenantId,
			requestClientId = clientId,
		)

	private fun resolveTenantId(
		currentUser: CurrentUser,
		requestTenantId: Long?,
	): Long {
		val userScopeType = requireUserScopeType(currentUser)
		return when (userScopeType) {
			UserScopeType.SYSTEM -> {
				val tenantId = requestTenantId ?: throwInvalidRequest("tenantId is required for SYSTEM scope operations.")
				validateTenantExists(tenantId)
				tenantId
			}

			UserScopeType.TENANT,
			UserScopeType.CLIENT -> {
				val currentTenantId = currentUser.tenantId ?: throwInvalidUserScope("$userScopeType scope requires tenantId.")
				if (requestTenantId != null && requestTenantId != currentTenantId) {
					throwForbidden("$userScopeType users can only access their own tenant data.")
				}
				validateTenantExists(currentTenantId)
				currentTenantId
			}
		}
	}

	private fun validateTenantExists(tenantId: Long) {
		if (!tenantRepository.existsById(tenantId)) {
			throw OmsException(
				errorCode = ErrorCode.NOT_FOUND,
				message = "Tenant was not found.",
				status = HttpStatus.NOT_FOUND,
			)
		}
	}

	private fun validateClientBelongsToTenant(
		tenantId: Long,
		clientId: Long,
	) {
		val client =
			clientRepository.findById(clientId).orElseThrow {
				OmsException(
					errorCode = ErrorCode.CLIENT_NOT_FOUND,
					status = HttpStatus.NOT_FOUND,
				)
			}
		if (client.tenantId != tenantId) {
			throw OmsException(
				errorCode = ErrorCode.CLIENT_NOT_FOUND,
				message = "Client does not belong to the requested tenant.",
				status = HttpStatus.NOT_FOUND,
			)
		}
	}

	private fun requireUserScopeType(currentUser: CurrentUser): UserScopeType =
		currentUser.userScopeType ?: throwInvalidUserScope("User scope is required.")

	private fun throwInvalidRequest(message: String): Nothing =
		throw OmsException(
			errorCode = ErrorCode.INVALID_REQUEST,
			message = message,
			status = HttpStatus.BAD_REQUEST,
		)

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
}
