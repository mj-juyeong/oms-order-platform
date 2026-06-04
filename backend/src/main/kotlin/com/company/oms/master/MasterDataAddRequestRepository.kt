package com.company.oms.master

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor

interface MasterDataAddRequestRepository :
	JpaRepository<MasterDataAddRequestEntity, Long>,
	JpaSpecificationExecutor<MasterDataAddRequestEntity>
