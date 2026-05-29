package com.company.oms.validation

import com.company.oms.common.persistence.CreatedAtEntity
import com.company.oms.common.persistence.UploadDomain
import com.company.oms.common.persistence.ValidationSeverity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "validation_errors")
class ValidationErrorEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "batch_id", nullable = false)
	var batchId: Long = 0,

	@Enumerated(EnumType.STRING)
	@Column(name = "severity", nullable = false, length = 16)
	var severity: ValidationSeverity = ValidationSeverity.ERROR,

	@Column(name = "error_code", nullable = false, length = 64)
	var errorCode: String = "",

	@Enumerated(EnumType.STRING)
	@Column(name = "domain", nullable = false, length = 32)
	var domain: UploadDomain = UploadDomain.ORDER,

	@Column(name = "sheet_name", length = 255)
	var sheetName: String? = null,

	@Column(name = "row_no")
	var rowNo: Int? = null,

	@Column(name = "column_name", length = 255)
	var columnName: String? = null,

	@Column(name = "line_table", length = 64)
	var lineTable: String? = null,

	@Column(name = "line_id")
	var lineId: Long? = null,

	@Column(name = "message", nullable = false, columnDefinition = "text")
	var message: String = "",

	@Column(name = "original_value", columnDefinition = "text")
	var originalValue: String? = null,

	@Column(name = "normalized_value", columnDefinition = "text")
	var normalizedValue: String? = null,

	@Column(name = "resolved_yn", nullable = false)
	var resolvedYn: Boolean = false,
) : CreatedAtEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

