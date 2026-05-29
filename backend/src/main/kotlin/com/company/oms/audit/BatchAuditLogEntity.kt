package com.company.oms.audit

import com.company.oms.common.persistence.BatchStatus
import com.company.oms.common.persistence.CreatedAtEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "batch_audit_logs")
class BatchAuditLogEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "batch_id")
	var batchId: Long? = null,

	@Column(name = "action", nullable = false, length = 64)
	var action: String = "",

	@Enumerated(EnumType.STRING)
	@Column(name = "before_status", length = 32)
	var beforeStatus: BatchStatus? = null,

	@Enumerated(EnumType.STRING)
	@Column(name = "after_status", length = 32)
	var afterStatus: BatchStatus? = null,

	@Column(name = "actor_id")
	var actorId: Long? = null,

	@Column(name = "request_id", length = 100)
	var requestId: String? = null,

	@Column(name = "message", columnDefinition = "text")
	var message: String? = null,

	@Column(name = "metadata_json", columnDefinition = "json")
	var metadataJson: String? = null,
) : CreatedAtEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

