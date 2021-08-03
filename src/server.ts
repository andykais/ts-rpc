import type { RequestContract, ResponseContract, SuccessfulResponse, FailedResponse } from './contracts'
import type { ApiFunction, ApiSpec } from './types'


// ============================== Util Types ============================== \\

export type CreateServerApiFunction<T extends ApiFunction> = (...args: Parameters<T>) => Promise<ReturnType<T>>

export type CreateServerApi<T extends ApiSpec> = {
  [K in keyof T]: T[K] extends ApiSpec ? CreateServerApi<T[K]> : T[K] extends ApiFunction ? CreateServerApiFunction<T[K]> : never
}

interface BareMinimumRequest {
  on(event: string, listener: (data: any) => void): this
}
interface BareMinimumResponse {
  writeHead(status: number, headers: {[key: string]: string}): void
  end(response: any): void
}
// ========================= Runtime Implementation ======================== \\

class RPCServer<T extends ApiSpec> {
  public constructor(private server_api: CreateServerApi<T>) {
    this.request_handler = this.request_handler.bind(this)
  }

  private async get_request_body(req: BareMinimumRequest): Promise<RequestContract> {
    const buffer: Buffer[] = []
    return new Promise((resolve, reject) => {
      req
        .on('data', (chunk: Buffer) => {
          buffer.push(chunk)
        })
        .on('end', () => {
          const body_str = Buffer.concat(buffer).toString()
          const body = JSON.parse(body_str)
          resolve(body)
        })
        .on('error', reject)
    })
  }
  private success(result: any): SuccessfulResponse {
    return { result }
  }
  private error(name: string = '', message: string = '', data: any = null): FailedResponse {
    return { error: { name, message, data } }
  }
  private send(res: BareMinimumResponse, response: ResponseContract) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(response))
  }
  public async request_handler(req: BareMinimumRequest, res: BareMinimumResponse, next: any) {

    const { module_path, method, params } = await this.get_request_body(req)
    // this is where types go to die
    const server_api_module = module_path.reduce((api, module) => api[module], this.server_api as any)
    if (!server_api_module) return this.send(res, this.error('ModuleNotFound', `module ${module_path.join('.')} doesnt exist on the server.`))
    if (!server_api_module[method]) return this.send(res, this.error('MethodNotFound', `Method ${method} doesnt exist on the server.`))
    const result = await server_api_module[method](...params)
      .catch((e: any) => this.error(e.name, e.toString(), e.data))
      .then((v: any) => ({ result: v }))
    this.send(res, result)
  }
}

function create_rpc_server<T extends ApiSpec>(server_api: CreateServerApi<T>) {
  const rpc_server = new RPCServer(server_api)
  return rpc_server.request_handler
}

export { create_rpc_server }
