import * as contracts from './src/contracts.ts'
import { ServerSentEventsAdapter } from "./adapters/mod.ts"


/**
  * A class used for sending messages to the client from the server.
  *
  * This is currently implemented using [Server Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
  *
  */
class ClientRealtimeEmitter<Events> {
  #realtime: ServerSentEventsAdapter<Events>
  #namespace: string[]

  constructor(namespace: string[], realtime: ServerSentEventsAdapter<Events>) {
    this.#realtime = realtime
    this.#namespace = namespace
  }

  /**
   * A method used to send events to a connected client {@linkcode Client}
   *
   * @param event The event name declared on an {@linkcode ApiController}
   * @param data The data sent to the client for the particular event
   */
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

/**
 * The base class to extend your server rpc implementation off of.
 *
 * @example
 * ```ts
 * interface Context {
 *   db: MyDatabase
 * }
 *
 * interface Events {
 *   todo_added: Todo
 * }
 *
 * class TodoApi extends ApiController<Events, Context> {
 *   add_todo(data: TodoData) {
 *     this.context.db.add_todo(data)
 *   }
 * }
 * ```
 */
class ApiController<C, Events = any, ApiDefinition = any> {
  protected context: C
  protected request: ClientRequest<Events>

  public constructor(context: C, request: ClientRequest<Events>) {
    this.context = context
    this.request = request
  }

  /**
   * Use this method to organize rpc methods under different modules
   *
   * @example
   * ```ts
   * class UserApi extends ApiController<UserEvents, Context> {
   *   async login(username: string, password: string) {...}
   * }
   *
   * class ChatApi extends ApiController<UserEvents, Context> {
   *   async send_message(send_to_user: string, message: string) {...}
   * }
   *
   * class Api extends ApiController<{}, Context> {
   *   user = this.module(UserApi)
   *   chat = this.module(ChatApi)
   * }
   *
   * // client usage:
   * import * as rpc_client from 'jsr:@andykais/ts-rpc/client.ts'
   *
   * const client = rpc_client.create<ApiSpec>('/rpc')
   * client.user.login('bob', 'secret')
   * client.chat.send_message('charlie', 'hello!')
   * ```
   */
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
