package com.company.oms.master

import com.company.oms.auth.UserRepository
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.ClientMasterScopeSource
import com.company.oms.common.persistence.ClientMasterScopeStatus
import com.company.oms.common.persistence.MasterDataAddRequestStatus
import com.company.oms.common.persistence.MasterDataAddRequestType
import com.company.oms.common.persistence.MasterType
import com.company.oms.common.response.PageResponse
import org.springframework.context.annotation.Profile
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.math.BigDecimal
import java.time.LocalDateTime

@Service
@Profile("local")
class MasterDataAddRequestService(
	private val repository: MasterDataAddRequestRepository,
	private val userRepository: UserRepository,
	private val productMasterItemRepository: ProductMasterItemRepository,
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
	private val clientProductCodeMappingRepository: ClientProductCodeMappingRepository,
	private val clientStoreCodeMappingRepository: ClientStoreCodeMappingRepository,
	private val productScopeRepository: ClientProductMasterScopeRepository,
	private val storeRouteScopeRepository: ClientStoreRouteMasterScopeRepository,
	private val objectMapper: ObjectMapper,
) {
	@Transactional
	fun createRequest(
		tenantId: Long,
		clientId: Long,
		request: MasterDataAddRequestCreateRequest,
		actorId: Long?,
	): MasterDataAddRequestResponse {
		val title = request.title.trim().takeIf { it.isNotBlank() }
			?: throw invalidRequest("요청 제목을 입력해 주세요.")
		val normalizedFields = normalizeFields(request.requestFields)
		if (normalizedFields.isEmpty() && request.requestMemo.isNullOrBlank()) {
			throw invalidRequest("추가할 마스터 정보 또는 요청 메모를 입력해 주세요.")
		}

		val entity = repository.save(
			MasterDataAddRequestEntity(
				tenantId = tenantId,
				clientId = clientId,
				requestType = request.requestType,
				status = MasterDataAddRequestStatus.REQUESTED,
				title = title,
				requestPayloadJson = objectMapper.writeValueAsString(normalizedFields),
				requestMemo = request.requestMemo?.trim()?.takeIf { it.isNotBlank() },
				requestedBy = resolveActorId(actorId ?: request.requestedBy),
				requestedAt = LocalDateTime.now(),
			),
		)
		return entity.toResponse(objectMapper)
	}

	@Transactional(readOnly = true)
	fun listRequests(
		tenantId: Long,
		clientId: Long?,
		status: MasterDataAddRequestStatus?,
		requestType: MasterDataAddRequestType?,
		page: Int,
		size: Int,
	): PageResponse<MasterDataAddRequestResponse> {
		val pageable = PageRequest.of(
			page.coerceAtLeast(0),
			size.coerceIn(1, 200),
			Sort.by(Sort.Direction.DESC, "requestedAt").and(Sort.by(Sort.Direction.DESC, "id")),
		)
		val result = repository.findAll(
			requestSpec(tenantId, clientId, status, requestType),
			pageable,
		)
		return PageResponse(
			items = result.content.map { it.toResponse(objectMapper) },
			page = result.number,
			size = result.size,
			totalElements = result.totalElements,
			totalPages = result.totalPages,
		)
	}

	@Transactional(readOnly = true)
	fun getRequest(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
	): MasterDataAddRequestResponse =
		getRequestForScope(tenantId, clientId, requestId).toResponse(objectMapper)

	@Transactional
	fun approve(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
		review: MasterDataAddRequestReviewRequest?,
		actorId: Long?,
	): MasterDataAddRequestResponse =
		reviewRequest(
			tenantId = tenantId,
			clientId = clientId,
			requestId = requestId,
			nextStatus = MasterDataAddRequestStatus.APPROVED,
			comment = review?.comment?.trim()?.takeIf { it.isNotBlank() } ?: "마스터 추가 요청을 확인했습니다.",
			actorId = actorId ?: review?.actorId,
			review = review,
		)

	@Transactional
	fun markNeedsMoreInfo(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
		review: MasterDataAddRequestReviewRequest?,
		actorId: Long?,
	): MasterDataAddRequestResponse {
		val comment = review?.comment?.trim()?.takeIf { it.isNotBlank() }
			?: throw invalidRequest("보완 요청 사유를 입력해 주세요.")
		return reviewRequest(
			tenantId,
			clientId,
			requestId,
			MasterDataAddRequestStatus.NEEDS_MORE_INFO,
			comment,
			actorId ?: review.actorId,
			review,
		)
	}

	@Transactional
	fun markApplied(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
		review: MasterDataAddRequestReviewRequest?,
		actorId: Long?,
	): MasterDataAddRequestResponse {
		val entity = getRequestForScope(tenantId, clientId, requestId)
		if (entity.status != MasterDataAddRequestStatus.APPROVED) {
			throw invalidRequest("승인 상태의 마스터 추가 요청만 반영 완료 처리할 수 있습니다.")
		}

		val resolvedClientId = clientId ?: entity.clientId
		val requestedFields = entity.requestPayloadJson.toRequestFields(objectMapper)
		val overrideFields = normalizeFields(review?.requestFields.orEmpty())
		val mergedFields = requestedFields + overrideFields
		val appliedTarget =
			if (canApplyDirectly(entity.requestType, mergedFields)) {
				applyToMaster(
					entity = entity,
					clientId = resolvedClientId,
					fields = mergedFields,
					activeYn = review?.activeYn,
					actorId = actorId ?: review?.actorId,
					createClientScope = review?.createClientScope != false,
				)
			} else {
				null
			}

		entity.status = MasterDataAddRequestStatus.APPLIED
		entity.reviewedBy = resolveActorId(actorId ?: review?.actorId)
		entity.reviewedAt = LocalDateTime.now()
		entity.reviewComment = review?.comment?.trim()?.takeIf { it.isNotBlank() } ?: "마스터 반영을 완료했습니다."
		entity.appliedMasterType = appliedTarget?.first ?: review?.appliedMasterType ?: entity.appliedMasterType
		entity.appliedMasterItemId = appliedTarget?.second ?: review?.appliedMasterItemId ?: entity.appliedMasterItemId
		entity.requestPayloadJson = objectMapper.writeValueAsString(mergedFields)
		return repository.save(entity).toResponse(objectMapper)
	}

	@Transactional
	fun reject(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
		review: MasterDataAddRequestReviewRequest?,
		actorId: Long?,
	): MasterDataAddRequestResponse {
		val comment = review?.comment?.trim()?.takeIf { it.isNotBlank() }
			?: throw invalidRequest("반려 사유를 입력해 주세요.")
		return reviewRequest(
			tenantId,
			clientId,
			requestId,
			MasterDataAddRequestStatus.REJECTED,
			comment,
			actorId ?: review.actorId,
			review,
		)
	}

	private fun reviewRequest(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
		nextStatus: MasterDataAddRequestStatus,
		comment: String,
		actorId: Long?,
		review: MasterDataAddRequestReviewRequest?,
	): MasterDataAddRequestResponse {
		val entity = getRequestForScope(tenantId, clientId, requestId)
		if (entity.status != MasterDataAddRequestStatus.REQUESTED) {
			throw invalidRequest("요청 대기 상태의 마스터 추가 요청만 처리할 수 있습니다.")
		}
		entity.status = nextStatus
		entity.reviewedBy = resolveActorId(actorId)
		entity.reviewedAt = LocalDateTime.now()
		entity.reviewComment = comment
		if (nextStatus == MasterDataAddRequestStatus.APPROVED || nextStatus == MasterDataAddRequestStatus.APPLIED) {
			entity.appliedMasterType = review?.appliedMasterType
			entity.appliedMasterItemId = review?.appliedMasterItemId
		}
		return repository.save(entity).toResponse(objectMapper)
	}

	private fun applyToMaster(
		entity: MasterDataAddRequestEntity,
		clientId: Long,
		fields: Map<String, String>,
		activeYn: Boolean?,
		actorId: Long?,
		createClientScope: Boolean,
	): Pair<MasterType, Long> =
		when (entity.requestType) {
			MasterDataAddRequestType.PRODUCT -> {
				val product = upsertProduct(entity.tenantId, fields, activeYn)
				val productId = requireNotNull(product.id)
				if (createClientScope) {
					upsertProductScope(entity.tenantId, clientId, productId, actorId)
				}
				MasterType.PRODUCT to productId
			}
			MasterDataAddRequestType.STORE_ROUTE -> {
				val storeRoute = upsertStoreRoute(entity.tenantId, fields, activeYn)
				val storeRouteId = requireNotNull(storeRoute.id)
				if (createClientScope) {
					upsertStoreRouteScope(entity.tenantId, clientId, storeRouteId, actorId)
				}
				MasterType.STORE_ROUTE to storeRouteId
			}
			MasterDataAddRequestType.PRODUCT_CODE_MAPPING -> {
				val mapping = upsertProductCodeMapping(entity.tenantId, clientId, fields)
				val product = productMasterItemRepository.findByTenantIdAndEzadminCode(entity.tenantId, mapping.ezadminCode)
					?: throw invalidRequest("상품 마스터에 존재하지 않는 ezadmin_code입니다.")
				val productId = requireNotNull(product.id)
				if (createClientScope) {
					upsertProductScope(entity.tenantId, clientId, productId, actorId)
				}
				MasterType.PRODUCT to productId
			}
			MasterDataAddRequestType.STORE_CODE_MAPPING -> {
				val mapping = upsertStoreCodeMapping(entity.tenantId, clientId, fields)
				val storeRoute = storeRouteMasterItemRepository.findByTenantIdAndBaljugoCode(entity.tenantId, mapping.baljugoCode)
					?: throw invalidRequest("배송지/차량 마스터에 존재하지 않는 baljugo_code입니다.")
				val storeRouteId = requireNotNull(storeRoute.id)
				if (createClientScope) {
					upsertStoreRouteScope(entity.tenantId, clientId, storeRouteId, actorId)
				}
				MasterType.STORE_ROUTE to storeRouteId
			}
		}

	private fun upsertProduct(
		tenantId: Long,
		fields: Map<String, String>,
		activeYn: Boolean?,
	): ProductMasterItemEntity {
		val ezadminCode = requiredField(fields, "ezadminCode")
		val entity = productMasterItemRepository.findByTenantIdAndEzadminCode(tenantId, ezadminCode)
			?: ProductMasterItemEntity(
				tenantId = tenantId,
				ezadminCode = ezadminCode,
			)

		entity.productName = fields["productName"]?.trim()?.takeIf { it.isNotBlank() } ?: entity.productName
		entity.customerProductCode = fields["customerProductCode"]?.trim()?.takeIf { it.isNotBlank() }
		entity.boxQty = decimalField(fields, "boxQty")
		entity.outboundUnit = fields["outboundUnit"]?.trim()?.takeIf { it.isNotBlank() }
		entity.temperatureType = fields["temperatureType"]?.trim()?.takeIf { it.isNotBlank() }
		entity.cbm = decimalField(fields, "cbm")
		entity.activeYn = activeYn ?: booleanField(fields, "activeYn") ?: entity.activeYn
		entity.rawRowJson = objectMapper.writeValueAsString(fields)
		return productMasterItemRepository.saveAndFlush(entity)
	}

	private fun upsertStoreRoute(
		tenantId: Long,
		fields: Map<String, String>,
		activeYn: Boolean?,
	): StoreRouteMasterItemEntity {
		val baljugoCode = requiredField(fields, "baljugoCode")
		val entity = storeRouteMasterItemRepository.findByTenantIdAndBaljugoCode(tenantId, baljugoCode)
			?: StoreRouteMasterItemEntity(
				tenantId = tenantId,
				baljugoCode = baljugoCode,
			)

		entity.customerCode = fields["customerCode"]?.trim()?.takeIf { it.isNotBlank() }
		entity.brandName = fields["brandName"]?.trim()?.takeIf { it.isNotBlank() }
		entity.storeName = fields["storeName"]?.trim()?.takeIf { it.isNotBlank() } ?: entity.storeName
		entity.area = fields["area"]?.trim()?.takeIf { it.isNotBlank() }
		entity.deliveryDay = fields["deliveryDay"]?.trim()?.takeIf { it.isNotBlank() }
		entity.deliveryRound = fields["deliveryRound"]?.trim()?.takeIf { it.isNotBlank() }
		entity.vehicleName = fields["vehicleName"]?.trim()?.takeIf { it.isNotBlank() }
		entity.driverName = fields["driverName"]?.trim()?.takeIf { it.isNotBlank() }
		entity.address = fields["address"]?.trim()?.takeIf { it.isNotBlank() }
		entity.activeYn = activeYn ?: booleanField(fields, "activeYn") ?: entity.activeYn
		entity.rawRowJson = objectMapper.writeValueAsString(fields)
		return storeRouteMasterItemRepository.saveAndFlush(entity)
	}

	private fun upsertProductCodeMapping(
		tenantId: Long,
		clientId: Long,
		fields: Map<String, String>,
	): ClientProductCodeMappingEntity {
		val clientProductCode = requiredField(fields, "clientProductCode")
		val ezadminCode = requiredField(fields, "ezadminCode")
		productMasterItemRepository.findByTenantIdAndEzadminCode(tenantId, ezadminCode)
			?: throw invalidRequest("상품 마스터에 존재하지 않는 ezadmin_code입니다.")

		val entity = clientProductCodeMappingRepository.findByTenantIdAndClientIdAndClientProductCode(tenantId, clientId, clientProductCode)
			?: ClientProductCodeMappingEntity(
				tenantId = tenantId,
				clientId = clientId,
				clientProductCode = clientProductCode,
			)
		entity.ezadminCode = ezadminCode
		entity.activeYn = booleanField(fields, "activeYn") ?: true
		entity.memo = fields["memo"]?.trim()?.takeIf { it.isNotBlank() }
		return clientProductCodeMappingRepository.saveAndFlush(entity)
	}

	private fun upsertStoreCodeMapping(
		tenantId: Long,
		clientId: Long,
		fields: Map<String, String>,
	): ClientStoreCodeMappingEntity {
		val clientStoreCode = requiredField(fields, "clientStoreCode")
		val baljugoCode = requiredField(fields, "baljugoCode")
		storeRouteMasterItemRepository.findByTenantIdAndBaljugoCode(tenantId, baljugoCode)
			?: throw invalidRequest("배송지/차량 마스터에 존재하지 않는 baljugo_code입니다.")

		val entity = clientStoreCodeMappingRepository.findByTenantIdAndClientIdAndClientStoreCode(tenantId, clientId, clientStoreCode)
			?: ClientStoreCodeMappingEntity(
				tenantId = tenantId,
				clientId = clientId,
				clientStoreCode = clientStoreCode,
			)
		entity.baljugoCode = baljugoCode
		entity.activeYn = booleanField(fields, "activeYn") ?: true
		entity.memo = fields["memo"]?.trim()?.takeIf { it.isNotBlank() }
		return clientStoreCodeMappingRepository.saveAndFlush(entity)
	}

	private fun upsertProductScope(
		tenantId: Long,
		clientId: Long,
		productMasterItemId: Long,
		actorId: Long?,
	) {
		val scope = productScopeRepository.findByTenantIdAndClientIdAndProductMasterItemId(tenantId, clientId, productMasterItemId)
			?: ClientProductMasterScopeEntity(
				tenantId = tenantId,
				clientId = clientId,
				productMasterItemId = productMasterItemId,
				createdBy = resolveActorId(actorId),
			)
		scope.status = ClientMasterScopeStatus.ACTIVE
		scope.source = ClientMasterScopeSource.REQUEST_APPROVED
		productScopeRepository.save(scope)
	}

	private fun upsertStoreRouteScope(
		tenantId: Long,
		clientId: Long,
		storeRouteMasterItemId: Long,
		actorId: Long?,
	) {
		val scope = storeRouteScopeRepository.findByTenantIdAndClientIdAndStoreRouteMasterItemId(tenantId, clientId, storeRouteMasterItemId)
			?: ClientStoreRouteMasterScopeEntity(
				tenantId = tenantId,
				clientId = clientId,
				storeRouteMasterItemId = storeRouteMasterItemId,
				createdBy = resolveActorId(actorId),
			)
		scope.status = ClientMasterScopeStatus.ACTIVE
		scope.source = ClientMasterScopeSource.REQUEST_APPROVED
		storeRouteScopeRepository.save(scope)
	}

	private fun getRequestForScope(
		tenantId: Long,
		clientId: Long?,
		requestId: Long,
	): MasterDataAddRequestEntity =
		repository.findById(requestId)
			.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
			.orElseThrow {
				OmsException(
					ErrorCode.NOT_FOUND,
					message = "마스터 추가 요청을 찾을 수 없습니다.",
					status = HttpStatus.NOT_FOUND,
				)
			}

	private fun resolveActorId(actorId: Long?): Long? =
		actorId?.takeIf { userRepository.existsById(it) }

	private fun invalidRequest(message: String): OmsException =
		OmsException(ErrorCode.INVALID_REQUEST, message = message, status = HttpStatus.BAD_REQUEST)
}

private fun requestSpec(
	tenantId: Long,
	clientId: Long?,
	status: MasterDataAddRequestStatus?,
	requestType: MasterDataAddRequestType?,
): Specification<MasterDataAddRequestEntity> =
	Specification { root, _, criteriaBuilder ->
		val predicates = mutableListOf(criteriaBuilder.equal(root.get<Long>("tenantId"), tenantId))
		if (clientId != null) {
			predicates += criteriaBuilder.equal(root.get<Long>("clientId"), clientId)
		}
		if (status != null) {
			predicates += criteriaBuilder.equal(root.get<MasterDataAddRequestStatus>("status"), status)
		}
		if (requestType != null) {
			predicates += criteriaBuilder.equal(root.get<MasterDataAddRequestType>("requestType"), requestType)
		}
		criteriaBuilder.and(*predicates.toTypedArray())
	}

private fun MasterDataAddRequestEntity.toResponse(objectMapper: ObjectMapper): MasterDataAddRequestResponse =
	MasterDataAddRequestResponse(
		id = id ?: 0,
		tenantId = tenantId,
		clientId = clientId,
		requestType = requestType,
		status = status,
		title = title,
		requestFields = requestPayloadJson.toRequestFields(objectMapper),
		requestMemo = requestMemo,
		requestedBy = requestedBy,
		requestedAt = requestedAt,
		reviewedBy = reviewedBy,
		reviewedAt = reviewedAt,
		reviewComment = reviewComment,
		appliedMasterType = appliedMasterType,
		appliedMasterItemId = appliedMasterItemId,
	)

@Suppress("UNCHECKED_CAST")
private fun String?.toRequestFields(objectMapper: ObjectMapper): Map<String, String> {
	if (this.isNullOrBlank()) return emptyMap()
	val raw = objectMapper.readValue(this, Map::class.java) as Map<Any?, Any?>
	return raw.mapNotNull { (key, value) ->
		val normalizedKey = key?.toString()?.trim()?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
		normalizedKey to (value?.toString() ?: "")
	}.toMap()
}

private fun normalizeFields(fields: Map<String, String>): Map<String, String> =
	fields.mapNotNull { (key, value) ->
		val normalizedKey = key.trim().takeIf { it.isNotBlank() } ?: return@mapNotNull null
		normalizedKey to value.trim()
	}.toMap()

private fun canApplyDirectly(
	requestType: MasterDataAddRequestType,
	fields: Map<String, String>,
): Boolean {
	val normalized = normalizeFields(fields)
	return when (requestType) {
		MasterDataAddRequestType.PRODUCT -> normalized["ezadminCode"].isNullOrBlank().not()
		MasterDataAddRequestType.STORE_ROUTE -> normalized["baljugoCode"].isNullOrBlank().not()
		MasterDataAddRequestType.PRODUCT_CODE_MAPPING ->
			normalized["clientProductCode"].isNullOrBlank().not() && normalized["ezadminCode"].isNullOrBlank().not()
		MasterDataAddRequestType.STORE_CODE_MAPPING ->
			normalized["clientStoreCode"].isNullOrBlank().not() && normalized["baljugoCode"].isNullOrBlank().not()
	}
}

private fun requiredField(fields: Map<String, String>, key: String): String =
	fields[key]?.trim()?.takeIf { it.isNotBlank() }
		?: throw OmsException(
			ErrorCode.INVALID_REQUEST,
			message = "$key 값은 필수입니다.",
			status = HttpStatus.BAD_REQUEST,
		)

private fun decimalField(fields: Map<String, String>, key: String): BigDecimal? {
	val raw = fields[key]?.trim()?.takeIf { it.isNotBlank() } ?: return null
	return raw.toBigDecimalOrNull()
		?: throw OmsException(
			ErrorCode.INVALID_REQUEST,
			message = "$key 값은 숫자여야 합니다.",
			status = HttpStatus.BAD_REQUEST,
		)
}

private fun booleanField(fields: Map<String, String>, key: String): Boolean? =
	when (fields[key]?.trim()?.uppercase()) {
		null, "" -> null
		"Y", "YES", "TRUE", "1", "ACTIVE", "운영", "사용" -> true
		"N", "NO", "FALSE", "0", "INACTIVE", "중지", "미사용" -> false
		else -> throw OmsException(
			ErrorCode.INVALID_REQUEST,
			message = "$key 값은 Y/N 또는 true/false여야 합니다.",
			status = HttpStatus.BAD_REQUEST,
		)
	}
