import * as contracts from './contracts.ts'


class RouteParseError extends Error {
  constructor(route: string) {
    super(`Failed to parse route '${route}'`)
  }
}

class ServerError extends Error {
  #stack?: string

  constructor(public reason: string, public server_message: string, public server_callstack?: string) {
    const error_message = `${reason} server error: '${server_message}'`
    // const error_message = additionalContext
    //     ? `${additionalContext} error: ${message}. Reason: ${reason}`
    //     : `RPC error: ${message}. Reason: ${reason}`
    console.log({error_message})

    // const error_options: ErrorOptions = {}
    // client side only arg
    // if (server_callstack) {
    //   console.log('server error respresentation')
    //   const server_error = new ServerErrorClientRepresentation(server_message, server_callstack)
    //   console.log({server_callstack})
    //   // const error2 = new Error('foo')
    //   // server_error.stack = server_callstack
    //   // server_error.stack = new Error('foo').stack
    //   // server_error.stack = server_error.stack
    //   console.log({stack: server_error.stack})
    //   error_options.cause = server_error
    //   // console.log('server_error:', server_error)
    //   // console.log('server_error.stack:', server_error.stack)
    // }
    // super(error_message, error_options)
    // if (server_callstack) {
    //   console.log('remote guy...')
    //   const server_error_client_representation = new ServerErrorClientRepresentation(server_message, server_callstack)
    //   super(`Remote error: ${server_message}`, { cause: server_error_client_representation })
    // } else {
    //   super(`Remote error: ${server_message}`)
    // }
    super(error_message)
  }
}

// export class RemoteError extends Error {
//   constructor(public reason: string, message: string, server_callstack: string) {
//     const server_error_client_representation = new ServerErrorClientRepresentation(message, server_callstack)
//     super(`Remote error: ${message}`, { cause: server_error_client_representation })
//   }
// }


// class ServerErrorClientRepresentation extends Error {
//   constructor(message: string, server_callstack: string) {
//     super(message)

//     const prepare_stack_trace = Error.prepareStackTrace
//     Error.prepareStackTrace = () => {
//       console.log('prepareStackTrace called')
//       // console.log({server_callstack})
//       return server_callstack
//     }
//     // `stack` contains the correct representation, but printing the error does not
//     const stack = this.stack
//     Error.prepareStackTrace = prepare_stack_trace
//     console.log({stack})

//     // // Error.captureStackTrace
//     // this.#stack = server_callstack
//     // ServerErrorClientRepresentation.prepareStackTrace = this.#prepareStackTrace
//     // this.stack = server_callstack
//   }
// }
// class ServerErrorClientRepresentation extends Error {
//   constructor(message: string, server_callstack: string) {
//     super(message)

//     const prepare_stack_trace = Error.prepareStackTrace
//     Error.prepareStackTrace = () => {
//       console.log('prepareStackTrace called')
//       // console.log({server_callstack})
//       return server_callstack
//     }
//     // `stack` contains the correct representation, but printing the error does not
//     const stack = this.stack
//     Error.prepareStackTrace = prepare_stack_trace

//     // // Error.captureStackTrace
//     // this.#stack = server_callstack
//     // ServerErrorClientRepresentation.prepareStackTrace = this.#prepareStackTrace
//     // this.stack = server_callstack
//   }

//   // #prepareStackTrace(...args: any[]) {
//   //   // console.log({args})
//   //   return 'foobar'
//   // }

//   // get stack(): string | undefined {
//   //   console.log('ye Im the getter')
//   //   return this.#stack
//   // }
// }

class RoutingError extends ServerError {
  constructor(request_contract: contracts.RequestContract) {
    super(`ROUTING`, `Invalid route supplied from client to ${request_contract.namespace.join('.')}. Likely a mismatch between api definitions`)
  }
}

export { ServerError, RouteParseError, RoutingError }
