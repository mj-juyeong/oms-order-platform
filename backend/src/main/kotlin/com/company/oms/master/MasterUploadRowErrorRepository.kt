package com.company.oms.master

import org.springframework.data.jpa.repository.JpaRepository

interface MasterUploadRowErrorRepository : JpaRepository<MasterUploadRowErrorEntity, Long> {
	fun findAllByMasterUploadBatchIdOrderByRowNoAscIdAsc(masterUploadBatchId: Long): List<MasterUploadRowErrorEntity>

	fun deleteAllByMasterUploadBatchId(masterUploadBatchId: Long)
}
