package com.company.oms.common.response

data class ApiError(
    val code: String,
    val message: String,
    val details: List<ApiErrorDetail> = emptyList(),
)

data class ApiErrorDetail(
    val field: String? = null,
    val message: String,
    val rejectedValue: String? = null,
)
