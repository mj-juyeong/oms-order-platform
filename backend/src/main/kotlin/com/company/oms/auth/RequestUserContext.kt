package com.company.oms.auth

object RequestUserContext {
	private val currentUserHolder = ThreadLocal<CurrentUser?>()

	fun set(currentUser: CurrentUser?) {
		currentUserHolder.set(currentUser)
	}

	fun get(): CurrentUser? = currentUserHolder.get()

	fun clear() {
		currentUserHolder.remove()
	}
}
