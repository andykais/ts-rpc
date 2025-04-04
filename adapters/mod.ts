import * as contracts from '../src/contracts.ts'
import * as errors from '../src/errors.ts'
import {ApiController, ClientRequest } from '../server.ts'


export abstract class ServerSentEventsAdapter<Events> {
  abstract send(contract: contracts.EventContract): void
  abstract get status(): Promise<void>
}

export abstract class ServerAdapter {
  private realtime_connections_map: Map<string, ServerSentEventsAdapter<any>>

  public constructor(private rpc_class: typeof ApiController<any, any, any>, private context: any) {
    this.realtime_connections_map = new Map()
  }

  // top level function that should be exposed in adapters
  static adapt<C, E>(_rpc_class: typeof ApiController<C, E, any>, _context: C) {
    throw new Error('must be overridden in base class')
  }

  load_controller(namespace: string[], connection_id: string | undefined | null): ApiController<any, any, any> {
    const realtime_connection = connection_id
      ? this.realtime_connections_map.get(connection_id)
      : undefined
    const request_context = new ClientRequest(namespace, realtime_connection)
    return new this.rpc_class(this.context, request_context)
  }

  add_realtime_client(sse_adapter: ServerSentEventsAdapter<any>) {
    const connection_id = crypto.randomUUID()
    const event_source_connected_contract: contracts.EventConnectedMessage = {type: '__SSE__', event_type: 'connected', connection_id}
    sse_adapter.send(event_source_connected_contract)
    sse_adapter.status.finally(() => {
      this.realtime_connections_map.delete(connection_id)
    })

    // TODO when we add more than just oak, we should put in an adapter for SSE implementations
    // const client_emitter = new ClientEmitter<any>({} as any)
    this.realtime_connections_map.set(connection_id, sse_adapter)
  }


  async handle_request(
    rpc_server: ApiController<any,any,any>,
    request_contract: contracts.RequestContract
  ): Promise<contracts.ResponseContract> {
    try {
      let rpc_accessor: any = rpc_server
      let rpc_accessor_prev = rpc_accessor
      for (const name of request_contract.namespace) {
        rpc_accessor_prev = rpc_accessor
        rpc_accessor = rpc_accessor[name]
        if (rpc_accessor === undefined) throw new errors.RoutingError(request_contract)
      }
      rpc_accessor_prev = rpc_accessor
      rpc_accessor = rpc_accessor[request_contract.method]
      // TODO can we bind these once rather than every time? (for a small performance win)
      const result = await rpc_accessor.bind(rpc_accessor_prev)(...request_contract.params)
      return { result }
    } catch (e) {
      if (e instanceof errors.ServerError) {
        return { error: {reason: e.reason, message: e.message, callstack: e.stack} }
      } else if (e instanceof Error) {
        return { error: {reason: `UNKNOWN`, message: e.message, callstack: e.stack} }
      } else {
        return { error: {reason: `UNKNOWN`, message: `${e}`, callstack: '' }}
      }
    }
  }
}

export type AdapterFunction = <C, E>(rpc_class: typeof ApiController<C, E, any>, context: C) => void
