import {oak} from '../src/deps.server.ts'
import * as contracts from '../src/contracts.ts'
import * as adapter_base from './mod.ts'
import {ClientEmitter, ApiController, ClientRequest, handle_request} from '../server.ts'


class ServerSentEventsAdapter<Events> extends adapter_base.ServerSentEventsAdapter<Events> {
  #status_resolved: PromiseWithResolvers<void>
  #target: oak.ServerSentEventTarget

  constructor(target: oak.ServerSentEventTarget) {
    super()
    this.#target = target
    this.#status_resolved = Promise.withResolvers()
    // target.addEventListener('close', e => {
    //   this.dispatchEvent(new CustomEvent('close'))
    // })
  }

  get status() {
    return this.#status_resolved.promise
  }

  send(contract: contracts.EventContract) {
    const success = this.#target.dispatchMessage(JSON.stringify(contract))
    console.log({success})
  }
}

class ServerAdapter extends adapter_base.ServerAdapter {
  async handle_server_sent_events_request(ctx: oak.Context) {
    const rpc_controller = this.load_controller(ctx.request.headers.get('x-rpc-connection-id'))

    const target = await ctx.sendEvents()
    const sse_adapter = new ServerSentEventsAdapter<any>(target)

    this.add_realtime_client(sse_adapter)

  }

  async handle_rpc_request(ctx: oak.Context) {
    const rpc_controller = this.load_controller(ctx.request.headers.get('x-rpc-connection-id'))

    const request_contract: contracts.RequestContract = await ctx.request.body.json()
    const response_contract = await this.handle_request(rpc_controller, request_contract)
    ctx.response.body = response_contract
  }

  static adapt<C, E>(rpc_class: typeof ApiController<C, E, any>, context: C) {
    const adapter = new ServerAdapter(rpc_class, context)

    return async (ctx: oak.Context) => {
      if (ctx.request.headers.get('accept') === 'text/event-stream') {
        await adapter.handle_server_sent_events_request(ctx)
      } else {
        await adapter.handle_rpc_request(ctx)
      }
    }

    // const realtime_connections_map = new Map<string, ClientEmitter<E>>()
    // return async (ctx: oak.Context) => {
    //   const connection_id = ctx.request.headers.get('x-rpc-connection-id')
    //   const realtime_connection = connection_id
    //     ? realtime_connections_map.get(connection_id)
    //     : undefined
    //   const request_context = new ClientRequest(realtime_connection)
    //   const rpc_server = new rpc_class(context, request_context)

    //   if (ctx.request.headers.get('accept') === 'text/event-stream') {
    //     // ctx.response.headers.set('Connection', 'Keep-Alive')
    //     // ctx.response.headers.set('Content-Type', 'text/event-stream')
    //     // ctx.response.headers.set('Cache-Control', 'no-cache')
    //     // ctx.response.headers.set('Keep-Alive', 'timeout=9007199254740991')
    //     // ctx.response.status = 200

    //     // setTimeout(() => {
    //     //   ctx.send(`data: {"hello": "world"}\n\n`)
    //     //   // ctx.response.with(`data: {"hello": "world"}\n\n`)
    //     // }, 100)

    //     const target = await ctx.sendEvents()

    //     const sse_adapter = new ServerSentEventsAdapter(target)

    //     console.log('oak set up SSE!')
    //     const connection_id = crypto.randomUUID()
    //     const event_source_connected_contract: contracts.EventConnectedMessage = {type: '__SSE__', event_type: 'connected', connection_id}
    //     target.dispatchMessage(JSON.stringify(event_source_connected_contract))
    //     // target.dispatchMessage(new oak.ServerSentEvent('ping', {data: JSON.stringify({hello: 'world'})}))
    //     target.addEventListener('close', e => {
    //       realtime_connections_map.delete(connection_id)
    //     })

    //     // TODO when we add more than just oak, we should put in an adapter for SSE implementations
    //     const client_emitter = new ClientEmitter<E>(target)
    //     realtime_connections_map.set(connection_id, client_emitter)
    //     // target.close()
    //   } else {
    //     console.log(`Request: ${ctx.request.headers.get('x-rpc-connection-id')}`)
    //     const request_contract: contracts.RequestContract = await ctx.request.body.json()
    //     const response_contract = await handle_request(rpc_server, request_contract)
    //     // const response = new Response(JSON.stringify(response_contract), {
    //     //   status: 200,
    //     //   headers: {'content-type': 'application/json'},
    //     // })
    //     // console.log('response...', {response})
    //     ctx.response.body = response_contract
    //     // ctx.response = response
    //     // return Response.json(response_contract)
    //   }
    // }
    // // return oak.route(async (req, ctx) => {
    // //   console.log('oak.route request...', req)
    // //   if (req.headers.get('accept') === 'text/event-stream') {
    // //     console.log('i am an event stream!')
    // //     // ctx.response
    // //   // res.writeHead(200, {
    // //     // Connection: 'keep-alive',
    // //     // 'Content-Type': 'text/event-stream',
    // //     // 'Cache-Control': 'no-cache'
    // //   // })
    // //   }

    // //   // TODO add a zod layer here to be sure we actually got the contract we expect
    // //   const request_contract: contracts.RequestContract = await req.json()
    // //   const response_contract = await handle_request(rpc_server, request_contract)
    // //   return Response.json(response_contract)
    // // })
  }
}


// export function adapt<C, E>(rpc_class: typeof ApiController<C, E, any>, context: C) {
//   const realtime_connections_map = new Map<string, ClientEmitter<E>>()
//   return async (ctx: oak.Context) => {
//     const connection_id = ctx.request.headers.get('x-rpc-connection-id')
//     const realtime_connection = connection_id
//       ? realtime_connections_map.get(connection_id)
//       : undefined
//     const request_context = new ClientRequest(realtime_connection)
//     const rpc_server = new rpc_class(context, request_context)

//     if (ctx.request.headers.get('accept') === 'text/event-stream') {
//       // ctx.response.headers.set('Connection', 'Keep-Alive')
//       // ctx.response.headers.set('Content-Type', 'text/event-stream')
//       // ctx.response.headers.set('Cache-Control', 'no-cache')
//       // ctx.response.headers.set('Keep-Alive', 'timeout=9007199254740991')
//       // ctx.response.status = 200

//       // setTimeout(() => {
//       //   ctx.send(`data: {"hello": "world"}\n\n`)
//       //   // ctx.response.with(`data: {"hello": "world"}\n\n`)
//       // }, 100)

//       const target = await ctx.sendEvents()
//       console.log('oak set up SSE!')
//       const connection_id = crypto.randomUUID()
//       const event_source_connected_contract: contracts.EventConnectedMessage = {type: '__SSE__', event_type: 'connected', connection_id}
//       target.dispatchMessage(JSON.stringify(event_source_connected_contract))
//       // target.dispatchMessage(new oak.ServerSentEvent('ping', {data: JSON.stringify({hello: 'world'})}))
//       target.addEventListener('close', e => {
//         realtime_connections_map.delete(connection_id)
//       })

//       // TODO when we add more than just oak, we should put in an adapter for SSE implementations
//       const client_emitter = new ClientEmitter<E>(target)
//       realtime_connections_map.set(connection_id, client_emitter)
//       // target.close()
//     } else {
//       console.log(`Request: ${ctx.request.headers.get('x-rpc-connection-id')}`)
//       const request_contract: contracts.RequestContract = await ctx.request.body.json()
//       const response_contract = await handle_request(rpc_server, request_contract)
//       // const response = new Response(JSON.stringify(response_contract), {
//       //   status: 200,
//       //   headers: {'content-type': 'application/json'},
//       // })
//       // console.log('response...', {response})
//       ctx.response.body = response_contract
//       // ctx.response = response
//       // return Response.json(response_contract)
//     }
//   }
//   // return oak.route(async (req, ctx) => {
//   //   console.log('oak.route request...', req)
//   //   if (req.headers.get('accept') === 'text/event-stream') {
//   //     console.log('i am an event stream!')
//   //     // ctx.response
//   //   // res.writeHead(200, {
//   //     // Connection: 'keep-alive',
//   //     // 'Content-Type': 'text/event-stream',
//   //     // 'Cache-Control': 'no-cache'
//   //   // })
//   //   }

//   //   // TODO add a zod layer here to be sure we actually got the contract we expect
//   //   const request_contract: contracts.RequestContract = await req.json()
//   //   const response_contract = await handle_request(rpc_server, request_contract)
//   //   return Response.json(response_contract)
//   // })
// }

export const adapt = ServerAdapter.adapt
export * from '../server.ts'
