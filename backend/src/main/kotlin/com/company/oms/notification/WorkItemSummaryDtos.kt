package com.company.oms.notification

data class WorkItemSummaryResponse(
	val unreadNotifications: Long,
	val incompleteBatches: Long,
	val pendingConfirmationRequests: Long,
	val pendingApiKeyRequests: Long,
	val needsMoreInfoBatches: Long,
	val rejectedConfirmationRequests: Long,
	val validationErrorBatches: Long,
)
