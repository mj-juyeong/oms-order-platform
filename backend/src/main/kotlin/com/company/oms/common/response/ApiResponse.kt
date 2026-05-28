package com.company.oms.common.response

data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val error: ApiError?,
    val meta: ApiMeta,
)
