package com.company.oms.audit

data class AuditEvent(
    val action: AuditActionType,
    val tenantId: Long? = null,
    val clientId: Long? = null,
    val batchId: Long? = null,
    val actorId: Long? = null,
    val requestId: String? = null,
    val beforeStatus: String? = null,
    val afterStatus: String? = null,
    val message: String? = null,
    val metadata: Map<String, Any?> = emptyMap(),
)
