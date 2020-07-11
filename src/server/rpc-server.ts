import {
  EventStream,
  EventsDefinition,
  ApiFunction,
  ApiModule,
  ApiDefinition,
  ArgumentTypes
} from '../types'
import { RequestContract, ResponseContract, SuccessfulResponse, FailedResponse } from '../contracts'
import * as http from 'http'

// ========================================================================
// ======================= Server Types ===================================
// ======================= ================================================

// interface ClientEmitterClass<Params extends any[], Events extends EventsDefinition> {
//   new (...args: Params): ClientEmitter<Events>
// }

// // prettier-ignore
// type ClientRestFunction<T extends ApiFunction> = (...args: ArgumentTypes<T>) => Promise<ReturnType<T>>

// type GenerateClientApiFunction<T extends ApiFunction> = ReturnType<T> extends EventStream<infer R>
//   ? ClientEmitterClass<ArgumentTypes<T>, R>
//   : ClientRestFunction<T>

type ServerContextWithEvents<T extends EventsDefinition> = { sse: SSEEmitter<T> }

type ServerEmitterThisFunction<T extends ApiFunction, Events extends EventsDefinition> = (
  this: ServerContextWithEvents<Events>,
  ...args: ArgumentTypes<T>
) => Promise<void>

type ServerRestFunction<T extends ApiFunction> = (
  ...args: ArgumentTypes<T>
) => Promise<ReturnType<T>>

type GenerateServerApiFunction<T extends ApiFunction> = ReturnType<T> extends EventStream<infer R>
  ? ServerEmitterThisFunction<T, R>
  : ServerRestFunction<T>

// interface ServerEmitterI<T> {
//   'rpc-internal-class-identifier': 'sse'
// }
// type GenerateServerReturnType<T> = T extends EventStream<infer R> ? ServerEmitterI<R> : T
// type GenerateServerEmitFunction<T extends EventsDefinition> = {}

// prettier-ignore
type GenerateServerApiModule<T extends ApiModule> = {
  // [K in keyof T]: (...args: ArgumentTypes<T[K]>) => Promise<ReturnType<T[K]>>
  // [K in keyof T]: (...args: ArgumentTypes<T[K]>) => Promise<GenerateServerReturnType<ReturnType<T[K]>>>
  [K in keyof T]: GenerateServerApiFunction<T[K]>
}
type GenerateServerApi<T extends ApiDefinition> = {
  [K in keyof T]: GenerateServerApiModule<T[K]>
}

export {
  GenerateServerApiModule,
  GenerateServerApi
  // ServerEmitterI,
}

// ========================================================================
// ======================= SSE Implementation =============================
// ======================= ================================================
const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

class SSEEmitter<T extends EventsDefinition> {
  constructor(private req: http.IncomingMessage, private res: http.ServerResponse) {
    this.emit = this.emit.bind(this as any)
    // this.globalEmit = this.globalEmit.bind(this as any)
  }

  /** emit to the EventSource that instantiated this emitter */
  emit<E extends keyof T>(event: E, ...data: T[E]): boolean
  emit(event: string, ...data: any[]) {
    return false
  }

  /** emit to any EventSource that passed in the same parameters (URL + query params) */
  // globalEmit<E extends keyof T>(event: E, ...data: T[E]): boolean
  // globalEmit(event: string, ...data: any[]) {
  //   return false
  // }
}

// class RPCEmitter<T extends EventsDefinition> {
//   emit(event: string, ...data: any[]): boolean {
//     return false
//   }
// }

// class TimeoutError extends Error {
//   constructor(timeout: number) {
//     super(`Emitter timed out after ${timeout}ms`)
//   }
// }

// class ServerEmitter implements ServerEmitterI {
//   ['rpc-internal-class-identifier'] = 'sse'
//   private connected: boolean
//   private handleConnection?: Function

//   constructor() {
//     this.connected = false

//     // generate unique id
//     // pass id to global stream listener
//   }

//   emit(event: string, ...data: any[]): boolean {
//     // return res.write(`data: ${data}\n\n`)
//     return false
//   }

//   // must wait for a connection before calling emit()
//   waitForConn(timeoutMs = 1000) {
//     const connTimeout = timeout(timeoutMs).then(() => {
//       throw new TimeoutError(timeoutMs)
//     })
//     const connected = new Promise(resolve => (this.handleConnection = resolve))
//     return Promise.race([connTimeout, connected])
//   }

//   onConnect() {
//     this.connected = true
//     if (this.handleConnection) this.handleConnection()
//   }
//   onClose() {}
//   close() {}
// }

// ========================================================================
// ======================= REST Implementation ============================
// ======================= ================================================
function getRequestBody(req: http.IncomingMessage): Promise<RequestContract> {
  const buffer: Buffer[] = []
  return new Promise((resolve, reject) => {
    req
      .on('data', (chunk: Buffer) => {
        buffer.push(chunk)
      })
      .on('end', () => {
        const bodyStr = Buffer.concat(buffer).toString()
        const body = JSON.parse(bodyStr)
        resolve(body)
      })
      .on('error', reject)
  })
}

function success(result: any): SuccessfulResponse {
  return { result }
}
function error(code: string, message: string): FailedResponse {
  return { error: { code, message } }
}
function send(res: http.ServerResponse, response: ResponseContract) {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(response))
}

const rpcServer = <T extends ApiDefinition>(api: GenerateServerApi<T>) => async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  try {
    const body: RequestContract = await getRequestBody(req)
    const { module, method, params } = body
    if (api[module]) {
      if (api[module][method]) {
        try {
          const thisContext = {
            emit: (e: string) => {
              console.log('emit', e)
            },
            [method]: api[module][method]
          }
          const result = await (thisContext[method] as any)(...params)
          // const result = await api[module][method](...params)
          send(res, success(result))
        } catch (e) {
          send(res, error(e.code, e.message))
        }
      } else {
        // prettier-ignore
        send(res, error('MethodNotFound', `Method ${method} doesnt exist on the server. Method(s) available: ${Object.keys(api[module])}`))
      }
    } else {
      // prettier-ignore
      send(res, error('ModuleNotFound', `module ${module} doesnt exist on the server. Module(s) available: ${Object.keys(api)}`))
    }
  } catch (e) {
    send(res, error('Error', e.toString()))
  }
}

function createRPCServer<T extends ApiDefinition>(api: GenerateServerApi<T>) {
  return rpcServer(api)
}

export { createRPCServer }
