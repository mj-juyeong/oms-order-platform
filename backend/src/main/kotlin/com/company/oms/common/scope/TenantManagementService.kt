package com.company.oms.common.scope

import com.company.oms.auth.AccessScopeService
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Profile("local")
class TenantManagementService(
	private val accessScopeService: AccessScopeService,
	private val tenantRepository: TenantRepository,
) {

	@Transactional(readOnly = true)
	fun listTenants(status: String?): List<TenantSummaryResponse> {
		accessScopeService.requireSystemAdmin()
		val rows =
			if (status.isNullOrBlank()) {
				tenantRepository.findAll()
			} else {
				tenantRepository.findAllByStatus(status)
			}
		return rows
			.sortedWith(compareBy<TenantEntity> { it.status != "ACTIVE" }.thenBy { it.name }.thenBy { it.id ?: Long.MAX_VALUE })
			.map { it.toResponse() }
	}

	@Transactional
	fun createTenant(request: CreateTenantRequest): TenantMutationResponse {
		accessScopeService.requireSystemAdmin()
		val name = request.name.trim()
		if (name.isBlank()) {
			throwInvalidRequest("물류사명을 입력해 주세요.")
		}
		val requestedCode = normalizeObjectCode(request.code.orEmpty())
		val code =
			requestedCode.ifBlank {
				generateUniqueObjectCode(name, "TENANT") { tenantRepository.findByCode(it) != null }
			}
		if (requestedCode.isNotBlank() && tenantRepository.findByCode(code) != null) {
			throwInvalidRequest("이미 사용 중인 물류사 코드입니다.")
		}
		val tenant =
			tenantRepository.save(
				TenantEntity(
					code = code,
					name = name,
					status = "ACTIVE",
				),
			)
		return TenantMutationResponse(id = requireNotNull(tenant.id), updated = false)
	}

	@Transactional
	fun updateTenant(
		tenantId: Long,
		request: UpdateTenantRequest,
	): TenantMutationResponse {
		accessScopeService.requireSystemAdmin()
		val tenant =
			tenantRepository.findById(tenantId).orElseThrow {
				OmsException(ErrorCode.NOT_FOUND, message = "물류사를 찾을 수 없습니다.", status = HttpStatus.NOT_FOUND)
			}
		request.code?.let {
			val nextCode = normalizeObjectCode(it)
			if (nextCode.isBlank()) throwInvalidRequest("물류사 코드를 입력해 주세요.")
			val existing = tenantRepository.findByCode(nextCode)
			if (existing != null && existing.id != tenantId) {
				throwInvalidRequest("이미 사용 중인 물류사 코드입니다.")
			}
			tenant.code = nextCode
		}
		request.name?.let {
			val nextName = it.trim()
			if (nextName.isBlank()) throwInvalidRequest("물류사명을 입력해 주세요.")
			tenant.name = nextName
		}
		request.status?.let {
			if (it !in allowedStatuses) throwInvalidRequest("물류사 상태가 올바르지 않습니다.")
			tenant.status = it
		}
		return TenantMutationResponse(id = tenantId)
	}

	private fun throwInvalidRequest(message: String): Nothing =
		throw OmsException(
			errorCode = ErrorCode.INVALID_REQUEST,
			message = message,
			status = HttpStatus.BAD_REQUEST,
		)

	private fun TenantEntity.toResponse(): TenantSummaryResponse =
		TenantSummaryResponse(
			id = requireNotNull(id),
			code = code,
			name = name,
			status = status,
		)

	companion object {
		private val allowedStatuses = setOf("ACTIVE", "DISABLED")
	}
}
