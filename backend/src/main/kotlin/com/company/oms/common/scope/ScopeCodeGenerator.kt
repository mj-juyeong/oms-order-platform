package com.company.oms.common.scope

import java.text.Normalizer

internal fun normalizeObjectCode(value: String): String =
	value.trim()
		.let { Normalizer.normalize(it, Normalizer.Form.NFKC) }
		.uppercase()
		.replace(Regex("[^A-Z0-9]+"), "_")
		.trim('_')
		.take(64)

internal fun generateUniqueObjectCode(
	sourceName: String,
	fallbackPrefix: String,
	exists: (String) -> Boolean,
): String {
	val normalizedName = normalizeObjectCode(sourceName)
	if (normalizedName.isNotBlank()) {
		return uniqueCode(normalizedName, exists)
	}

	for (index in 1..9999) {
		val candidate = "${fallbackPrefix}_${index.toString().padStart(3, '0')}"
		if (!exists(candidate)) {
			return candidate
		}
	}

	return uniqueCode(fallbackPrefix, exists)
}

private fun uniqueCode(
	base: String,
	exists: (String) -> Boolean,
): String {
	if (!exists(base)) {
		return base
	}

	for (index in 2..9999) {
		val suffix = "_$index"
		val trimmedBase = base.take(64 - suffix.length).trimEnd('_')
		val candidate = "$trimmedBase$suffix"
		if (!exists(candidate)) {
			return candidate
		}
	}

	error("Unable to generate a unique code.")
}
