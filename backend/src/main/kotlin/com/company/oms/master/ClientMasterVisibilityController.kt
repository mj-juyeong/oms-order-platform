package com.company.oms.master

import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
import com.company.oms.common.persistence.ClientMasterScopeStatus
import com.company.oms.common.response.PageResponse
import org.springframework.context.annotation.Profile
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/client-master-visibility")
@Profile("local")
class ClientMasterVisibilityController(
	private val accessScopeService: AccessScopeService,
	private val clientMasterVisibilityService: ClientMasterVisibilityService,
) {

	@GetMapping("/settings")
	fun getSetting(
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
	): ClientMasterVisibilitySettingResponse {
		accessScopeService.requireAnyRole(UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
		val scope = accessScopeService.resolveRequiredClientScope(tenantId, clientId)
		return clientMasterVisibilityService.getSetting(
			tenantId = scope.tenantId,
			clientId = requireNotNull(scope.clientId),
		)
	}

	@PutMapping("/settings")
	fun updateSetting(
		@RequestBody request: ClientMasterVisibilitySettingRequest,
	): ClientMasterVisibilitySettingResponse {
		val currentUser = accessScopeService.requireTenantAdmin()
		val scope = accessScopeService.requireClientAccess(request.tenantId, request.clientId)
		return clientMasterVisibilityService.updateSetting(
			request = request.copy(
				tenantId = scope.tenantId,
				clientId = requireNotNull(scope.clientId),
			),
			updatedBy = currentUser.userId,
		)
	}

	@PostMapping("/product-scopes")
	fun upsertProductScope(
		@RequestBody request: ClientProductMasterScopeUpsertRequest,
	): ClientMasterScopeResponse {
		val currentUser = accessScopeService.requireTenantAdmin()
		val scope = accessScopeService.requireClientAccess(request.tenantId, request.clientId)
		return clientMasterVisibilityService.upsertProductScope(
			request = request.copy(
				tenantId = scope.tenantId,
				clientId = requireNotNull(scope.clientId),
			),
			createdBy = currentUser.userId,
		)
	}

	@GetMapping("/product-scopes")
	fun listProductScopes(
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam(required = false) status: ClientMasterScopeStatus?,
		@RequestParam(required = false) ezadminCode: String?,
		@RequestParam(required = false) productName: String?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ClientProductMasterScopeItemResponse> {
		accessScopeService.requireTenantAdmin()
		val scope = accessScopeService.resolveRequiredClientScope(tenantId, clientId)
		return clientMasterVisibilityService.listProductScopes(
			tenantId = scope.tenantId,
			clientId = requireNotNull(scope.clientId),
			status = status,
			ezadminCode = ezadminCode,
			productName = productName,
			page = page,
			size = size,
		)
	}

	@PostMapping("/store-route-scopes")
	fun upsertStoreRouteScope(
		@RequestBody request: ClientStoreRouteMasterScopeUpsertRequest,
	): ClientMasterScopeResponse {
		val currentUser = accessScopeService.requireTenantAdmin()
		val scope = accessScopeService.requireClientAccess(request.tenantId, request.clientId)
		return clientMasterVisibilityService.upsertStoreRouteScope(
			request = request.copy(
				tenantId = scope.tenantId,
				clientId = requireNotNull(scope.clientId),
			),
			createdBy = currentUser.userId,
		)
	}

	@GetMapping("/store-route-scopes")
	fun listStoreRouteScopes(
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam(required = false) status: ClientMasterScopeStatus?,
		@RequestParam(required = false) baljugoCode: String?,
		@RequestParam(required = false) storeName: String?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ClientStoreRouteMasterScopeItemResponse> {
		accessScopeService.requireTenantAdmin()
		val scope = accessScopeService.resolveRequiredClientScope(tenantId, clientId)
		return clientMasterVisibilityService.listStoreRouteScopes(
			tenantId = scope.tenantId,
			clientId = requireNotNull(scope.clientId),
			status = status,
			baljugoCode = baljugoCode,
			storeName = storeName,
			page = page,
			size = size,
		)
	}
}

@RestController
@RequestMapping("/api/v1/client-masters")
@Profile("local")
class ClientPublicMasterController(
	private val accessScopeService: AccessScopeService,
	private val clientMasterVisibilityService: ClientMasterVisibilityService,
) {

	@GetMapping("/products")
	fun listProducts(
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam(required = false) ezadminCode: String?,
		@RequestParam(required = false) productName: String?,
		@RequestParam(required = false) activeYn: Boolean?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ClientPublicProductMasterItemResponse> {
		accessScopeService.requireAnyRole(UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
		val scope = accessScopeService.resolveRequiredClientScope(tenantId, clientId)
		return clientMasterVisibilityService.listClientProducts(
			tenantId = scope.tenantId,
			clientId = requireNotNull(scope.clientId),
			ezadminCode = ezadminCode,
			productName = productName,
			activeYn = activeYn,
			page = page,
			size = size,
		)
	}

	@GetMapping("/store-routes")
	fun listStoreRoutes(
		@RequestParam(required = false) tenantId: Long?,
		@RequestParam(required = false) clientId: Long?,
		@RequestParam(required = false) baljugoCode: String?,
		@RequestParam(required = false) customerCode: String?,
		@RequestParam(required = false) brandName: String?,
		@RequestParam(required = false) storeName: String?,
		@RequestParam(required = false) area: String?,
		@RequestParam(required = false) deliveryRound: String?,
		@RequestParam(required = false) activeYn: Boolean?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ClientPublicStoreRouteMasterItemResponse> {
		accessScopeService.requireAnyRole(UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
		val scope = accessScopeService.resolveRequiredClientScope(tenantId, clientId)
		return clientMasterVisibilityService.listClientStoreRoutes(
			tenantId = scope.tenantId,
			clientId = requireNotNull(scope.clientId),
			baljugoCode = baljugoCode,
			customerCode = customerCode,
			brandName = brandName,
			storeName = storeName,
			area = area,
			deliveryRound = deliveryRound,
			activeYn = activeYn,
			page = page,
			size = size,
		)
	}
}
