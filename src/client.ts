import {
  ApiFunction,
  ApiModule,
  ApiDefinition,
  ArgumentTypes,
  EventStream,
  EventsDefinition
} from './types'
import {
  RequestContract,
  SuccessfulResponse,
  FailedResponse,
  ResponseContract,
  RequestEventSourceContract,
  EventContract,
  MessageEventContract,
  CloseEventContract,
  ErrorEventContract
} from './internal/contracts'
import { RPCError } from './errors'

// ========================================================================
// ======================= Client Types ===================================
// ======================= ================================================

interface ClientEmitterClass<Params extends any[], Events extends EventsDefinition> {
  new (...args: Params): ClientEmitter<Events>
}

// prettier-ignore
type ClientRestFunction<T extends ApiFunction> = (...args: ArgumentTypes<T>) => Promise<ReturnType<T>>

type GenerateClientApiFunction<T extends ApiFunction> = ReturnType<T> extends EventStream<infer R>
  ? ClientEmitterClass<ArgumentTypes<T>, R>
  : ClientRestFunction<T>

// prettier-ignore
type GenerateClientApiModule<T extends ApiModule> = {
  [K in keyof T]: GenerateClientApiFunction<T[K]>
}
type GenerateClientApi<T extends ApiDefinition> = {
  [K in keyof T]: GenerateClientApiModule<T[K]>
}

// ========================================================================
// ======================= SSE Implementation =============================
// ======================= ================================================

type Listener = (...data: any[]) => void
class ClientEmitter<T extends EventsDefinition> {
  private eventSource: EventSource
  private listeners: { [event: string]: Listener[] }

  public constructor(route: string, module: string, method: string, params: any[]) {
    // prettier-ignore
    const url = route + `?type=sse&module=${encodeURIComponent(module)}&method=${encodeURIComponent(method)}&params=${encodeURIComponent(JSON.stringify(params))}`
    this.eventSource = new EventSource(url)
    this.eventSource.onmessage = ({ data }) => this.onMessage(JSON.parse(data))
    this.eventSource.onerror = () => this.onError()
    this.listeners = {}
  }

  on<E extends keyof T>(event: E, listener: (...data: T[E]) => void): this
  // these overloads do not behave here. We can trust they do what we want though
  on(event: any, listener: any) {
    const eventArg = event as string
    const listenerArg = listener as Listener
    if (!this.listeners[eventArg]) this.listeners[eventArg] = []
    this.listeners[eventArg].push(listenerArg)
    return this
  }

  private onMessage(data: EventContract) {
    if ('close' in data) this.eventSource.close()
    else if ('message' in data) this.sendEvent(data)
    else if ('error' in data) this.emitError(data)
  }
  private onError() {
    console.error('Disconnect occurred')
    this.eventSource.close()
  }

  private sendEvent({ message }: MessageEventContract) {
    for (const listener of this.listeners[message.event] || []) {
      listener(...message.data)
    }
  }
  private emitError({ error }: ErrorEventContract) {
    const errorInstance = new RPCError(error.code, error.message)
    if (!this.listeners['error']?.length) {
      throw errorInstance
    }

    for (const listener of this.listeners['error']) {
      listener(errorInstance)
    }
  }
}

// ========================================================================
// ======================= REST Implementation ============================
// ======================= ================================================

const invokeRestRpc = async (route: string, module: string, method: string, params: any[]) => {
  const contract: RequestContract = { method, module, params }
  const response = await fetch(route, { method: 'PUT', body: JSON.stringify(contract) })
  const body: ResponseContract = await response.json()
  if ('error' in body) {
    throw new RPCError(body.error.code, body.error.message)
  } else {
    return body.result
  }
}

class InvokeProxyTarget {}
function createRpcProxy(route: string, module: string, method: string) {
  const target = InvokeProxyTarget
  const handler = {
    apply: (target: any, prop: any, args: any[]) => {
      return invokeRestRpc(route, module, method, args)
    },
    construct: (target: any, args: any[]) => {
      return new ClientEmitter(route, module, method, args)
    }
  }
  return new Proxy(target, handler)
}

function createMethodProxy(route: string, module: string) {
  const target = {}
  const handler = {
    get: (target: any, prop: string) => {
      return createRpcProxy(route, module, prop)
    }
  }
  return new Proxy(target, handler)
}
function createModuleProxy(route: string) {
  const target = {}
  const handler = {
    get: (target: any, prop: string) => {
      return createMethodProxy(route, prop)
    }
  }
  return new Proxy(target, handler)
}

function createRPCClient<T extends ApiDefinition>(route: string): GenerateClientApi<T> {
  return createModuleProxy(route)
}

export { createRPCClient, GenerateClientApi, ClientEmitter, RPCError }
