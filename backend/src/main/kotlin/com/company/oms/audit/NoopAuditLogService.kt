package com.company.oms.audit

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

@Component
class NoopAuditLogService : AuditLogService {
    private val logger = LoggerFactory.getLogger(NoopAuditLogService::class.java)

    override fun log(event: AuditEvent) {
        logger.info("audit skeleton event action={} requestId={}", event.action, event.requestId)
    }
}
