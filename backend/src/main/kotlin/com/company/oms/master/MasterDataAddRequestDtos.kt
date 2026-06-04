package com.company.oms.master

import com.company.oms.common.persistence.MasterDataAddRequestStatus
import com.company.oms.common.persistence.MasterDataAddRequestType
import com.company.oms.common.persistence.MasterType
import java.time.LocalDateTime

data class MasterDataAddRequestCreateRequest(
	val tenantId: Long? = null,
	val clientId: Long? = null,
	val requestType: MasterDataAddRequestType,
	val title: String,
	val requestFields: Map<String, String> = emptyMap(),
	val requestMemo: String? = null,
	val requestedBy: Long? = null,
)

data class MasterDataAddRequestReviewRequest(
	val comment: String? = null,
	val actorId: Long? = null,
	val appliedMasterType: MasterType? = null,
	val appliedMasterItemId: Long? = null,
	val requestFields: Map<String, String> = emptyMap(),
	val activeYn: Boolean? = null,
	val createClientScope: Boolean? = null,
)

data class MasterDataAddRequestResponse(
	val id: Long,
	val tenantId: Long,
	val clientId: Long,
	val requestType: MasterDataAddRequestType,
	val status: MasterDataAddRequestStatus,
	val title: String,
	val requestFields: Map<String, String>,
	val requestMemo: String?,
	val requestedBy: Long?,
	val requestedAt: LocalDateTime,
	val reviewedBy: Long?,
	val reviewedAt: LocalDateTime?,
	val reviewComment: String?,
	val appliedMasterType: MasterType?,
	val appliedMasterItemId: Long?,
)
