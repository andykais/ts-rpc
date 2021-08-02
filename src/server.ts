import { ApiFunction, ApiSpec } from './types'


// ============================== Util Types ============================== \\

export type CreateServerApiFunction<T extends ApiFunction> = (...args: Parameters<T>) => Promise<ReturnType<T>>

export type CreateServerApi<T extends ApiSpec> = {
  [K in keyof T]: T[K] extends ApiSpec ? CreateServerApi<T[K]> : T[K] extends ApiFunction ? CreateServerApiFunction<T[K]> : never
}

// ========================= Runtime Implementation ======================== \\

class RPCServer<T extends ApiSpec> {
  constructor(private server_api: CreateServerApi<T>) {}

  public request_handler(req: Request, res: Response) {
  }
}

function createRPCServer<T extends ApiSpec>(server_api: CreateServerApi<T>) {
  const rpc_server = new RPCServer(server_api)
  return rpc_server.request_handler
}

export { createRPCServer }
