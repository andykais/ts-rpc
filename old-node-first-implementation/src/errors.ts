class RPCError extends Error {
  constructor(public code: string, public message: string, additionalContext?: string) {
    super(
      additionalContext
        ? `${additionalContext} error: ${message}. Code: ${code}`
        : `RPC error: ${message}. Code: ${code}`
    )
  }
}

export { RPCError }
