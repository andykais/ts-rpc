import * as contracts from './src/contracts.ts'
import { ServerSentEventsAdapter } from "./adapters/mod.ts"


class ClientRealtimeEmitter<Events> {
  #realtime: ServerSentEventsAdapter<Events>
  #namespace: string[]

  constructor(namespace: string[], realtime: ServerSentEventsAdapter<Events>) {
    this.#realtime = realtime
    this.#namespace = namespace
  }

  public emit<K extends keyof Events>(event: K, data: Events[K]) {
    const contract: contracts.EventEmitMessage = {
      type: '__SSE__',
      event_type: 'emit',
      event: {
        name: event as string,
        namespace: this.#namespace,
        data,
      }

    }
    this.#realtime.send(contract)
  }

  get status(): Promise<void> {
    return this.#realtime.status
  }
}

class ClientRequest<Events> {
  #realtime: ServerSentEventsAdapter<Events> | undefined
  #emitter: ClientRealtimeEmitter<Events> | undefined

  constructor(namespace: string[], realtime?: ServerSentEventsAdapter<Events>) {
    if (realtime) {
      this.#emitter = new ClientRealtimeEmitter(namespace, realtime)
    }
    this.#realtime = realtime
  }

  get realtime(): ClientRealtimeEmitter<Events> {
    if (this.#emitter) return this.#emitter
    else throw new Error(`No realtime connection for this client`)
  }
}

class ApiController<C, Events = any, ApiDefinition = any> {
  protected context: C
  protected request: ClientRequest<Events>

  public constructor(context: C, request: ClientRequest<Events>) {
    this.context = context
    this.request = request
  }

  protected module<T extends typeof ApiController<C, any, any>>(api_controller: T): InstanceType<T> {
    return new api_controller(this.context, this.request) as InstanceType<T>
  }
}

export {
  ServerSentEventsAdapter,
  ClientRequest,
  ClientRealtimeEmitter,
  ApiController,
}
export * from './src/types.ts'
