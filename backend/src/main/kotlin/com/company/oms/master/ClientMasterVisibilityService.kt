package com.company.oms.master

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.ClientMasterScopeStatus
import com.company.oms.common.persistence.ClientProductMasterVisibilityMode
import com.company.oms.common.persistence.ClientStoreRouteMasterVisibilityMode
import com.company.oms.common.response.PageResponse
import com.company.oms.common.response.toPageResponse
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Profile("local")
class ClientMasterVisibilityService(
	private val settingRepository: ClientMasterVisibilitySettingRepository,
	private val productScopeRepository: ClientProductMasterScopeRepository,
	private val storeRouteScopeRepository: ClientStoreRouteMasterScopeRepository,
	private val productMasterItemRepository: ProductMasterItemRepository,
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
) {

	@Transactional(readOnly = true)
	fun getSetting(
		tenantId: Long,
		clientId: Long,
	): ClientMasterVisibilitySettingResponse =
		settingRepository.findByTenantIdAndClientId(tenantId, clientId)
			?.toResponse()
			?: ClientMasterVisibilitySettingResponse(
				tenantId = tenantId,
				clientId = clientId,
				productVisibilityMode = ClientProductMasterVisibilityMode.SCOPED_ONLY,
				storeRouteVisibilityMode = ClientStoreRouteMasterVisibilityMode.SCOPED_ONLY,
				showPriceFieldsYn = false,
				showSupplierFieldsYn = false,
				showStoreRouteInternalFieldsYn = false,
				updatedBy = null,
				updatedAt = null,
			)

	@Transactional
	fun updateSetting(
		request: ClientMasterVisibilitySettingRequest,
		updatedBy: Long?,
	): ClientMasterVisibilitySettingResponse {
		val setting =
			settingRepository.findByTenantIdAndClientId(request.tenantId, request.clientId)
				?: ClientMasterVisibilitySettingEntity(
					tenantId = request.tenantId,
					clientId = request.clientId,
				)

		setting.productVisibilityMode = request.productVisibilityMode
		setting.storeRouteVisibilityMode = request.storeRouteVisibilityMode
		setting.showPriceFieldsYn = request.showPriceFieldsYn
		setting.showSupplierFieldsYn = request.showSupplierFieldsYn
		setting.showStoreRouteInternalFieldsYn = request.showStoreRouteInternalFieldsYn
		setting.updatedBy = updatedBy

		return settingRepository.save(setting).toResponse()
	}

	@Transactional
	fun upsertProductScope(
		request: ClientProductMasterScopeUpsertRequest,
		createdBy: Long?,
	): ClientMasterScopeResponse {
		val product = productMasterItemRepository.findById(request.productMasterItemId)
			.orElseThrow { notFound("Product master item was not found.") }
		if (product.tenantId != request.tenantId) {
			throw notFound("Product master item was not found.")
		}

		val scope =
			productScopeRepository.findByTenantIdAndClientIdAndProductMasterItemId(
				tenantId = request.tenantId,
				clientId = request.clientId,
				productMasterItemId = request.productMasterItemId,
			) ?: ClientProductMasterScopeEntity(
				tenantId = request.tenantId,
				clientId = request.clientId,
				productMasterItemId = request.productMasterItemId,
				createdBy = createdBy,
			)

		scope.status = request.activeYn.toScopeStatus()
		scope.source = request.source

		return productScopeRepository.save(scope).toResponse()
	}

	@Transactional
	fun upsertStoreRouteScope(
		request: ClientStoreRouteMasterScopeUpsertRequest,
		createdBy: Long?,
	): ClientMasterScopeResponse {
		val storeRoute = storeRouteMasterItemRepository.findById(request.storeRouteMasterItemId)
			.orElseThrow { notFound("Store route master item was not found.") }
		if (storeRoute.tenantId != request.tenantId) {
			throw notFound("Store route master item was not found.")
		}

		val scope =
			storeRouteScopeRepository.findByTenantIdAndClientIdAndStoreRouteMasterItemId(
				tenantId = request.tenantId,
				clientId = request.clientId,
				storeRouteMasterItemId = request.storeRouteMasterItemId,
			) ?: ClientStoreRouteMasterScopeEntity(
				tenantId = request.tenantId,
				clientId = request.clientId,
				storeRouteMasterItemId = request.storeRouteMasterItemId,
				createdBy = createdBy,
			)

		scope.status = request.activeYn.toScopeStatus()
		scope.source = request.source

		return storeRouteScopeRepository.save(scope).toResponse()
	}

	@Transactional(readOnly = true)
	fun listProductScopes(
		tenantId: Long,
		clientId: Long,
		status: ClientMasterScopeStatus?,
		ezadminCode: String?,
		productName: String?,
		page: Int,
		size: Int,
	): PageResponse<ClientProductMasterScopeItemResponse> {
		val scopes =
			(status?.let {
				productScopeRepository.findAllByTenantIdAndClientIdAndStatus(tenantId, clientId, it)
			} ?: productScopeRepository.findAllByTenantIdAndClientId(tenantId, clientId))
				.sortedByDescending { it.updatedAt ?: it.createdAt }

		val productById =
			productMasterItemRepository.findAllById(scopes.map { it.productMasterItemId })
				.associateBy { it.id ?: 0 }

		return scopes
			.map { scope ->
				val product = productById[scope.productMasterItemId]
				scope.toItemResponse(product)
			}
			.filter {
				ezadminCode.isNullOrBlank() ||
					it.product?.ezadminCode?.contains(ezadminCode.trim(), ignoreCase = true) == true
			}
			.filter {
				productName.isNullOrBlank() ||
					it.product?.productName?.contains(productName.trim(), ignoreCase = true) == true
			}
			.toPageResponse(page, size)
	}

	@Transactional(readOnly = true)
	fun listStoreRouteScopes(
		tenantId: Long,
		clientId: Long,
		status: ClientMasterScopeStatus?,
		baljugoCode: String?,
		storeName: String?,
		page: Int,
		size: Int,
	): PageResponse<ClientStoreRouteMasterScopeItemResponse> {
		val scopes =
			(status?.let {
				storeRouteScopeRepository.findAllByTenantIdAndClientIdAndStatus(tenantId, clientId, it)
			} ?: storeRouteScopeRepository.findAllByTenantIdAndClientId(tenantId, clientId))
				.sortedByDescending { it.updatedAt ?: it.createdAt }

		val storeRouteById =
			storeRouteMasterItemRepository.findAllById(scopes.map { it.storeRouteMasterItemId })
				.associateBy { it.id ?: 0 }

		return scopes
			.map { scope ->
				val storeRoute = storeRouteById[scope.storeRouteMasterItemId]
				scope.toItemResponse(storeRoute)
			}
			.filter {
				baljugoCode.isNullOrBlank() ||
					it.storeRoute?.baljugoCode?.contains(baljugoCode.trim(), ignoreCase = true) == true
			}
			.filter {
				storeName.isNullOrBlank() ||
					it.storeRoute?.storeName?.contains(storeName.trim(), ignoreCase = true) == true
			}
			.toPageResponse(page, size)
	}

	@Transactional(readOnly = true)
	fun listClientProducts(
		tenantId: Long,
		clientId: Long,
		ezadminCode: String?,
		productName: String?,
		activeYn: Boolean?,
		page: Int,
		size: Int,
	): PageResponse<ClientPublicProductMasterItemResponse> {
		val setting = getSetting(tenantId, clientId)
		val effectiveActiveYn = activeYn ?: true
		val products =
			if (setting.productVisibilityMode == ClientProductMasterVisibilityMode.ALL_PRODUCTS) {
				productMasterItemRepository.findAllByTenantIdAndActiveYn(tenantId, effectiveActiveYn)
			} else {
				val scopedProductIds =
					productScopeRepository.findAllByTenantIdAndClientIdAndStatus(
						tenantId = tenantId,
						clientId = clientId,
						status = ClientMasterScopeStatus.ACTIVE,
					).map { it.productMasterItemId }

				if (scopedProductIds.isEmpty()) {
					emptyList()
				} else {
					productMasterItemRepository.findAllById(scopedProductIds)
						.filter { it.tenantId == tenantId && it.activeYn == effectiveActiveYn }
				}
			}

		return products
			.filter { ezadminCode.isNullOrBlank() || it.ezadminCode.contains(ezadminCode.trim(), ignoreCase = true) }
			.filter { productName.isNullOrBlank() || it.productName?.contains(productName.trim(), ignoreCase = true) == true }
			.sortedBy { it.ezadminCode }
			.map { it.toClientPublicResponse() }
			.toPageResponse(page, size)
	}

	@Transactional(readOnly = true)
	fun listClientStoreRoutes(
		tenantId: Long,
		clientId: Long,
		baljugoCode: String?,
		customerCode: String?,
		brandName: String?,
		storeName: String?,
		area: String?,
		deliveryRound: String?,
		activeYn: Boolean?,
		page: Int,
		size: Int,
	): PageResponse<ClientPublicStoreRouteMasterItemResponse> {
		val setting = getSetting(tenantId, clientId)
		val effectiveActiveYn = activeYn ?: true
		val storeRoutes =
			if (setting.storeRouteVisibilityMode == ClientStoreRouteMasterVisibilityMode.ALL_STORE_ROUTES) {
				storeRouteMasterItemRepository.findAllByTenantIdAndActiveYn(tenantId, effectiveActiveYn)
			} else {
				val scopedStoreRouteIds =
					storeRouteScopeRepository.findAllByTenantIdAndClientIdAndStatus(
						tenantId = tenantId,
						clientId = clientId,
						status = ClientMasterScopeStatus.ACTIVE,
					).map { it.storeRouteMasterItemId }

				if (scopedStoreRouteIds.isEmpty()) {
					emptyList()
				} else {
					storeRouteMasterItemRepository.findAllById(scopedStoreRouteIds)
						.filter { it.tenantId == tenantId && it.activeYn == effectiveActiveYn }
				}
			}

		return storeRoutes
			.filter { baljugoCode.isNullOrBlank() || it.baljugoCode.contains(baljugoCode.trim(), ignoreCase = true) }
			.filter { customerCode.isNullOrBlank() || it.customerCode?.contains(customerCode.trim(), ignoreCase = true) == true }
			.filter { brandName.isNullOrBlank() || it.brandName?.contains(brandName.trim(), ignoreCase = true) == true }
			.filter { storeName.isNullOrBlank() || it.storeName?.contains(storeName.trim(), ignoreCase = true) == true }
			.filter { area.isNullOrBlank() || it.area?.contains(area.trim(), ignoreCase = true) == true }
			.filter { deliveryRound.isNullOrBlank() || it.deliveryRound?.contains(deliveryRound.trim(), ignoreCase = true) == true }
			.sortedBy { it.baljugoCode }
			.map { it.toClientPublicResponse(setting.showStoreRouteInternalFieldsYn) }
			.toPageResponse(page, size)
	}

	private fun notFound(message: String): OmsException =
		OmsException(
			errorCode = ErrorCode.NOT_FOUND,
			message = message,
			status = HttpStatus.NOT_FOUND,
		)
}

private fun Boolean.toScopeStatus(): ClientMasterScopeStatus =
	if (this) ClientMasterScopeStatus.ACTIVE else ClientMasterScopeStatus.INACTIVE

private fun ClientMasterVisibilitySettingEntity.toResponse(): ClientMasterVisibilitySettingResponse =
	ClientMasterVisibilitySettingResponse(
		tenantId = tenantId,
		clientId = clientId,
		productVisibilityMode = productVisibilityMode,
		storeRouteVisibilityMode = storeRouteVisibilityMode,
		showPriceFieldsYn = showPriceFieldsYn,
		showSupplierFieldsYn = showSupplierFieldsYn,
		showStoreRouteInternalFieldsYn = showStoreRouteInternalFieldsYn,
		updatedBy = updatedBy,
		updatedAt = updatedAt,
	)

private fun ClientProductMasterScopeEntity.toResponse(): ClientMasterScopeResponse =
	ClientMasterScopeResponse(
		id = id ?: 0,
		tenantId = tenantId,
		clientId = clientId,
		masterItemId = productMasterItemId,
		status = status,
		source = source,
	)

private fun ClientStoreRouteMasterScopeEntity.toResponse(): ClientMasterScopeResponse =
	ClientMasterScopeResponse(
		id = id ?: 0,
		tenantId = tenantId,
		clientId = clientId,
		masterItemId = storeRouteMasterItemId,
		status = status,
		source = source,
	)

private fun ClientProductMasterScopeEntity.toItemResponse(
	product: ProductMasterItemEntity?,
): ClientProductMasterScopeItemResponse =
	ClientProductMasterScopeItemResponse(
		id = id ?: 0,
		tenantId = tenantId,
		clientId = clientId,
		productMasterItemId = productMasterItemId,
		status = status,
		source = source,
		product = product?.toClientPublicResponse(),
	)

private fun ClientStoreRouteMasterScopeEntity.toItemResponse(
	storeRoute: StoreRouteMasterItemEntity?,
): ClientStoreRouteMasterScopeItemResponse =
	ClientStoreRouteMasterScopeItemResponse(
		id = id ?: 0,
		tenantId = tenantId,
		clientId = clientId,
		storeRouteMasterItemId = storeRouteMasterItemId,
		status = status,
		source = source,
		storeRoute = storeRoute?.toClientPublicResponse(showInternalFields = true),
	)

private fun ProductMasterItemEntity.toClientPublicResponse(): ClientPublicProductMasterItemResponse =
	ClientPublicProductMasterItemResponse(
		id = id ?: 0,
		ezadminCode = ezadminCode,
		productName = productName,
		customerProductCode = customerProductCode,
		boxQty = boxQty,
		outboundUnit = outboundUnit,
		temperatureType = temperatureType,
		cbm = cbm,
		activeYn = activeYn,
	)

private fun StoreRouteMasterItemEntity.toClientPublicResponse(
	showInternalFields: Boolean,
): ClientPublicStoreRouteMasterItemResponse =
	ClientPublicStoreRouteMasterItemResponse(
		id = id ?: 0,
		baljugoCode = baljugoCode,
		customerCode = customerCode,
		brandName = brandName,
		storeName = storeName,
		area = area,
		deliveryDay = deliveryDay,
		deliveryRound = deliveryRound,
		vehicleName = vehicleName.takeIf { showInternalFields },
		driverName = driverName.takeIf { showInternalFields },
		address = address.takeIf { showInternalFields },
		activeYn = activeYn,
		internalFieldsVisible = showInternalFields,
	)
