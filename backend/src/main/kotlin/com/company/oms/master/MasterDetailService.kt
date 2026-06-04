package com.company.oms.master

import com.company.oms.batch.UploadBatchEntity
import com.company.oms.batch.UploadBatchRepository
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.ClientMasterScopeStatus
import com.company.oms.label.LabelLineEntity
import com.company.oms.label.LabelLineRepository
import com.company.oms.order.OrderLineEntity
import com.company.oms.order.OrderLineRepository
import com.company.oms.pl.PlLineEntity
import com.company.oms.pl.PlLineRepository
import com.company.oms.scan.ScanLineEntity
import com.company.oms.scan.ScanLineRepository
import com.company.oms.validation.ValidationErrorEntity
import com.company.oms.validation.ValidationErrorRepository
import org.springframework.context.annotation.Profile
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Profile("local")
class MasterDetailService(
	private val productMasterItemRepository: ProductMasterItemRepository,
	private val storeRouteMasterItemRepository: StoreRouteMasterItemRepository,
	private val masterUploadBatchRepository: MasterUploadBatchRepository,
	private val uploadBatchRepository: UploadBatchRepository,
	private val orderLineRepository: OrderLineRepository,
	private val scanLineRepository: ScanLineRepository,
	private val plLineRepository: PlLineRepository,
	private val labelLineRepository: LabelLineRepository,
	private val validationErrorRepository: ValidationErrorRepository,
	private val productScopeRepository: ClientProductMasterScopeRepository,
	private val storeRouteScopeRepository: ClientStoreRouteMasterScopeRepository,
) {
	private val recentPage = PageRequest.of(
		0,
		20,
		Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")),
	)

	@Transactional(readOnly = true)
	fun getProductDetail(
		tenantId: Long,
		productId: Long,
		clientId: Long? = null,
	): ProductMasterDetailResponse {
		val product = productMasterItemRepository.findById(productId)
			.filter { it.tenantId == tenantId }
			.orElseThrow { notFound("상품 마스터를 찾을 수 없습니다.") }
		val code = product.ezadminCode.trim()
		val lastUpload = product.lastMasterUploadBatchId?.let { findMasterUpload(tenantId, it) }
		val orderSpec = productOrderSpec(tenantId, clientId, code)
		val scanSpec = productScanSpec(tenantId, clientId, code)
		val plSpec = productPlSpec(tenantId, clientId, code)
		val labelSpec = productLabelSpec(tenantId, clientId, code)
		val validationSpec = validationCodeSpec(tenantId, clientId, code)
		val recentOrders = orderLineRepository.findAll(orderSpec, recentPage).content
		val recentBatchIds = collectRecentBatchIds(
			recentOrders.map { it.batchId },
			scanLineRepository.findAll(scanSpec, recentPage).content.map { it.batchId },
			plLineRepository.findAll(plSpec, recentPage).content.map { it.batchId },
			labelLineRepository.findAll(labelSpec, recentPage).content.map { it.batchId },
		)
		val confirmedBatchIds = findConfirmedBatchIds(tenantId, clientId, recentBatchIds)

		return ProductMasterDetailResponse(
			item = product.toDetailResponse(lastUpload),
			lastUpload = lastUpload?.toDetailUploadResponse(),
			usage = MasterUsageSummaryResponse(
				orderCount = orderLineRepository.count(orderSpec),
				scanLineCount = scanLineRepository.count(scanSpec),
				plLineCount = plLineRepository.count(plSpec),
				labelLineCount = labelLineRepository.count(labelSpec),
				validationErrorCount = validationErrorRepository.count(validationSpec),
				activeClientScopeCount = productScopeRepository.countByTenantIdAndProductMasterItemIdAndStatus(
					tenantId = tenantId,
					productMasterItemId = product.id ?: 0,
					status = ClientMasterScopeStatus.ACTIVE,
				),
			),
			recentBatches = findRelatedBatches(tenantId, clientId, confirmedBatchIds),
			recentOrders = recentOrders.filter { confirmedBatchIds.contains(it.batchId) }.map { it.toRelatedOrderResponse() },
			validationErrors = validationErrorRepository.findAll(validationSpec, recentPage).content.map { it.toRelatedValidationErrorResponse() },
		)
	}

	@Transactional(readOnly = true)
	fun getStoreRouteDetail(
		tenantId: Long,
		storeRouteId: Long,
		clientId: Long? = null,
	): StoreRouteMasterDetailResponse {
		val storeRoute = storeRouteMasterItemRepository.findById(storeRouteId)
			.filter { it.tenantId == tenantId }
			.orElseThrow { notFound("배송지/차량 마스터를 찾을 수 없습니다.") }
		val code = storeRoute.baljugoCode.trim()
		val lastUpload = storeRoute.lastMasterUploadBatchId?.let { findMasterUpload(tenantId, it) }
		val orderSpec = storeOrderSpec(tenantId, clientId, code)
		val scanSpec = storeScanSpec(tenantId, clientId, code)
		val plSpec = storePlSpec(tenantId, clientId, code)
		val labelSpec = storeLabelSpec(tenantId, clientId, code)
		val validationSpec = validationCodeSpec(tenantId, clientId, code)
		val recentOrders = orderLineRepository.findAll(orderSpec, recentPage).content
		val recentBatchIds = collectRecentBatchIds(
			recentOrders.map { it.batchId },
			scanLineRepository.findAll(scanSpec, recentPage).content.map { it.batchId },
			plLineRepository.findAll(plSpec, recentPage).content.map { it.batchId },
			labelLineRepository.findAll(labelSpec, recentPage).content.map { it.batchId },
		)
		val confirmedBatchIds = findConfirmedBatchIds(tenantId, clientId, recentBatchIds)

		return StoreRouteMasterDetailResponse(
			item = storeRoute.toDetailResponse(lastUpload),
			lastUpload = lastUpload?.toDetailUploadResponse(),
			usage = MasterUsageSummaryResponse(
				orderCount = orderLineRepository.count(orderSpec),
				scanLineCount = scanLineRepository.count(scanSpec),
				plLineCount = plLineRepository.count(plSpec),
				labelLineCount = labelLineRepository.count(labelSpec),
				validationErrorCount = validationErrorRepository.count(validationSpec),
				activeClientScopeCount = storeRouteScopeRepository.countByTenantIdAndStoreRouteMasterItemIdAndStatus(
					tenantId = tenantId,
					storeRouteMasterItemId = storeRoute.id ?: 0,
					status = ClientMasterScopeStatus.ACTIVE,
				),
			),
			recentBatches = findRelatedBatches(tenantId, clientId, confirmedBatchIds),
			recentOrders = recentOrders.filter { confirmedBatchIds.contains(it.batchId) }.map { it.toRelatedOrderResponse() },
			validationErrors = validationErrorRepository.findAll(validationSpec, recentPage).content.map { it.toRelatedValidationErrorResponse() },
		)
	}

	private fun findMasterUpload(tenantId: Long, uploadId: Long): MasterUploadBatchEntity? =
		masterUploadBatchRepository.findById(uploadId).filter { it.tenantId == tenantId }.orElse(null)

	private fun findRelatedBatches(
		tenantId: Long,
		clientId: Long?,
		batchIds: List<Long>,
	): List<MasterRelatedBatchResponse> =
		if (batchIds.isEmpty()) {
			emptyList()
		} else {
			uploadBatchRepository.findAllById(batchIds)
				.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) }
				.sortedByDescending { it.uploadedAt }
				.take(10)
				.map { it.toRelatedBatchResponse() }
		}

	private fun findConfirmedBatchIds(
		tenantId: Long,
		clientId: Long?,
		batchIds: List<Long>,
	): List<Long> =
		if (batchIds.isEmpty()) {
			emptyList()
		} else {
			uploadBatchRepository.findAllById(batchIds)
				.filter { it.tenantId == tenantId && (clientId == null || it.clientId == clientId) && it.status == BatchStatus.CONFIRMED }
				.sortedByDescending { it.confirmedAt ?: it.uploadedAt }
				.mapNotNull { it.id }
		}

	private fun collectRecentBatchIds(vararg idGroups: List<Long>): List<Long> =
		idGroups.flatMap { it }.distinct().take(30)

	private fun notFound(message: String): OmsException =
		OmsException(ErrorCode.NOT_FOUND, message = message, status = HttpStatus.NOT_FOUND)
}

private fun productOrderSpec(tenantId: Long, clientId: Long?, code: String): Specification<OrderLineEntity> =
	codeSpec(tenantId, clientId, "productCode", code)

private fun productScanSpec(tenantId: Long, clientId: Long?, code: String): Specification<ScanLineEntity> =
	codeSpec(tenantId, clientId, "productCode", code)

private fun productPlSpec(tenantId: Long, clientId: Long?, code: String): Specification<PlLineEntity> =
	codeSpec(tenantId, clientId, "productCode", code)

private fun productLabelSpec(tenantId: Long, clientId: Long?, code: String): Specification<LabelLineEntity> =
	codeSpec(tenantId, clientId, "productCode", code)

private fun storeOrderSpec(tenantId: Long, clientId: Long?, code: String): Specification<OrderLineEntity> =
	codeSpec(tenantId, clientId, "storeCode", code)

private fun storeScanSpec(tenantId: Long, clientId: Long?, code: String): Specification<ScanLineEntity> =
	codeSpec(tenantId, clientId, "orderBusinessSiteCode", code)

private fun storePlSpec(tenantId: Long, clientId: Long?, code: String): Specification<PlLineEntity> =
	codeSpec(tenantId, clientId, "storeCode", code)

private fun storeLabelSpec(tenantId: Long, clientId: Long?, code: String): Specification<LabelLineEntity> =
	codeSpec(tenantId, clientId, "storeCode", code)

private fun <T : Any> codeSpec(
	tenantId: Long,
	clientId: Long?,
	fieldName: String,
	code: String,
): Specification<T> =
	Specification { root, _, criteriaBuilder ->
		val predicates = mutableListOf(
			criteriaBuilder.equal(root.get<Long>("tenantId"), tenantId),
			criteriaBuilder.equal(root.get<String>(fieldName), code),
		)
		if (clientId != null) {
			predicates += criteriaBuilder.equal(root.get<Long>("clientId"), clientId)
		}
		criteriaBuilder.and(*predicates.toTypedArray())
	}

private fun validationCodeSpec(
	tenantId: Long,
	clientId: Long?,
	code: String,
): Specification<ValidationErrorEntity> =
	Specification { root, _, criteriaBuilder ->
		val predicates = mutableListOf(
			criteriaBuilder.equal(root.get<Long>("tenantId"), tenantId),
			criteriaBuilder.or(
				criteriaBuilder.equal(root.get<String>("originalValue"), code),
				criteriaBuilder.equal(root.get<String>("normalizedValue"), code),
				criteriaBuilder.like(root.get<String>("message"), "%$code%"),
			),
		)
		if (clientId != null) {
			predicates += criteriaBuilder.equal(root.get<Long>("clientId"), clientId)
		}
		criteriaBuilder.and(*predicates.toTypedArray())
	}

private fun ProductMasterItemEntity.toDetailResponse(lastUpload: MasterUploadBatchEntity?): ProductMasterItemResponse =
	ProductMasterItemResponse(
		id = id ?: 0,
		ezadminCode = ezadminCode,
		productName = productName,
		customerProductCode = customerProductCode,
		boxQty = boxQty,
		outboundUnit = outboundUnit,
		temperatureType = temperatureType,
		cbm = cbm,
		activeYn = activeYn,
		lastMasterUploadBatchId = lastMasterUploadBatchId,
		lastMasterUploadedAt = lastUpload?.appliedAt ?: lastUpload?.uploadedAt,
		latestConfirmedBatchId = null,
		latestConfirmedBatchNo = null,
		latestConfirmedBatchAt = null,
		rowNo = rowNo,
	)

private fun StoreRouteMasterItemEntity.toDetailResponse(lastUpload: MasterUploadBatchEntity?): StoreRouteMasterItemResponse =
	StoreRouteMasterItemResponse(
		id = id ?: 0,
		baljugoCode = baljugoCode,
		customerCode = customerCode,
		brandName = brandName,
		storeName = storeName,
		area = area,
		deliveryDay = deliveryDay,
		deliveryRound = deliveryRound,
		vehicleName = vehicleName,
		driverName = driverName,
		address = address,
		activeYn = activeYn,
		lastMasterUploadBatchId = lastMasterUploadBatchId,
		lastMasterUploadedAt = lastUpload?.appliedAt ?: lastUpload?.uploadedAt,
		latestConfirmedBatchId = null,
		latestConfirmedBatchNo = null,
		latestConfirmedBatchAt = null,
		rowNo = rowNo,
	)

private fun MasterUploadBatchEntity.toDetailUploadResponse(): MasterDetailUploadResponse =
	MasterDetailUploadResponse(
		id = id ?: 0,
		fileName = originalFileName,
		status = status,
		uploadedAt = uploadedAt,
		appliedAt = appliedAt,
	)

private fun UploadBatchEntity.toRelatedBatchResponse(): MasterRelatedBatchResponse =
	MasterRelatedBatchResponse(
		id = id ?: 0,
		batchNo = batchNo,
		clientId = clientId,
		status = status,
		deliveryDate = deliveryDate,
		uploadedAt = uploadedAt,
		confirmedAt = confirmedAt,
	)

private fun OrderLineEntity.toRelatedOrderResponse(): MasterRelatedOrderResponse =
	MasterRelatedOrderResponse(
		id = id ?: 0,
		batchId = batchId,
		clientName = client?.name,
		orderNo = orderNo,
		storeCode = storeCode,
		storeName = storeName,
		productCode = productCode,
		productName = productName,
		unit = unit,
		orderQty = orderQty,
		dueDate = dueDate,
		vehicleName = vehicleName,
		deliveryRound = deliveryRound,
		area = area,
		sourcePlLineId = sourcePlLineId,
		batchStatus = batch?.status,
		confirmed = batch?.status == BatchStatus.CONFIRMED,
	)

private fun ValidationErrorEntity.toRelatedValidationErrorResponse(): MasterRelatedValidationErrorResponse =
	MasterRelatedValidationErrorResponse(
		id = id ?: 0,
		batchId = batchId,
		severity = severity,
		errorCode = errorCode,
		domain = domain.name,
		sheetName = sheetName,
		rowNo = rowNo,
		columnName = columnName,
		message = message,
		createdAt = createdAt,
	)
