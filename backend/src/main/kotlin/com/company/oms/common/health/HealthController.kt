package com.company.oms.common.health

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HealthController {

    @GetMapping("/api/v1/health")
    fun health(): HealthResponse = HealthResponse(status = "UP")
}

data class HealthResponse(
    val status: String,
)
