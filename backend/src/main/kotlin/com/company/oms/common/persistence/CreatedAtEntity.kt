package com.company.oms.common.persistence

import jakarta.persistence.Column
import jakarta.persistence.MappedSuperclass
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

@MappedSuperclass
abstract class CreatedAtEntity {
	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	var createdAt: LocalDateTime? = null
}

