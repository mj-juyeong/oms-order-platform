package com.company.oms.master

import com.company.oms.common.persistence.BaseTimeEntity
import com.company.oms.common.persistence.MasterDataAddRequestStatus
import com.company.oms.common.persistence.MasterDataAddRequestType
import com.company.oms.common.persistence.MasterType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "master_data_add_requests")
class MasterDataAddRequestEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Enumerated(EnumType.STRING)
	@Column(name = "request_type", nullable = false, length = 32)
	var requestType: MasterDataAddRequestType = MasterDataAddRequestType.PRODUCT,

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 32)
	var status: MasterDataAddRequestStatus = MasterDataAddRequestStatus.REQUESTED,

	@Column(name = "title", nullable = false, length = 255)
	var title: String = "",

	@Column(name = "request_payload_json", columnDefinition = "json")
	var requestPayloadJson: String? = null,

	@Column(name = "request_memo", columnDefinition = "text")
	var requestMemo: String? = null,

	@Column(name = "requested_by")
	var requestedBy: Long? = null,

	@Column(name = "requested_at", nullable = false)
	var requestedAt: LocalDateTime = LocalDateTime.now(),

	@Column(name = "reviewed_by")
	var reviewedBy: Long? = null,

	@Column(name = "reviewed_at")
	var reviewedAt: LocalDateTime? = null,

	@Column(name = "review_comment", columnDefinition = "text")
	var reviewComment: String? = null,

	@Enumerated(EnumType.STRING)
	@Column(name = "applied_master_type", length = 32)
	var appliedMasterType: MasterType? = null,

	@Column(name = "applied_master_item_id")
	var appliedMasterItemId: Long? = null,
) : BaseTimeEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}
