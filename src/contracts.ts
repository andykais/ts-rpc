const RESERVED_NAMES = [
  'manager',
  'context',
] as const

interface ErrorContract {
  reason: string
  message: string
}

export interface RequestContract {
  namespace: string[]
  params: any[]
}

/** returned from a server route handler if no errors occur */
export interface SuccessfulResponse {
  result: any
}
/** returned if an error occurs in the server route handler */
export interface FailedResponse {
  error: ErrorContract
}
export type ResponseContract = SuccessfulResponse | FailedResponse
