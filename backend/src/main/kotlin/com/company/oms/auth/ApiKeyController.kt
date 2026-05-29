package com.company.oms.auth

import com.company.oms.common.response.PageResponse
import org.springframework.context.annotation.Profile
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/api-keys")
@Profile("local")
class ApiKeyController(
	private val apiKeyService: ApiKeyService,
) {

	@GetMapping
	fun listApiKeys(
		@RequestParam tenantId: Long,
		@RequestParam(required = false) status: String?,
		@RequestParam(defaultValue = "0") page: Int,
		@RequestParam(defaultValue = "20") size: Int,
	): PageResponse<ApiKeyResponse> =
		apiKeyService.listApiKeys(
			tenantId = tenantId,
			status = status,
			page = page,
			size = size,
		)

	@PostMapping
	fun createApiKey(
		@RequestBody request: CreateApiKeyRequest,
	): CreateApiKeyResponse = apiKeyService.createApiKey(request)

	@PatchMapping("/{apiKeyId}")
	fun updateApiKey(
		@PathVariable apiKeyId: Long,
		@RequestBody request: UpdateApiKeyRequest,
	): ApiKeyMutationResponse = apiKeyService.updateApiKey(apiKeyId, request)

	@PostMapping("/{apiKeyId}/revoke")
	fun revokeApiKey(
		@PathVariable apiKeyId: Long,
		@RequestBody(required = false) request: RevokeApiKeyRequest?,
	): ApiKeyMutationResponse =
		apiKeyService.revokeApiKey(apiKeyId, request ?: RevokeApiKeyRequest())
}
