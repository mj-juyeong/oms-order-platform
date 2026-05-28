package com.company.oms.upload.storage

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "oms.file-storage")
data class FileStorageProperties(
    val rootPath: String = "./.local/uploads",
)
