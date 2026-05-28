package com.company.oms.common.error

import com.company.oms.common.response.ApiErrorDetail
import org.springframework.http.HttpStatus

open class OmsException(
    val errorCode: ErrorCode,
    override val message: String = errorCode.defaultMessage,
    val status: HttpStatus = HttpStatus.BAD_REQUEST,
    val details: List<ApiErrorDetail> = emptyList(),
) : RuntimeException(message)
