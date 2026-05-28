package com.company.oms

import org.flywaydb.core.Flyway
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfSystemProperty
import org.testcontainers.containers.MySQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers

@Testcontainers
@EnabledIfSystemProperty(named = "oms.test.db", matches = "true")
class MigrationSmokeTest {

	@Test
	fun initialSchemaMigrationAppliesToMySql() {
		val flyway = Flyway.configure()
			.dataSource(mysql.jdbcUrl, mysql.username, mysql.password)
			.locations("classpath:db/migration")
			.load()

		val result = flyway.migrate()

		assertTrue(result.migrationsExecuted >= 1)
	}

	companion object {
		@Container
		@JvmStatic
		val mysql: OmsMySqlContainer = OmsMySqlContainer("mysql:8.4")
			.withDatabaseName("oms")
			.withUsername("oms")
			.withPassword("change-me")
	}
}

class OmsMySqlContainer(imageName: String) : MySQLContainer<OmsMySqlContainer>(imageName)
