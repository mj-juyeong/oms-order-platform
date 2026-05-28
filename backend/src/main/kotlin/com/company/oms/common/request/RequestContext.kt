package com.company.oms.common.request

object RequestContext {
    private val requestIdHolder = ThreadLocal<String>()

    fun setRequestId(requestId: String) {
        requestIdHolder.set(requestId)
    }

    fun getRequestId(): String = requestIdHolder.get() ?: RequestIdGenerator.generate()

    fun clear() {
        requestIdHolder.remove()
    }
}
