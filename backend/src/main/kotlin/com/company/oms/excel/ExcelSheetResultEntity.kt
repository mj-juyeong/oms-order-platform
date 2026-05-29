package com.company.oms.excel

import com.company.oms.common.persistence.CreatedAtEntity
import com.company.oms.common.persistence.SheetType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "excel_sheet_results")
class ExcelSheetResultEntity(
	@Column(name = "tenant_id", nullable = false)
	var tenantId: Long = 0,

	@Column(name = "client_id", nullable = false)
	var clientId: Long = 0,

	@Column(name = "batch_id", nullable = false)
	var batchId: Long = 0,

	@Column(name = "sheet_name", nullable = false, length = 255)
	var sheetName: String = "",

	@Enumerated(EnumType.STRING)
	@Column(name = "sheet_type", nullable = false, length = 32)
	var sheetType: SheetType = SheetType.UNKNOWN,

	@Column(name = "suffix_value", length = 100)
	var suffixValue: String? = null,

	@Column(name = "header_row_no")
	var headerRowNo: Int? = null,

	@Column(name = "data_row_count", nullable = false)
	var dataRowCount: Int = 0,

	@Column(name = "status", nullable = false, length = 32)
	var status: String = "PARSED",

	@Column(name = "message", length = 1000)
	var message: String? = null,
) : CreatedAtEntity() {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	var id: Long? = null
}

