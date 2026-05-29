package com.company.oms.common.persistence

enum class BatchStatus {
	UPLOADED,
	VALIDATING,
	VALIDATION_FAILED,
	READY_TO_CONFIRM,
	CONFIRMED,
	CANCELLED,
	ROLLED_BACK,
}

enum class PlType {
	EA,
	BOX,
}

enum class LabelType {
	EA,
	BOX,
}

enum class ValidationSeverity {
	ERROR,
	WARNING,
	INFO,
}

enum class UploadDomain {
	SCAN,
	PL,
	LABEL,
	ORDER,
	MASTER,
}

enum class SheetType {
	SCAN_UPLOAD,
	PL_EA,
	PL_BOX,
	LABEL_EA,
	LABEL_BOX,
	IGNORED,
	UNKNOWN,
}

enum class MasterType {
	PRODUCT,
	STORE_ROUTE,
}

enum class MasterUploadStatus {
	UPLOADED,
	PROCESSING,
	APPLIED,
	PARTIAL_FAILED,
	FAILED,
}

enum class UserScopeType {
	SYSTEM,
	TENANT,
	CLIENT,
}

