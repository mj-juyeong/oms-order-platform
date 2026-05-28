package com.company.oms.upload.storage

import java.io.InputStream

interface FileStorage {
    fun store(command: StoreFileCommand): StoredFile
}

data class StoreFileCommand(
    val originalFileName: String,
    val contentType: String?,
    val size: Long,
    val inputStream: InputStream,
    val directory: String,
)
