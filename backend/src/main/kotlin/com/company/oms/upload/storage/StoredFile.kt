package com.company.oms.upload.storage

data class StoredFile(
    val originalFileName: String,
    val storedPath: String,
    val fileHash: String,
    val fileSize: Long,
    val contentType: String?,
)
