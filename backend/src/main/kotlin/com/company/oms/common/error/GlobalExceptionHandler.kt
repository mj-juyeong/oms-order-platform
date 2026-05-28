package com.company.oms.common.error

import com.company.oms.common.response.ApiErrorDetail
import com.company.oms.common.response.ApiResponse
import com.company.oms.common.response.ApiResponseFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(OmsException::class)
    fun handleOmsException(exception: OmsException): ResponseEntity<ApiResponse<Nothing>> =
        ResponseEntity
            .status(exception.status)
            .body(
                ApiResponseFactory.error(
                    code = exception.errorCode.name,
                    message = exception.message,
                    details = exception.details,
                ),
            )

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(exception: MethodArgumentNotValidException): ResponseEntity<ApiResponse<Nothing>> {
        val details = exception.bindingResult.fieldErrors.map {
            ApiErrorDetail(
                field = it.field,
                message = it.defaultMessage ?: ErrorCode.INVALID_REQUEST.defaultMessage,
                rejectedValue = it.rejectedValue?.toString(),
            )
        }

        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(
                ApiResponseFactory.error(
                    code = ErrorCode.INVALID_REQUEST.name,
                    message = ErrorCode.INVALID_REQUEST.defaultMessage,
                    details = details,
                ),
            )
    }

    @ExceptionHandler(Exception::class)
    fun handleException(exception: Exception): ResponseEntity<ApiResponse<Nothing>> =
        ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(
                ApiResponseFactory.error(
                    code = ErrorCode.INTERNAL_ERROR.name,
                    message = ErrorCode.INTERNAL_ERROR.defaultMessage,
                ),
            )
}
