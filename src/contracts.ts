import { Json } from './types'

interface ErrorContract {
  name: string
  message: string
  data: Json
}

export interface RequestContract {
  module_path: string[]
  method: string
  params: Json[]
}

/** returned from a server route handler if no errors occur */
interface SuccessfulResponse {
  result: Json
}
/** returned if an error occurs in the server route handler */
interface FailedResponse {
  error: ErrorContract
}
export type ResponseContract = SuccessfulResponse | FailedResponse
