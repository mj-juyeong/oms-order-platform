package com.company.oms.label

import com.company.oms.common.persistence.LabelType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface LabelLineRepository : JpaRepository<LabelLineEntity, Long>, JpaSpecificationExecutor<LabelLineEntity> {
	fun findAllByTenantIdAndClientIdAndBatchId(
		tenantId: Long,
		clientId: Long,
		batchId: Long,
	): List<LabelLineEntity>

	fun findAllByTenantIdAndClientIdAndBatchIdAndLabelType(
		tenantId: Long,
		clientId: Long,
		batchId: Long,
		labelType: LabelType,
	): List<LabelLineEntity>

	fun findAllByTenantIdAndClientIdAndQrCode(
		tenantId: Long,
		clientId: Long,
		qrCode: String,
	): List<LabelLineEntity>

	@Query(
		"""
		select l
		from LabelLineEntity l
		where l.tenantId = :tenantId
		  and l.clientId = :clientId
		  and l.batchId = :batchId
		  and (:labelType is null or l.labelType = :labelType)
		  and (:storeCode is null or l.storeCode = :storeCode)
		  and (:brandName is null or lower(l.brandName) like lower(concat('%', :brandName, '%')))
		  and (:productCode is null or l.productCode = :productCode)
		  and (:orderNo is null or l.orderNo = :orderNo)
		  and (:matchingCode is null or l.matchingCode = :matchingCode)
		  and (:qrCode is null or l.qrCode = :qrCode)
		order by l.labelType asc, l.id asc
		""",
	)
	fun findAllForDownload(
		@Param("tenantId") tenantId: Long,
		@Param("clientId") clientId: Long,
		@Param("batchId") batchId: Long,
		@Param("labelType") labelType: LabelType?,
		@Param("storeCode") storeCode: String?,
		@Param("brandName") brandName: String?,
		@Param("productCode") productCode: String?,
		@Param("orderNo") orderNo: String?,
		@Param("matchingCode") matchingCode: String?,
		@Param("qrCode") qrCode: String?,
	): List<LabelLineEntity>
}
