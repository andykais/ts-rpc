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

interface RequestEventSourceContract {
  module: string
  method: string
  params: any[]
}
/** returned when ServerEmitter::emit(event, ...data) is called */
interface MessageEventContract {
  type: 'message'
  message: { event: string; data: any[] }
}
/** returned when ServerEmitter::close() is called */
interface CloseEventContract {
  type: 'close'
}
/** returned if an error occurs in the server route handler only */
interface ErrorEventContract {
  type: 'error'
  error: ErrorContract
}
type EventContract = MessageEventContract | CloseEventContract | ErrorEventContract

export {
  RequestContract,
  SuccessfulResponse,
  FailedResponse,
  ResponseContract,
  RequestEventSourceContract,
  MessageEventContract,
  CloseEventContract,
  ErrorEventContract,
  EventContract
}
