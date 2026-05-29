package com.company.oms.common.response

import com.company.oms.common.error.ErrorCode
import com.company.oms.common.error.OmsException

fun validatePageRequest(
	page: Int,
	size: Int,
) {
	if (page < 0 || size !in 1..500) {
		throw OmsException(
			errorCode = ErrorCode.INVALID_REQUEST,
			message = "page는 0 이상, size는 1 이상 500 이하로 요청해야 합니다.",
		)
	}
}

fun <T> List<T>.toPageResponse(
	page: Int,
	size: Int,
): PageResponse<T> {
	validatePageRequest(page, size)

	val fromIndex = page * size
	val items =
		if (fromIndex >= this.size) {
			emptyList()
		} else {
			subList(fromIndex, minOf(fromIndex + size, this.size))
		}

	return PageResponse(
		items = items,
		page = page,
		size = size,
		totalElements = this.size.toLong(),
		totalPages = if (this.isEmpty()) 0 else ((this.size - 1) / size) + 1,
	)
}
