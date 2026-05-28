package com.company.oms.upload.storage

import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path
import java.security.MessageDigest
import java.util.UUID

@Component
class LocalFileStorage(
    private val properties: FileStorageProperties,
) : FileStorage {

    override fun store(command: StoreFileCommand): StoredFile {
        val targetDirectory = Path.of(properties.rootPath, command.directory).normalize()
        Files.createDirectories(targetDirectory)

        val storedFileName = "${UUID.randomUUID()}-${command.originalFileName}"
        val targetPath = targetDirectory.resolve(storedFileName).normalize()
        val bytes = command.inputStream.use { it.readAllBytes() }
        Files.write(targetPath, bytes)

        return StoredFile(
            originalFileName = command.originalFileName,
            storedPath = targetPath.toString(),
            fileHash = sha256(bytes),
            fileSize = command.size,
            contentType = command.contentType,
        )
    }

    private fun sha256(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.joinToString(separator = "") { "%02x".format(it) }
    }
}
