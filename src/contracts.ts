import { RichJson } from './types.ts'

export const ContentType = 'application/msgpack'

interface ErrorContract {
  name: string
  message: string
  data: RichJson
}

export interface RequestContract {
  module_path: string[]
  method: string
  params: RichJson[]
}

/** returned from a server route handler if no errors occur */
export interface SuccessfulResponse {
  result: RichJson
}
/** returned if an error occurs in the server route handler */
export interface FailedResponse {
  error: ErrorContract
}
export type ResponseContract = SuccessfulResponse | FailedResponse

export class BrokenContractError extends Error {}
