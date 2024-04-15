import {oak} from './src/deps.server.ts'
export * from './src/types.ts'
import { type EventMapper } from './src/types.ts'
import * as contracts from './src/contracts.ts'
import * as errors from './src/errors.ts'


type SSE_Implementation =
  | oak.ServerSentEventTarget

class ClientEmitter<Events> {
  #status_resolved: PromiseWithResolvers<void>
  #target: SSE_Implementation

  constructor(sse_impl: SSE_Implementation) {
    this.#status_resolved = Promise.withResolvers()
    this.#target = sse_impl
  }

  get status() {
    return this.#status_resolved.promise
  }

  emit(event: string, data: any) {
    // TODO how do we handle namespaces?
    // target.dispatchMessage(JSON.stringify(event_emit_contract))
    throw new Error('unimplemented')
  }

  on<E extends EventMapper<Events>, K extends keyof E>(event: K, fn: (data: E[K]) => void) {
    throw new Error('unimplemented')
  }
}

class Request<Events> {
  #realtime: ClientEmitter<Events> | undefined

  constructor(realtime?: ClientEmitter<Events>) {
    this.#realtime = realtime
  }

  get realtime(): ClientEmitter<Events> {
    if (this.#realtime) return this.#realtime
    else throw new Error(`No realtime connection for this client`)
  }
}

class ApiController<C, Events = any, ApiDefinition = any> {
  protected context: C
  protected request: Request<Events>

  public constructor(context: C, request: Request<Events>) {
    this.context = context
    this.request = request
  }

  protected module<T extends typeof ApiController<C, any, any>>(api_controller: T): InstanceType<T> {
    return new api_controller(this.context, this.request) as InstanceType<T>
  }
}


async function handle_request(
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
    // TODO can we bind these once rather than every time? (for a small performance win)
    const result = await rpc_accessor.bind(rpc_accessor_prev)(request_contract.params)
    return { result }
  } catch (e) {
    if (e instanceof errors.ServerError) {
      return { error: {reason: e.reason, message: e.message, callstack: e.stack} }
    } else {
      return { error: {reason: `UNKNOWN`, message: e.message, callstack: e.stack} }
    }
  }
}

// TODO separate modules for express/oak/etc
function adapt<C, E>(rpc_class: typeof ApiController<C, E, any>, context: C) {
  const realtime_connections_map = new Map<string, ClientEmitter<E>>()
  return async (ctx: oak.Context) => {
    const connection_id = ctx.request.headers.get('x-rpc-connection-id')
    const realtime_connection = connection_id
      ? realtime_connections_map.get(connection_id)
      : undefined
    const request_context = new Request(realtime_connection)
    const rpc_server = new rpc_class(context, request_context)

    if (ctx.request.headers.get('accept') === 'text/event-stream') {
      // ctx.response.headers.set('Connection', 'Keep-Alive')
      // ctx.response.headers.set('Content-Type', 'text/event-stream')
      // ctx.response.headers.set('Cache-Control', 'no-cache')
      // ctx.response.headers.set('Keep-Alive', 'timeout=9007199254740991')
      // ctx.response.status = 200

      // setTimeout(() => {
      //   ctx.send(`data: {"hello": "world"}\n\n`)
      //   // ctx.response.with(`data: {"hello": "world"}\n\n`)
      // }, 100)

      // weirdly oak's builtin works in the browser, but not deno
      const target = await ctx.sendEvents()
      console.log('oak set up SSE!')
      const connection_id = crypto.randomUUID()
      const event_source_connected_contract: contracts.EventConnectedMessage = {type: '__SSE__', event_type: 'connected', connection_id}
      target.dispatchMessage(JSON.stringify(event_source_connected_contract))
      // target.dispatchMessage(new oak.ServerSentEvent('ping', {data: JSON.stringify({hello: 'world'})}))
      target.addEventListener('close', e => {
        realtime_connections_map.delete(connection_id)
      })

      // TODO when we add more than just oak, we should put in an adapter for SSE implementations
      const client_emitter = new ClientEmitter<E>(target)
      realtime_connections_map.set(connection_id, client_emitter)
      // target.close()
    } else {
      console.log(`Request: ${ctx.request.headers.get('x-rpc-connection-id')}`)
      const request_contract: contracts.RequestContract = await ctx.request.body.json()
      const response_contract = await handle_request(rpc_server, request_contract)
      // const response = new Response(JSON.stringify(response_contract), {
      //   status: 200,
      //   headers: {'content-type': 'application/json'},
      // })
      // console.log('response...', {response})
      ctx.response.body = response_contract
      // ctx.response = response
      // return Response.json(response_contract)
    }
  }
  // return oak.route(async (req, ctx) => {
  //   console.log('oak.route request...', req)
  //   if (req.headers.get('accept') === 'text/event-stream') {
  //     console.log('i am an event stream!')
  //     // ctx.response
  //   // res.writeHead(200, {
  //     // Connection: 'keep-alive',
  //     // 'Content-Type': 'text/event-stream',
  //     // 'Cache-Control': 'no-cache'
  //   // })
  //   }

  //   // TODO add a zod layer here to be sure we actually got the contract we expect
  //   const request_contract: contracts.RequestContract = await req.json()
  //   const response_contract = await handle_request(rpc_server, request_contract)
  //   return Response.json(response_contract)
  // })
}

export {
  ClientEmitter,
  ApiController,
  adapt
}
