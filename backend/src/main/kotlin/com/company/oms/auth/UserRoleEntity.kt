package com.company.oms.auth

import com.company.oms.common.persistence.CreatedAtEntity
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity
@Table(name = "user_roles")
class UserRoleEntity(
	@EmbeddedId
	var id: UserRoleId = UserRoleId(),
) : CreatedAtEntity()

