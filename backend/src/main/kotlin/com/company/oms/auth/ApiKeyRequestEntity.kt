package com.company.oms.auth

import com.company.oms.common.persistence.ApiKeyRequestStatus
import com.company.oms.common.persistence.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "api_key_requests")
class ApiKeyRequestEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id")
	var clientId: Long? = null,

	@Enumerated(EnumType.STRING)
	@Column(name = "scope_type", nullable = false, length = 32)
	var scopeType: ApiKeyScopeType = ApiKeyScopeType.TENANT,

	@Column(name = "name", nullable = false, length = 100)
	var name: String = "",

	@Column(name = "purpose", nullable = false, length = 500)
	var purpose: String = "",

	@Column(name = "system_name", nullable = false, length = 100)
	var systemName: String = "",

	@Column(name = "contact_name", length = 100)
	var contactName: String? = null,

	@Column(name = "contact_email", length = 255)
	var contactEmail: String? = null,

	@Column(name = "contact_phone", length = 50)
	var contactPhone: String? = null,

	@Column(name = "allowed_scope", columnDefinition = "json")
	var allowedScope: String? = null,

	@Column(name = "requested_expires_at")
	var requestedExpiresAt: LocalDateTime? = null,

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 32)
	var status: ApiKeyRequestStatus = ApiKeyRequestStatus.REQUESTED,

	@Column(name = "requested_by")
	var requestedBy: Long? = null,

	@Column(name = "requested_at", nullable = false)
	var requestedAt: LocalDateTime = LocalDateTime.now(),

	@Column(name = "reviewed_by")
	var reviewedBy: Long? = null,

	@Column(name = "reviewed_at")
	var reviewedAt: LocalDateTime? = null,

	@Column(name = "review_comment", columnDefinition = "text")
	var reviewComment: String? = null,

	@Column(name = "issued_api_key_id")
	var issuedApiKeyId: Long? = null,

	@Column(name = "issued_at")
	var issuedAt: LocalDateTime? = null,

	@Column(name = "issued_api_key_secret", columnDefinition = "text")
	var issuedApiKeySecret: String? = null,

	@Column(name = "issued_api_key_revealed_at")
	var issuedApiKeyRevealedAt: LocalDateTime? = null,
) : BaseTimeEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

@Entity
@Table(name = "api_key_request_events")
class ApiKeyRequestEventEntity(
	@Column(name = "request_id", nullable = false)
	var requestId: Long = 0,

	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id")
	var clientId: Long? = null,

	@Column(name = "event_type", nullable = false, length = 32)
	var eventType: String = "",

	@Column(name = "actor_id")
	var actorId: Long? = null,

	@Column(name = "comment", columnDefinition = "text")
	var comment: String? = null,

	@Column(name = "api_key_id")
	var apiKeyId: Long? = null,

	@Column(name = "occurred_at", nullable = false)
	var occurredAt: LocalDateTime = LocalDateTime.now(),
) {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}
