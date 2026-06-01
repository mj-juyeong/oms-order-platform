package com.company.oms.auth

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.UserScopeType
import com.company.oms.common.scope.ClientEntity
import com.company.oms.common.scope.ClientRepository
import com.company.oms.common.scope.TenantRepository
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue
import org.springframework.http.HttpStatus
import java.lang.reflect.Proxy
import java.util.Optional

class AccessScopeServiceTest {

	@Test
	fun tenantUserCanResolveOwnTenantAndAllClients() {
		val service = serviceFor(
			currentUser = CurrentUser(
				userId = 1,
				tenantId = 10,
				clientId = null,
				loginId = "tenant-admin",
				userScopeType = UserScopeType.TENANT,
				roles = setOf(UserRole.ADMIN),
			),
		)

		val scope = service.resolveClientScope(requestTenantId = null, requestClientId = null)

		assertEquals(10, scope.tenantId)
		assertEquals(null, scope.clientId)
		assertTrue(scope.isAllClients)
		assertFalse(scope.supportMode)
	}

	@Test
	fun tenantUserCannotResolveOtherTenant() {
		val service = serviceFor(
			currentUser = CurrentUser(
				userId = 1,
				tenantId = 10,
				clientId = null,
				loginId = "tenant-admin",
				userScopeType = UserScopeType.TENANT,
				roles = setOf(UserRole.ADMIN),
			),
		)

		val exception = assertFailsWith<OmsException> {
			service.resolveClientScope(requestTenantId = 20, requestClientId = null)
		}

		assertEquals(ErrorCode.FORBIDDEN, exception.errorCode)
		assertEquals(HttpStatus.FORBIDDEN, exception.status)
	}

	@Test
	fun clientUserIsForcedToOwnClientWhenRequestClientIsMissing() {
		val service = serviceFor(
			currentUser = CurrentUser(
				userId = 2,
				tenantId = 10,
				clientId = 100,
				loginId = "client-viewer",
				userScopeType = UserScopeType.CLIENT,
				roles = setOf(UserRole.VIEWER),
			),
			clients = listOf(client(id = 100, tenantId = 10)),
		)

		val scope = service.resolveClientScope(requestTenantId = 10, requestClientId = null)

		assertEquals(10, scope.tenantId)
		assertEquals(100, scope.clientId)
		assertFalse(scope.isAllClients)
	}

	@Test
	fun clientUserCannotResolveOtherClient() {
		val service = serviceFor(
			currentUser = CurrentUser(
				userId = 2,
				tenantId = 10,
				clientId = 100,
				loginId = "client-viewer",
				userScopeType = UserScopeType.CLIENT,
				roles = setOf(UserRole.VIEWER),
			),
			clients = listOf(client(id = 100, tenantId = 10), client(id = 200, tenantId = 10)),
		)

		val exception = assertFailsWith<OmsException> {
			service.resolveClientScope(requestTenantId = 10, requestClientId = 200)
		}

		assertEquals(ErrorCode.FORBIDDEN, exception.errorCode)
		assertEquals(HttpStatus.FORBIDDEN, exception.status)
	}

	@Test
	fun systemUserMustRequestTenantForOperationalScope() {
		val service = serviceFor(
			currentUser = CurrentUser(
				userId = 3,
				tenantId = null,
				clientId = null,
				loginId = "system-admin",
				userScopeType = UserScopeType.SYSTEM,
				roles = setOf(UserRole.SYSTEM_ADMIN),
			),
		)

		val exception = assertFailsWith<OmsException> {
			service.resolveClientScope(requestTenantId = null, requestClientId = null)
		}

		assertEquals(ErrorCode.INVALID_REQUEST, exception.errorCode)
		assertEquals(HttpStatus.BAD_REQUEST, exception.status)
	}

	@Test
	fun systemUserCanResolveRequestedTenantAsSupportMode() {
		val service = serviceFor(
			currentUser = CurrentUser(
				userId = 3,
				tenantId = null,
				clientId = null,
				loginId = "system-admin",
				userScopeType = UserScopeType.SYSTEM,
				roles = setOf(UserRole.SYSTEM_ADMIN),
			),
			clients = listOf(client(id = 100, tenantId = 10)),
		)

		val scope = service.resolveClientScope(requestTenantId = 10, requestClientId = 100)

		assertEquals(10, scope.tenantId)
		assertEquals(100, scope.clientId)
		assertTrue(scope.supportMode)
		assertFalse(scope.isAllClients)
	}

	private fun serviceFor(
		currentUser: CurrentUser,
		tenantIds: Set<Long> = setOf(10, 20),
		clients: List<ClientEntity> = emptyList(),
	): AccessScopeService {
		val authGuard = AuthGuard(object : AuthContext {
			override fun currentUser(): CurrentUser = currentUser
		})
		return AccessScopeService(
			authGuard = authGuard,
			tenantRepository = tenantRepository(tenantIds),
			clientRepository = clientRepository(clients),
		)
	}

	private fun tenantRepository(tenantIds: Set<Long>): TenantRepository =
		repositoryProxy(TenantRepository::class.java) { methodName, args ->
			when (methodName) {
				"existsById" -> args?.firstOrNull() in tenantIds
				else -> unsupported(methodName)
			}
		}

	private fun clientRepository(clients: List<ClientEntity>): ClientRepository {
		val clientsById = clients.associateBy { requireNotNull(it.id) }
		return repositoryProxy(ClientRepository::class.java) { methodName, args ->
			when (methodName) {
				"findById" -> Optional.ofNullable(clientsById[args?.firstOrNull()])
				else -> unsupported(methodName)
			}
		}
	}

	private fun client(
		id: Long,
		tenantId: Long,
	): ClientEntity =
		ClientEntity(
			tenantId = tenantId,
			code = "client-$id",
			name = "Client $id",
		).also { it.id = id }

	private fun unsupported(methodName: String): Nothing =
		throw UnsupportedOperationException("Unsupported repository method: $methodName")

	@Suppress("UNCHECKED_CAST")
	private fun <T> repositoryProxy(
		type: Class<T>,
		handler: (String, Array<Any?>?) -> Any?,
	): T =
		Proxy.newProxyInstance(type.classLoader, arrayOf(type)) { _, method, args ->
			when (method.name) {
				"toString" -> "${type.simpleName}Proxy"
				"hashCode" -> 0
				"equals" -> false
				else -> handler(method.name, args)
			}
		} as T
}
