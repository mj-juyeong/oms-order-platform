package com.company.oms.common.persistence

import jakarta.persistence.Column
import jakarta.persistence.MappedSuperclass
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime

@MappedSuperclass
abstract class BaseTimeEntity : CreatedAtEntity() {
	@UpdateTimestamp
	@Column(name = "updated_at")
	var updatedAt: LocalDateTime? = null
}

