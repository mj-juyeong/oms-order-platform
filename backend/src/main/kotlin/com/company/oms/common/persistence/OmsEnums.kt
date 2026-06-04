package com.company.oms.common.persistence

enum class BatchStatus {
	UPLOADED,
	VALIDATING,
	VALIDATION_FAILED,
	READY_TO_CONFIRM,
	CONFIRMATION_REQUESTED,
	NEEDS_MORE_INFO,
	REJECTED,
	CONFIRMED,
	CANCELLED,
	ROLLED_BACK,
}

enum class BatchConfirmationRequestStatus {
	REQUESTED,
	NEEDS_MORE_INFO,
	REJECTED,
	APPROVED,
}

enum class BatchSupplementRequestType {
	FILE_REUPLOAD,
	MASTER_DATA,
	CLARIFICATION,
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
	READY_TO_APPLY,
	REVIEW_REQUIRED,
	APPLIED,
	PARTIAL_FAILED,
	FAILED,
	CANCELLED,
}

enum class MasterDataAddRequestType {
	PRODUCT,
	STORE_ROUTE,
	PRODUCT_CODE_MAPPING,
	STORE_CODE_MAPPING,
}

enum class MasterDataAddRequestStatus {
	REQUESTED,
	NEEDS_MORE_INFO,
	REJECTED,
	APPROVED,
	APPLIED,
}

enum class ApiKeyRequestStatus {
	REQUESTED,
	REJECTED,
	CANCELED,
	ISSUED,
}

enum class ClientProductMasterVisibilityMode {
	SCOPED_ONLY,
	ALL_PRODUCTS,
}

enum class ClientStoreRouteMasterVisibilityMode {
	SCOPED_ONLY,
	ALL_STORE_ROUTES,
}

enum class ClientMasterScopeStatus {
	ACTIVE,
	INACTIVE,
}

enum class ClientMasterScopeSource {
	MANUAL,
	USED_IN_BATCH,
	UPLOADED_BATCH,
	REQUEST_APPROVED,
}

enum class UserScopeType {
	SYSTEM,
	TENANT,
	CLIENT,
}

enum class NotificationSeverity {
	ERROR,
	WARNING,
	INFO,
}

enum class NotificationTargetScope {
	TENANT,
	CLIENT,
	USER,
}

enum class NotificationEventType {
	BATCH_CONFIRMATION_REQUESTED,
	BATCH_CONFIRMATION_APPROVED,
	BATCH_CONFIRMATION_NEEDS_MORE_INFO,
	BATCH_CONFIRMATION_REJECTED,
	API_KEY_REQUESTED,
	API_KEY_ISSUED,
	API_KEY_REJECTED,
}
