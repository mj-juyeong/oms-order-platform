package com.company.oms.externalapi

import com.company.oms.common.persistence.CreatedAtEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "api_call_logs")
class ApiCallLogEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "api_key_id")
	var apiKeyId: Long? = null,

	@Column(name = "request_id", length = 100)
	var requestId: String? = null,

	@Column(name = "path", nullable = false, length = 500)
	var path: String = "",

	@Column(name = "method", nullable = false, length = 16)
	var method: String = "",

	@Column(name = "query_string", columnDefinition = "text")
	var queryString: String? = null,

	@Column(name = "response_status", nullable = false)
	var responseStatus: Int = 200,

	@Column(name = "response_time_ms")
	var responseTimeMs: Int? = null,

	@Column(name = "client_ip", length = 64)
	var clientIp: String? = null,
) : CreatedAtEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

