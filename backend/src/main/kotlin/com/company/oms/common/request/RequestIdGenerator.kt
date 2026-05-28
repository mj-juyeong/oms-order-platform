package com.company.oms.common.request

import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.UUID

object RequestIdGenerator {
    private val zoneId: ZoneId = ZoneId.of("Asia/Seoul")
    private val formatter: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss")

    fun generate(): String {
        val timestamp = LocalDateTime.now(zoneId).format(formatter)
        val suffix = UUID.randomUUID().toString().replace("-", "").take(12)
        return "req-$timestamp-$suffix"
    }
}
