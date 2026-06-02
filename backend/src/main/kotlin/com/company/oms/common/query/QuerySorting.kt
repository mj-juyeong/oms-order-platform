package com.company.oms.common.query

enum class QuerySortDirection {
	ASC,
	DESC,
	;

	companion object {
		fun from(value: String?): QuerySortDirection =
			if (value.equals("desc", ignoreCase = true)) DESC else ASC
	}
}

fun <T> List<T>.sortedByQuery(
	sortBy: String?,
	sortDirection: String?,
	defaultSortBy: String,
	allowedSortFields: Set<String>,
	valueSelector: (T, String) -> Comparable<*>?,
): List<T> {
	val resolvedSortBy = sortBy?.trim()?.takeIf { it in allowedSortFields } ?: defaultSortBy
	val direction = QuerySortDirection.from(sortDirection)

	return sortedWith { left, right ->
		val primary = compareSortValues(valueSelector(left, resolvedSortBy), valueSelector(right, resolvedSortBy))
			.withDirection(direction)
		if (primary != 0) {
			primary
		} else {
			compareSortValues(valueSelector(left, "id"), valueSelector(right, "id"))
		}
	}
}

@Suppress("UNCHECKED_CAST")
private fun compareSortValues(
	left: Comparable<*>?,
	right: Comparable<*>?,
): Int =
	when {
		left == null && right == null -> 0
		left == null -> 1
		right == null -> -1
		else -> (left as Comparable<Any>).compareTo(right)
	}

private fun Int.withDirection(direction: QuerySortDirection): Int =
	if (direction == QuerySortDirection.DESC) -this else this
