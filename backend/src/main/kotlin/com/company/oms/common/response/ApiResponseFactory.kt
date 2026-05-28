package com.company.oms.common.response

import com.company.oms.common.request.RequestContext
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

object ApiResponseFactory {
    private val zoneId: ZoneId = ZoneId.of("Asia/Seoul")
    private val formatter: DateTimeFormatter = DateTimeFormatter.ISO_OFFSET_DATE_TIME

    fun <T> success(data: T?): ApiResponse<T> = ApiResponse(
        success = true,
        data = data,
        error = null,
        meta = meta(),
    )

    fun error(
        code: String,
        message: String,
        details: List<ApiErrorDetail> = emptyList(),
    ): ApiResponse<Nothing> = ApiResponse(
        success = false,
        data = null,
        error = ApiError(
            code = code,
            message = message,
            details = details,
        ),
        meta = meta(),
    )

    private fun meta(): ApiMeta = ApiMeta(
        requestId = RequestContext.getRequestId(),
        timestamp = OffsetDateTime.now(zoneId).format(formatter),
    )
}
