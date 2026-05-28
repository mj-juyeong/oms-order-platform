package com.company.oms.common.error

enum class ErrorCode(
    val defaultMessage: String,
) {
    INVALID_REQUEST("요청 값이 올바르지 않습니다."),
    NOT_FOUND("요청한 리소스를 찾을 수 없습니다."),
    UNAUTHORIZED("인증이 필요합니다."),
    FORBIDDEN("권한이 없습니다."),
    INTERNAL_ERROR("서버 오류가 발생했습니다."),
    VALIDATION_FAILED("검증 오류가 존재합니다."),
    FILE_UPLOAD_FAILED("파일 업로드에 실패했습니다."),
    BATCH_NOT_FOUND("배치를 찾을 수 없습니다."),
    MASTER_VERSION_NOT_FOUND("마스터 버전을 찾을 수 없습니다."),
}
