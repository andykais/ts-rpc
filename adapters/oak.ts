import * as oak from 'jsr:@oak/oak@16.0.0'
import * as contracts from '../src/contracts.ts'
import * as adapter_base from './mod.ts'
import {ApiController} from '../server.ts'


type OakRouterContext = oak.RouterContext<string, Record<string | number, string>, Record<string, any>>
type OakRouterFunction = (ctx: OakRouterContext) => Promise<void>


class ServerSentEventsAdapter<Events> extends adapter_base.ServerSentEventsAdapter<Events> {
  #status_resolved: PromiseWithResolvers<void>
  #target: oak.ServerSentEventTarget

  constructor(target: oak.ServerSentEventTarget) {
    super()
    this.#target = target
    this.#status_resolved = Promise.withResolvers()
    target.addEventListener('close', () => {
      this.#status_resolved.resolve()
    })
  }

  get status() {
    return this.#status_resolved.promise
  }

  send(contract: contracts.EventContract) {
    const success = this.#target.dispatchMessage(JSON.stringify(contract))
    if (!success) {
      throw new Error(`Failed to dispatch message over server sent events adapter ${this.#target}`)
    }
  }
}

class ServerAdapter extends adapter_base.ServerAdapter {
  async handle_server_sent_events_request(ctx: OakRouterContext) {
    // TODO error out if x-rpc-connection-id is already present?
    const target = await ctx.sendEvents()
    const sse_adapter = new ServerSentEventsAdapter<any>(target)

    this.add_realtime_client(sse_adapter)

  }

  async handle_rpc_request(ctx: OakRouterContext) {
    const request_contract: contracts.RequestContract = await ctx.request.body.json()
    const connection_id = ctx.request.headers.get('x-rpc-connection-id')
    const rpc_controller = this.load_controller(request_contract.namespace, connection_id)
    const response_contract = await this.handle_request(rpc_controller, request_contract)
    ctx.response.body = response_contract
  }

  static override adapt<C, E>(rpc_class: typeof ApiController<C, E, any>, context: C): OakRouterFunction {
    const adapter = new ServerAdapter(rpc_class, context)

    return async (ctx: OakRouterContext) => {
      if (ctx.request.headers.get('accept') === 'text/event-stream') {
        await adapter.handle_server_sent_events_request(ctx)
      } else {
        await adapter.handle_rpc_request(ctx)
      }
    }
  }
}

/**
 * Adapt your rpc class to the [Oak Framework](https://jsr.io/@oak/oak) backend.
 *
 * @param rpc_class The rpc class containing your server rpc implementation
 * @param context An object containing whatever data you want available in all rpc method
 *
 * @example
 * ```ts
 * import * as rpc from 'jsr:@andykais/ts-rpc/adapters/oak.ts'
 * import * as oak from 'jsr:@oak/oak'
 *
 * const app = new oak.Application()
 * const router = new oak.Router()
 * const context: Context = { db: new Database() }
 * router.put('/rpc/:signature', rpc.adapt(Api, context))
 * app.use(router.routes())
 * const abort_controller = new AbortController()
 * app.listen({ port: 8001, signal: abort_controller.signal })
 * ````
 *
 */
export const adapt = ServerAdapter.adapt
export * from '../server.ts'
