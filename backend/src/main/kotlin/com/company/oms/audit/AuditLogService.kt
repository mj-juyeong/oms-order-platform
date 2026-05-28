package com.company.oms.audit

interface AuditLogService {
    fun log(event: AuditEvent)
}
