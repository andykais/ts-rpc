interface ErrorContract {
  code: string
  message: string
}

interface RequestContract {
  module: string
  method: string
  params: any[]
}

/** returned from a server route handler if no errors occur */
interface SuccessfulResponse {
  result: any
}
/** returned if an error occurs in the server route handler */
interface FailedResponse {
  error: ErrorContract
}
type ResponseContract = SuccessfulResponse | FailedResponse

// note this is called like so:
// /<rpc-route>/?type=sse&module=<module>&method=<method>&params=<params>
interface RequestEventSourceContract {
  module: string
  method: string
  params: any[]
}
interface QueryEventContract {
  type: 'sse'
  module: string
  method: string
  params: string // params are json stringified
}
type QueryContract = QueryEventContract

/** returned when ServerEmitter::emit(event, ...data) is called */
interface MessageEventContract {
  // type: 'message'
  message: { event: string; data: any[] }
}
/** returned when ServerEmitter::close() is called */
interface CloseEventContract {
  // type: 'close'
  close: {}
}
/** returned if an error occurs in the server route handler only */
interface ErrorEventContract {
  // type: 'error'
  error: ErrorContract
}
type EventContract = MessageEventContract | CloseEventContract | ErrorEventContract

export {
  RequestContract,
  SuccessfulResponse,
  FailedResponse,
  ResponseContract,
  RequestEventSourceContract,
  QueryEventContract,
  QueryContract,
  MessageEventContract,
  CloseEventContract,
  ErrorEventContract,
  EventContract
}
