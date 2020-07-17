import * as url from 'url'
import * as querystring from 'querystring'
import * as http from 'http'
import { EventEmitter } from 'events'
import {
  EventStream,
  EventsDefinition,
  ApiFunction,
  ApiModule,
  ApiDefinition,
  ArgumentTypes
} from './types'
import {
  RequestContract,
  ResponseContract,
  SuccessfulResponse,
  FailedResponse,
  MessageEventContract,
  CloseEventContract,
  ErrorEventContract,
  EventContract,
  QueryEventContract,
  QueryContract,
  RequestEventSourceContract
} from './internal/contracts'
import { RPCError } from './errors'

// ========================================================================
// ======================= Server Types ===================================
// ======================= ================================================

type ServerContextWithEvents<T extends EventsDefinition> = { sse: ServerEmitter<EventStream<T>> }

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

// prettier-ignore
type GenerateServerApiModule<T extends ApiModule> = {
  [K in keyof T]: GenerateServerApiFunction<T[K]>
}
type GenerateServerApi<T extends ApiDefinition> = {
  [K in keyof T]: GenerateServerApiModule<T[K]>
}

// ========================================================================
// ======================= SSE Implementation =============================
// ======================= ================================================
const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const SSE_CLOSE_TIMEOUT = 2000

type InferEventsDefinition<T> = T extends EventStream<infer R> ? R : never
class ServerEmitter<T extends EventStream<EventsDefinition>> extends EventEmitter {
  private closed: boolean
  private manualShutdown?: NodeJS.Timeout

  public constructor(private req: http.IncomingMessage, private res: http.ServerResponse) {
    super()
    this.closed = false
    this.req.on('close', () => {
      this.closed = true
      ;(this.emit as any)('close')
      if (this.manualShutdown) clearTimeout(this.manualShutdown)
    })

    this.res.on('close', () => {
      super.emit('close')
    })
  }

  /** emit to the EventSource that instantiated this emitter */
  public emit<E extends keyof InferEventsDefinition<T>>(
    event: E extends string ? E : never,
    ...data: InferEventsDefinition<T>[E]
  ): boolean
  public emit(event: string, ...data: any[]) {
    if (this.closed) return false
    return this.sendEvent({ message: { event, data } })
  }

  on(event: 'close', listener: () => void): this
  on(event: string, listener: (...args: any[]) => void) {
    super.on(event, listener)
    return this
  }

  public close() {
    this.sendEvent({ close: {} })
    this.manualShutdown = setTimeout(() => {
      this.res.end()
    }, SSE_CLOSE_TIMEOUT)
  }

  private sendEvent(data: EventContract): boolean {
    console.log('writing', `data: ${JSON.stringify(data)}\n\n`)
    return this.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  /** emit to any EventSource that passed in the same parameters (URL + query params) */
  // globalEmit<E extends keyof T>(event: E, ...data: T[E]): boolean
  // globalEmit(event: string, ...data: any[]) {
  //   return false
  // }
}

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
function error(code: string = '', message: string = ''): FailedResponse {
  console.log('creating error: ', { code, message })
  return { error: { code, message } }
}
function send(res: http.ServerResponse, response: ResponseContract) {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(response))
}
function event(res: http.ServerResponse, response: EventContract) {
  return res.write(`data: ${JSON.stringify(response)}\n\n`)
}

type RPCType = 'rest' | 'sse'
const rpcServer = <T extends ApiDefinition>(api: GenerateServerApi<T>) => async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  async function handleRestRpc() {
    const body: RequestContract = await getRequestBody(req)
    const { module, method, params } = body

    // prettier-ignore
    if (!api[module]) return send(res, error('ModuleNotFound', `module ${module} doesnt exist on the server. Module(s) available: ${Object.keys(api)}`))
    // prettier-ignore
    if (!api[module][method]) return send(res, error('MethodNotFound', `Method ${method} doesnt exist on the server. Method(s) available: ${Object.keys(api[module])}`))

    try {
      const result = await (api[module][method] as ServerRestFunction<(...args: any[]) => any>)(
        ...params
      )
      // const result = await api[module][method](...params)
      send(res, success(result))
    } catch (e) {
      send(res, error(e.code, e.toString()))
    }
  }

  async function handleEventRpc(contract: RequestEventSourceContract) {
    res.writeHead(200, {
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache'
    })

    const { module, method, params } = contract

    // prettier-ignore
    if (!api[module]) return event(res, error('ModuleNotFound', `module ${module} doesnt exist on the server. Module(s) available: ${Object.keys(api)}`))
    // prettier-ignore
    if (!api[module][method]) return event(res, error('MethodNotFound', `Method ${method} doesnt exist on the server. Method(s) available: ${Object.keys(api[module])}`))

    const sse = new ServerEmitter(req, res)
    const thisContext = { sse, [method]: api[module][method] }
    try {
      // we dont care about the return type here
      await (thisContext[method] as any)(...params)
    } catch (e) {
      // this method is private because we dont want clients accessing it
      ;(sse as any).sendEvent(error(e.code, e.toString()))
    }
  }

  const { query } = url.parse(req.url || '/')
  // prettier-ignore
  const queryContract: QueryContract | undefined = query ? (querystring.parse(query) as any) : undefined
  // prettier-ignore
  const rpcType: RPCType = queryContract ? queryContract.type === 'sse' ? 'sse' : 'rest' : 'rest'

  switch (rpcType) {
    case 'sse':
      const eventContract = {
        module: queryContract!.module,
        method: queryContract!.method,
        params: JSON.parse(queryContract!.params)
      }
      return handleEventRpc(eventContract)
    case 'rest':
      return handleRestRpc()
    default:
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: 'request not found' }))
  }
}

function createRPCServer<T extends ApiDefinition>(api: GenerateServerApi<T>) {
  return rpcServer(api)
}

export {
  createRPCServer,
  ServerEmitter,
  RPCError,
  // type exports
  GenerateServerApiModule,
  GenerateServerApi
}
