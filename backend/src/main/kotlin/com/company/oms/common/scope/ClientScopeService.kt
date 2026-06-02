package com.company.oms.common.scope

import com.company.oms.auth.AccessScopeService
import com.company.oms.auth.UserRole
import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import com.company.oms.common.persistence.UserScopeType
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.text.Normalizer

@Service
@Profile("local")
class ClientScopeService(
	private val accessScopeService: AccessScopeService,
	private val clientRepository: ClientRepository,
	private val clientAliasRepository: ClientAliasRepository,
) {

	@Transactional(readOnly = true)
	fun listClients(tenantId: Long): List<ClientSummaryResponse> {
		val resolvedTenantId = accessScopeService.requireTenantAccess(tenantId)
		return visibleClients(resolvedTenantId)
			.map { it.toResponse() }
	}

	@Transactional(readOnly = true)
	fun resolveCandidates(
		tenantId: Long,
		sourceText: String,
		limit: Int,
	): List<ClientResolveCandidateResponse> {
		val resolvedTenantId = accessScopeService.requireTenantAccess(tenantId)
		val normalizedSource = normalizeClientText(sourceText)
		if (normalizedSource.isBlank()) {
			return listClients(resolvedTenantId).take(limit.coerceIn(1, 20)).map {
				ClientResolveCandidateResponse(
					client = it,
					score = 0,
					matchedText = "",
					matchType = "NONE",
					reason = "검색어가 없어 기존 고객사 목록을 표시합니다.",
				)
			}
		}

		val clients = visibleClients(resolvedTenantId)
		val aliasesByClientId = clientAliasRepository.findAllByTenantIdAndActiveYn(resolvedTenantId, true)
			.groupBy { it.clientId }

		return clients
			.mapNotNull { client ->
				val aliases = aliasesByClientId[client.id] ?: emptyList()
				bestCandidate(client, aliases, normalizedSource)
			}
			.filter { it.score >= MIN_CANDIDATE_SCORE }
			.sortedWith(compareByDescending<ClientResolveCandidateResponse> { it.score }.thenBy { it.client.name })
			.take(limit.coerceIn(1, 20))
	}

	@Transactional
	fun createClient(request: CreateClientRequest): ClientMutationResponse {
		val tenantId = resolveWritableTenantId(request.tenantId)
		val name = request.name.trim()
		if (name.isBlank()) {
			throwInvalidRequest("고객사명을 입력해 주세요.")
		}
		val requestedCode = normalizeObjectCode(request.code.orEmpty())
		val code =
			requestedCode.ifBlank {
				generateUniqueObjectCode(name, "CLIENT") { clientRepository.findByTenantIdAndCode(tenantId, it) != null }
			}
		if (requestedCode.isNotBlank() && clientRepository.findByTenantIdAndCode(tenantId, code) != null) {
			throwInvalidRequest("이미 사용 중인 고객사 코드입니다.")
		}
		val client =
			clientRepository.save(
				ClientEntity(
					tenantId = tenantId,
					code = code,
					name = name,
					externalCode = normalizeExternalCode(request.externalCode),
					status = "ACTIVE",
				),
			)
		return ClientMutationResponse(id = requireNotNull(client.id), updated = false)
	}

	@Transactional
	fun updateClient(
		tenantId: Long,
		clientId: Long,
		request: UpdateClientRequest,
	): ClientMutationResponse {
		val resolvedTenantId = resolveWritableTenantId(tenantId)
		val client =
			clientRepository.findById(clientId).orElseThrow {
				OmsException(ErrorCode.CLIENT_NOT_FOUND, status = HttpStatus.NOT_FOUND)
			}
		if (client.tenantId != resolvedTenantId) {
			throw OmsException(ErrorCode.CLIENT_NOT_FOUND, status = HttpStatus.NOT_FOUND)
		}
		request.code?.let {
			val nextCode = normalizeObjectCode(it)
			if (nextCode.isBlank()) throwInvalidRequest("고객사 코드를 입력해 주세요.")
			val existing = clientRepository.findByTenantIdAndCode(resolvedTenantId, nextCode)
			if (existing != null && existing.id != clientId) {
				throwInvalidRequest("이미 사용 중인 고객사 코드입니다.")
			}
			client.code = nextCode
		}
		request.name?.let {
			val nextName = it.trim()
			if (nextName.isBlank()) throwInvalidRequest("고객사명을 입력해 주세요.")
			client.name = nextName
		}
		request.externalCode?.let { client.externalCode = normalizeExternalCode(it) }
		request.status?.let {
			if (it !in allowedStatuses) throwInvalidRequest("고객사 상태가 올바르지 않습니다.")
			client.status = it
		}
		return ClientMutationResponse(id = clientId)
	}

	private fun bestCandidate(
		client: ClientEntity,
		aliases: List<ClientAliasEntity>,
		normalizedSource: String,
	): ClientResolveCandidateResponse? {
		val clientResponse = client.toResponse()
		val fields = buildList {
			add(MatchField(client.name, "CLIENT_NAME"))
			add(MatchField(client.code, "CLIENT_CODE"))
			client.externalCode?.let { add(MatchField(it, "CLIENT_CODE")) }
			aliases.forEach { add(MatchField(it.aliasName, "ALIAS")) }
		}

		return fields
			.map { field ->
				val normalizedTarget = normalizeClientText(field.text)
				val score = similarityScore(normalizedSource, normalizedTarget)
				ClientResolveCandidateResponse(
					client = clientResponse,
					score = score,
					matchedText = field.text,
					matchType = field.matchType,
					reason = reasonFor(field.matchType, score),
				)
			}
			.maxWithOrNull(compareBy<ClientResolveCandidateResponse> { it.score }.thenByDescending { it.matchType == "ALIAS" })
	}

	private fun similarityScore(source: String, target: String): Int {
		if (source.isBlank() || target.isBlank()) {
			return 0
		}
		if (source == target) {
			return 100
		}
		if (source.contains(target) || target.contains(source)) {
			return 92
		}

		val direct = levenshteinSimilarity(source, target)
		val window = bestWindowSimilarity(source, target)
		return maxOf(direct, window)
	}

	private fun bestWindowSimilarity(source: String, target: String): Int {
		val longer = if (source.length >= target.length) source else target
		val shorter = if (source.length >= target.length) target else source
		if (shorter.length < 2 || longer.length == shorter.length) {
			return 0
		}

		return (0..(longer.length - shorter.length))
			.maxOf { start -> levenshteinSimilarity(longer.substring(start, start + shorter.length), shorter) }
	}

	private fun levenshteinSimilarity(left: String, right: String): Int {
		val distance = levenshteinDistance(left, right)
		val maxLength = maxOf(left.length, right.length)
		if (maxLength == 0) {
			return 100
		}
		return ((1.0 - distance.toDouble() / maxLength.toDouble()) * 100).toInt().coerceIn(0, 100)
	}

	private fun levenshteinDistance(left: String, right: String): Int {
		val costs = IntArray(right.length + 1) { it }
		for (i in 1..left.length) {
			var previous = costs[0]
			costs[0] = i
			for (j in 1..right.length) {
				val current = costs[j]
				val substitutionCost = if (left[i - 1] == right[j - 1]) 0 else 1
				costs[j] = minOf(
					costs[j] + 1,
					costs[j - 1] + 1,
					previous + substitutionCost,
				)
				previous = current
			}
		}
		return costs[right.length]
	}

	private fun reasonFor(matchType: String, score: Int): String =
		when {
			score == 100 -> "정규화된 고객사명 또는 코드가 정확히 일치합니다."
			matchType == "ALIAS" -> "등록된 고객사 별칭과 유사합니다."
			score >= 90 -> "파일명 후보가 기존 고객사명 또는 코드에 포함됩니다."
			else -> "오탈자 또는 표기 차이가 있는 고객사명으로 보입니다."
		}

	private fun resolveWritableTenantId(tenantId: Long?): Long {
		val currentUser = accessScopeService.requireAnyRole(UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
		return when (currentUser.userScopeType) {
			UserScopeType.SYSTEM -> {
				accessScopeService.requireSystemAdmin()
				accessScopeService.requireTenantAccess(
					tenantId ?: throwInvalidRequest("SYSTEM_ADMIN은 고객사를 생성할 물류사를 선택해야 합니다."),
				)
			}

			UserScopeType.TENANT -> {
				accessScopeService.requireTenantAdmin()
				accessScopeService.requireTenantAccess(tenantId ?: currentUser.tenantId ?: throwInvalidRequest("TENANT 사용자에 tenantId가 없습니다."))
			}

			else -> throwForbidden("고객사 관리는 SYSTEM_ADMIN 또는 TENANT ADMIN만 가능합니다.")
		}
	}

	private fun normalizeExternalCode(value: String?): String? =
		value?.trim()?.takeIf(String::isNotBlank)

	private fun throwInvalidRequest(message: String): Nothing =
		throw OmsException(
			errorCode = ErrorCode.INVALID_REQUEST,
			message = message,
			status = HttpStatus.BAD_REQUEST,
		)

	private fun throwForbidden(message: String): Nothing =
		throw OmsException(
			errorCode = ErrorCode.FORBIDDEN,
			message = message,
			status = HttpStatus.FORBIDDEN,
		)

	private fun activeClients(tenantId: Long): List<ClientEntity> =
		clientRepository.findAllByTenantIdAndStatus(tenantId, "ACTIVE")
			.sortedWith(compareBy<ClientEntity> { normalizeClientText(it.name) }.thenBy { it.id ?: Long.MAX_VALUE })
			.groupBy { normalizeClientText(it.name) }
			.values
			.mapNotNull { clients -> clients.minByOrNull { it.id ?: Long.MAX_VALUE } }

	private fun visibleClients(tenantId: Long): List<ClientEntity> {
		val currentUser = accessScopeService.requireUser()
		val clients = activeClients(tenantId)
		if (currentUser.userScopeType != UserScopeType.CLIENT) {
			return clients
		}

		val clientId = currentUser.clientId ?: throwForbidden("CLIENT 사용자에 clientId가 없습니다.")
		accessScopeService.requireClientAccess(tenantId, clientId)
		return clients.filter { it.id == clientId }
	}
}

private data class MatchField(
	val text: String,
	val matchType: String,
)

private const val MIN_CANDIDATE_SCORE = 55
private val allowedStatuses = setOf("ACTIVE", "DISABLED")

fun normalizeClientText(value: String): String =
	value.trim()
		.let { Normalizer.normalize(it, Normalizer.Form.NFKC) }
		.lowercase()
		.removePrefix("\uFEFF")
		.replace(Regex("\\.(xlsx|xlsm|xls|csv)$"), "")
		.replace(Regex("[\\s_\\-()\\[\\]{}.,]+"), "")

private fun ClientEntity.toResponse(): ClientSummaryResponse =
	ClientSummaryResponse(
		id = id ?: 0,
		tenantId = tenantId,
		code = code,
		name = name,
		externalCode = externalCode,
		status = status,
	)
