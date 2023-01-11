import type { RequestContract, ResponseContract, SuccessfulResponse, FailedResponse } from './contracts.ts'
import { ContentType, BrokenContractError } from './contracts.ts'
import { type Middleware } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import type { ApiFunction, ApiSpec } from './types.ts'
import * as msgpack from 'https://deno.land/x/msgpackr@v1.8.0/index.js'
import { Buffer } from "https://deno.land/std@0.170.0/node/buffer.ts";


// ============================== Util Types ============================== \\

export type CreateServerApiFunction<T extends ApiFunction> = (...args: Parameters<T>) => ReturnType<T> | Promise<ReturnType<T>>

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
  }

  private success(result: any): SuccessfulResponse {
    return { result }
  }
  private error(name: string = '', message: string = '', data: any = null): FailedResponse {
    return { error: { name, message, data } }
  }
  private send(res: BareMinimumResponse, response: ResponseContract) {
    res.writeHead(200, { 'Content-Type': ContentType })
    res.end(JSON.stringify(response))
  }

  private async handle_request(request_contract: RequestContract): Promise<ResponseContract> {
    const { module_path, method, params } = request_contract
    // this is where types go to die
    if (Array.isArray(module_path) === false) throw new BrokenContractError(`expected module_path to be a list of strings, is '${module_path}'`)
    const server_api_module = module_path.reduce((api, module) => {
      if (typeof module !== 'string') throw new BrokenContractError(`expected module_path to be list of strings, is '${module_path}'`)
      if (api[module] === undefined) throw new BrokenContractError(`module_path ${module_path} is undefined`)
      return api[module]
    }, this.server_api as any)
    if (!server_api_module) return this.error('ModuleNotFound', `module ${module_path.join('.')} doesnt exist on the server.`)
    if (!server_api_module[method]) return this.error('MethodNotFound', `Method ${method} doesnt exist on the server.`)
    try {
      const result = await server_api_module[method](...params)
      return { result }
    } catch(e) {
      console.error(e)
      return this.error(e.name, e.toString(), e.data)
    }
  }

  public oak_handler: Middleware = async (ctx, next) => {
    const body = await ctx.request.body()
    const bytes = await body.value
    const request_contract = msgpack.decode(bytes) as RequestContract
    ctx.response.body = msgpack.encode(await this.handle_request(request_contract))
    await next()
  }

  public express_handler = async (req: BareMinimumRequest, res: BareMinimumResponse, next: any) => {
    const chunks: Buffer[] = []
    const buffer: Buffer = await new Promise((resolve, reject) => {
      req
        .on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })
        .on('end', () => {
          resolve(Buffer.concat(chunks))
        })
        .on('error', reject)
    })
    const request_contract = msgpack.decode(buffer.buffer) as RequestContract 
    const result = await this.handle_request(request_contract)
    this.send(res, result)
  }

  public sveltekit_handler = async (args: { request: Request }) => {
    const blob = await args.request.blob()
    const buffer = await blob.arrayBuffer()
    const request_contract = msgpack.decode(buffer) as RequestContract
    const result = await this.handle_request(request_contract)
    return { body: result }
  }
}

function create_rpc_server<T extends ApiSpec>(server_api: CreateServerApi<T>) {
  const rpc_server = new RPCServer(server_api)
  return rpc_server
}

export { RPCServer, create_rpc_server }

