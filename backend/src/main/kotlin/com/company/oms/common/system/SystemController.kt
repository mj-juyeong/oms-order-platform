package com.company.oms.common.system

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class SystemController {

    @GetMapping("/api/v1/system/ping")
    fun ping(): SystemPingResponse = SystemPingResponse(status = "OK")

    @GetMapping("/api/v1/system/error-sample")
    fun errorSample(): Nothing {
        throw OmsException(
            errorCode = ErrorCode.INVALID_REQUEST,
            message = "공통 예외 처리 검증용 오류입니다.",
            status = HttpStatus.BAD_REQUEST,
        )
    }
}

data class SystemPingResponse(
    val status: String,
)
