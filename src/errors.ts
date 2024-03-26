import * as contracts from './contracts.ts'


class RouteParseError extends Error {
  constructor(route: string) {
    super(`Failed to parse route '${route}'`)
  }
}

class RPCError extends Error {
  constructor(public reason: string, public message: string, additionalContext?: string) {
    super(
      additionalContext
        ? `${additionalContext} error: ${message}. Reason: ${reason}`
        : `RPC error: ${message}. Reason: ${reason}`
    )
  }
}

class RoutingError extends RPCError {
  constructor(request_contract: contracts.RequestContract) {
    super(`ROUTING`, `Invalid route supplied from client to ${request_contract.namespace.join('.')}. Likely a mismatch between api definitions`)
  }
}

export { RPCError, RouteParseError, RoutingError }
