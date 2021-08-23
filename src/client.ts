import { RequestContract, ResponseContract } from './contracts'
import { Json, ApiFunction, ApiSpec, RPCError } from './types'


// ============================== Util Types ============================== \\

export type CreateClientApiFunction<T extends ApiFunction> = (...args: Parameters<T>) => Promise<ReturnType<T>>

export type CreateClientApi<T extends ApiSpec> = {
  [K in keyof T]: T[K] extends ApiSpec ? CreateClientApi<T[K]> : T[K] extends ApiFunction ? CreateClientApiFunction<T[K]> : never
  // [K in keyof T]: T[K] extends ApiSpec ? string : number//: T[K] extends ApiSpec ? CreateClientApi<T[K]> : never
}


// ========================= Runtime Implementation ======================== \\
interface RPCClientOptions {
  fetch?: typeof fetch
  common_errors?: typeof RPCError[]
}

class RestClient<T extends ApiSpec> {
  public headers = {'Content-Type': 'application/json'}
  public registered_errors: { [error_classname: string]: typeof RPCError } = {}
  public fetch_impl: typeof fetch | undefined

  public constructor(public rpc_route: string, options: RPCClientOptions = {}) {
    if (options.fetch) this.fetch_impl = options.fetch
    else this.fetch_impl = fetch
    const { common_errors = [] } = options
    for (const error of common_errors) {
      if (this.registered_errors.hasOwnProperty(error.name)) throw new Error(`Duplicate error class name ${error.name}. Two common error classes must not share the same name. ts-rpc relies on unique names to encode/decode errors.`)
      this.registered_errors[error.name] = error
    }
  }

  public request_rpc = async (module_path: string[], method: string, params: any[]) => {
    const contract: RequestContract = { module_path, method, params }
    const options = {
      method: 'PUT',
      body: JSON.stringify(contract),
      headers: this.headers,
    }
    const fetch_impl = this.fetch_impl ?? fetch
    const response = await fetch_impl(this.rpc_route, options)
    const body: ResponseContract = await response.json()
    if ('error' in  body) {
      if (this.registered_errors.hasOwnProperty(body.error.name)) {
        const error_class = this.registered_errors[body.error.name]
        // we _can_ attach stack traces here. I'm just not convinced its a good idea anymore
        throw new error_class(body.error.message, body.error.data)
      } else {
        throw new Error(body.error.message)
      }
    }
    else return body.result
  }
}

class InvokeProxyTarget {}
function create_rpc_proxy<T extends ApiSpec>(rpc_client: RestClient<T>, module_path: string[]): any {
  return new Proxy(InvokeProxyTarget, {
    get: (target: any, prop: string) => {
      return create_rpc_proxy(rpc_client, [...module_path, prop])
    },
    apply: async (target: any, prop: any, args: Json[]) => {
      if  (module_path.length === 0) throw new Error(`Not a function`)
      const [method] = module_path.slice(-1)
      return await rpc_client.request_rpc(module_path.slice(0, -1), method, args)
    },
  })
}

function create_rpc_client<T extends ApiSpec>(rpc_route: string, options: RPCClientOptions = {}): CreateClientApi<T> {
  const rest_client = new RestClient<T>(rpc_route, options)
  return create_rpc_proxy<T>(rest_client, [])
}

export { create_rpc_client }
