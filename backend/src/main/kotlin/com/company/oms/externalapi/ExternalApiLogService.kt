package com.company.oms.externalapi

import com.company.oms.common.request.RequestContext
import jakarta.servlet.http.HttpServletRequest
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Service

@Service
@Profile("local")
class ExternalApiLogService(
	private val apiCallLogRepository: ApiCallLogRepository,
) {

	fun record(
		request: HttpServletRequest,
		tenantId: Long,
		clientId: Long,
		apiKeyId: Long?,
		responseStatus: Int,
		startedNanos: Long,
	) {
		apiCallLogRepository.save(
			ApiCallLogEntity(
				tenantId = tenantId,
				clientId = clientId,
				apiKeyId = apiKeyId,
				requestId = RequestContext.getRequestId(),
				path = request.requestURI,
				method = request.method,
				queryString = request.queryString,
				responseStatus = responseStatus,
				responseTimeMs = ((System.nanoTime() - startedNanos) / 1_000_000).toInt(),
				clientIp = request.remoteAddr,
			),
		)
	}
}
