import {oak} from './src/deps.server.ts'
export * from './src/types.ts'
import { type EventMapper } from './src/types.ts'
import * as contracts from './src/contracts.ts'
import * as errors from './src/errors.ts'

class ClientEmitter<Events> {
  #status_resolved: PromiseWithResolvers<void>

  constructor() {
    this.#status_resolved = Promise.withResolvers()
  }

  get status() {
    return this.#status_resolved.promise
  }

  emit(event: string, data: any) {
    throw new Error('unimplemented')
  }

  on<E extends EventMapper<Events>, K extends keyof E>(event: K, fn: (data: E[K]) => void) {
    throw new Error('unimplemented')
  }
}

interface Request<Events> {
  realtime: ClientEmitter<Events>
}

class Context {}

class ApiController<C extends Context, Events = any, ApiDefinition = any> {
  protected context: C

  public constructor(context: C) {
    this.context = context
  }

  protected get request(): Request<Events> {
    throw new Error('unimplemented')
  }

  protected module<T extends typeof ApiController<C, any, any>>(api_controller: T): InstanceType<T> {
    return new api_controller(this.context) as InstanceType<T>
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
function adapt(rpc_server: ApiController<any, any, any>) {
  return async (ctx: oak.Context) => {
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
      const event_source_connected_contract: contracts.EventConnectedMessage = {type: '__SSE__', event_type: 'connected'}
      target.dispatchMessage(JSON.stringify(event_source_connected_contract))
      // target.dispatchMessage(new oak.ServerSentEvent('ping', {data: JSON.stringify({hello: 'world'})}))
      target.addEventListener('close', e => {
        console.log('remote closed')
      })
      // target.close()
    } else {
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
  Context,
  ClientEmitter,
  ApiController,
  adapt
}
