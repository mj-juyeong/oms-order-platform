package com.company.oms.master

import com.company.oms.common.persistence.CreatedAtEntity
import com.company.oms.common.persistence.MasterType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "master_upload_row_errors")
class MasterUploadRowErrorEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "master_upload_batch_id", nullable = false)
	var masterUploadBatchId: Long = 0,

	@Enumerated(EnumType.STRING)
	@Column(name = "master_type", nullable = false, length = 32)
	var masterType: MasterType = MasterType.PRODUCT,

	@Column(name = "row_no", nullable = false)
	var rowNo: Int = 0,

	@Column(name = "column_name", nullable = false, length = 255)
	var columnName: String = "",

	@Column(name = "error_code", nullable = false, length = 64)
	var errorCode: String = "",

	@Column(name = "message", nullable = false, columnDefinition = "text")
	var message: String = "",

	@Column(name = "original_value", columnDefinition = "text")
	var originalValue: String? = null,

	@Column(name = "key_value", length = 255)
	var keyValue: String? = null,

	@Column(name = "raw_row_json", columnDefinition = "json")
	var rawRowJson: String? = null,
) : CreatedAtEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}
