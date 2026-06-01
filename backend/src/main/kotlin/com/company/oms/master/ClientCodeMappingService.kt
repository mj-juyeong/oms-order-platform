package com.company.oms.master

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.response.PageResponse
import com.company.oms.common.scope.ClientRepository
import com.company.oms.common.scope.TenantRepository
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import kotlin.math.ceil

@Service
@Profile("local")
class ClientCodeMappingService(
	private val tenantRepository: TenantRepository,
	private val clientRepository: ClientRepository,
	private val productMasterItemRepository: ProductMasterItemRepository,
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
	private val clientProductCodeMappingRepository: ClientProductCodeMappingRepository,
	private val clientStoreCodeMappingRepository: ClientStoreCodeMappingRepository,
) {

	@Transactional(readOnly = true)
	fun listProductMappings(
		tenantId: Long,
		clientId: Long,
		clientProductCode: String?,
		ezadminCode: String?,
		activeYn: Boolean?,
		page: Int,
		size: Int,
	): PageResponse<ClientProductCodeMappingResponse> {
		validateScope(tenantId, clientId)
		return clientProductCodeMappingRepository.findAllByTenantIdAndClientId(tenantId, clientId)
			.asSequence()
			.filter { clientProductCode.isNullOrBlank() || it.clientProductCode.contains(clientProductCode.trim(), ignoreCase = true) }
			.filter { ezadminCode.isNullOrBlank() || it.ezadminCode == ezadminCode.trim() }
			.filter { activeYn == null || it.activeYn == activeYn }
			.sortedBy { it.clientProductCode }
			.map { it.toResponse(productMasterItemRepository.findByTenantIdAndEzadminCode(tenantId, it.ezadminCode)) }
			.toList()
			.toPage(page, size)
	}

	@Transactional
	fun upsertProductMapping(request: ClientProductCodeMappingUpsertRequest): ClientProductCodeMappingResponse {
		validateScope(request.tenantId, request.clientId)
		val clientProductCode = request.clientProductCode.trim()
		val ezadminCode = request.ezadminCode.trim()
		if (clientProductCode.isBlank() || ezadminCode.isBlank()) {
			throw invalidRequest("고객사 품목코드와 상품 마스터 코드는 필수입니다.")
		}
		val product = productMasterItemRepository.findByTenantIdAndEzadminCode(request.tenantId, ezadminCode)
			?: throw invalidRequest("상품 마스터에 존재하지 않는 ezadmin_code입니다.")

		val mapping = clientProductCodeMappingRepository
			.findByTenantIdAndClientIdAndClientProductCode(request.tenantId, request.clientId, clientProductCode)
			?: ClientProductCodeMappingEntity(
				tenantId = request.tenantId,
				clientId = request.clientId,
				clientProductCode = clientProductCode,
			)
		mapping.ezadminCode = ezadminCode
		mapping.activeYn = request.activeYn
		mapping.memo = request.memo
		return clientProductCodeMappingRepository.saveAndFlush(mapping).toResponse(product)
	}

	@Transactional(readOnly = true)
	fun listStoreMappings(
		tenantId: Long,
		clientId: Long,
		clientStoreCode: String?,
		baljugoCode: String?,
		activeYn: Boolean?,
		page: Int,
		size: Int,
	): PageResponse<ClientStoreCodeMappingResponse> {
		validateScope(tenantId, clientId)
		return clientStoreCodeMappingRepository.findAllByTenantIdAndClientId(tenantId, clientId)
			.asSequence()
			.filter { clientStoreCode.isNullOrBlank() || it.clientStoreCode.contains(clientStoreCode.trim(), ignoreCase = true) }
			.filter { baljugoCode.isNullOrBlank() || it.baljugoCode == baljugoCode.trim() }
			.filter { activeYn == null || it.activeYn == activeYn }
			.sortedBy { it.clientStoreCode }
			.map { it.toResponse(storeRouteMasterItemRepository.findByTenantIdAndBaljugoCode(tenantId, it.baljugoCode)) }
			.toList()
			.toPage(page, size)
	}

	@Transactional
	fun upsertStoreMapping(request: ClientStoreCodeMappingUpsertRequest): ClientStoreCodeMappingResponse {
		validateScope(request.tenantId, request.clientId)
		val clientStoreCode = request.clientStoreCode.trim()
		val baljugoCode = request.baljugoCode.trim()
		if (clientStoreCode.isBlank() || baljugoCode.isBlank()) {
			throw invalidRequest("고객사 거래처코드와 배송지/차량 마스터 코드는 필수입니다.")
		}
		val storeRoute = storeRouteMasterItemRepository.findByTenantIdAndBaljugoCode(request.tenantId, baljugoCode)
			?: throw invalidRequest("배송지/차량 마스터에 존재하지 않는 baljugo_code입니다.")

		val mapping = clientStoreCodeMappingRepository
			.findByTenantIdAndClientIdAndClientStoreCode(request.tenantId, request.clientId, clientStoreCode)
			?: ClientStoreCodeMappingEntity(
				tenantId = request.tenantId,
				clientId = request.clientId,
				clientStoreCode = clientStoreCode,
			)
		mapping.baljugoCode = baljugoCode
		mapping.activeYn = request.activeYn
		mapping.memo = request.memo
		return clientStoreCodeMappingRepository.saveAndFlush(mapping).toResponse(storeRoute)
	}

	private fun validateScope(tenantId: Long, clientId: Long) {
		if (!tenantRepository.existsById(tenantId)) {
			throw OmsException(
				errorCode = ErrorCode.NOT_FOUND,
				message = "물류사를 찾을 수 없습니다.",
				status = HttpStatus.NOT_FOUND,
			)
		}
		val client = clientRepository.findById(clientId)
			.orElseThrow {
				OmsException(
					errorCode = ErrorCode.CLIENT_NOT_FOUND,
					status = HttpStatus.NOT_FOUND,
				)
			}
		if (client.tenantId != tenantId) {
			throw OmsException(
				errorCode = ErrorCode.CLIENT_NOT_FOUND,
				message = "해당 물류사의 고객사가 아닙니다.",
				status = HttpStatus.NOT_FOUND,
			)
		}
	}

	private fun invalidRequest(message: String): OmsException =
		OmsException(
			errorCode = ErrorCode.INVALID_REQUEST,
			message = message,
			status = HttpStatus.BAD_REQUEST,
		)
}

private fun ClientProductCodeMappingEntity.toResponse(product: ProductMasterItemEntity?): ClientProductCodeMappingResponse =
	ClientProductCodeMappingResponse(
		id = id ?: 0,
		tenantId = tenantId,
		clientId = clientId,
		clientProductCode = clientProductCode,
		ezadminCode = ezadminCode,
		productName = product?.productName,
		activeYn = activeYn,
		memo = memo,
	)

private fun ClientStoreCodeMappingEntity.toResponse(storeRoute: StoreRouteMasterItemEntity?): ClientStoreCodeMappingResponse =
	ClientStoreCodeMappingResponse(
		id = id ?: 0,
		tenantId = tenantId,
		clientId = clientId,
		clientStoreCode = clientStoreCode,
		baljugoCode = baljugoCode,
		storeName = storeRoute?.storeName,
		activeYn = activeYn,
		memo = memo,
	)

private fun <T> List<T>.toPage(page: Int, size: Int): PageResponse<T> {
	val safePage = page.coerceAtLeast(0)
	val safeSize = size.coerceIn(1, 200)
	val from = (safePage * safeSize).coerceAtMost(this.size)
	val to = (from + safeSize).coerceAtMost(this.size)

	return PageResponse(
		items = subList(from, to),
		page = safePage,
		size = safeSize,
		totalElements = this.size.toLong(),
		totalPages = if (isEmpty()) 0 else ceil(this.size.toDouble() / safeSize).toInt(),
	)
}
