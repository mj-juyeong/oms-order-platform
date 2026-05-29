package com.company.oms.common.error

import com.company.oms.common.response.ApiErrorDetail
import com.company.oms.common.response.ApiResponse
import com.company.oms.common.response.ApiResponseFactory
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException

@RestControllerAdvice
class GlobalExceptionHandler {
    private val log = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

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

    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleMaxUploadSizeExceeded(exception: MaxUploadSizeExceededException): ResponseEntity<ApiResponse<Nothing>> =
        ResponseEntity
            .status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(
                ApiResponseFactory.error(
                    code = ErrorCode.FILE_TOO_LARGE.name,
                    message = "업로드 파일 크기가 허용 범위를 초과했습니다. 파일 크기를 줄이거나 업로드 한도를 확인해 주세요.",
                ),
            )

    @ExceptionHandler(Exception::class)
    fun handleException(exception: Exception): ResponseEntity<ApiResponse<Nothing>> {
        log.error("Unhandled exception", exception)

        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(
                ApiResponseFactory.error(
                    code = ErrorCode.INTERNAL_ERROR.name,
                    message = ErrorCode.INTERNAL_ERROR.defaultMessage,
                ),
            )
    }
}
