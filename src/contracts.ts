const RESERVED_NAMES = [
  'manager',
  'request',
  'context',
  '__SSE__',
] as const

interface ErrorContract {
  reason: string
  message: string
  callstack: string | undefined
}

export interface RequestContract {
  type: '__REQUEST__'
  namespace: string[]
  params: any[]
}

interface EventBaseContract {
  type: '__SSE__'
  event_type: string
}

export interface EventRequestMessage extends EventBaseContract {
  event_type: 'request'
}

export interface EventConnectedMessage extends EventBaseContract {
  event_type: 'connected'
}

export interface EventEmitMessage extends EventBaseContract {
  event_type: 'emit'
  event: {
    namespace: string[]
    name: string
    data: any
  }
}

export type EventContract =
  | EventConnectedMessage
  | EventEmitMessage

// export interface RequestEventSourceContract {
//   type: '__SSE__'
// }

// export interface EventSourceConnectedContract {
//   type: '__SSE__'
//   status: 'connected'
// }

/** returned from a server route handler if no errors occur */
export interface SuccessfulResponse {
  result: any
}
/** returned if an error occurs in the server route handler */
export interface FailedResponse {
  error: ErrorContract
}
export type ResponseContract = SuccessfulResponse | FailedResponse

// export interface EventContract {
//   type: '__SSE__'
//   namespace: string[]
//   event: {
//     name: string
//     data: any
//   }
// }
