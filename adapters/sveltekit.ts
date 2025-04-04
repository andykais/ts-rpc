import type {RequestEvent} from 'npm:@sveltejs/kit@2.5.24'
import * as contracts from '../src/contracts.ts'
import * as adapter_base from './mod.ts'
import {ApiController} from '../server.ts'


type SvektekitRouterFunction = (ctx: RequestEvent) => Promise<Response>

/*
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
*/

class ServerAdapter extends adapter_base.ServerAdapter {
  /*
  async handle_server_sent_events_request(ctx: OakRouterContext) {
    // TODO error out if x-rpc-connection-id is already present?
    const target = await ctx.sendEvents()
    const sse_adapter = new ServerSentEventsAdapter<any>(target)

    this.add_realtime_client(sse_adapter)

  }
  */

  async handle_rpc_request(ctx: RequestEvent): Promise<Response> {
    const request_contract: contracts.RequestContract = await ctx.request.json()
    const connection_id = ctx.request.headers.get('x-rpc-connection-id')
    const rpc_controller = this.load_controller(request_contract.namespace, connection_id)
    const response_contract = await this.handle_request(rpc_controller, request_contract)
    return Response.json(response_contract)
  }

  static adapt<C, E>(rpc_class: typeof ApiController<C, E, any>, context: C): SvektekitRouterFunction {
    const adapter = new ServerAdapter(rpc_class, context)

    return async (ctx: RequestEvent): Promise<Response> => {
      if (ctx.request.headers.get('accept') === 'text/event-stream') {
        // await adapter.handle_server_sent_events_request(ctx)
        throw new Error('unimplemented')
      } else {
        return await adapter.handle_rpc_request(ctx)
      }
    }
  }
}

/**
 * Adapt your rpc class to the [SvelteKit Framework](https://kit.svelte.dev/) backend.
 *
 * @param rpc_class The rpc class containing your server rpc implementation
 * @param context An object containing whatever data you want available in all rpc method
 *
 * @example
 * ```ts
 * // src/routes/rpc/+server.ts
 * import type { RequestHandler } from "@sveltejs/kit"
 * import * as rpc from 'jsr:@andykais/ts-rpc/adapters/sveltekit.ts'
 * import {Api} from '$lib/api.ts'
 * 
 * export const PUT: RequestHandler = async (params) => {
 *   const context = params.locals
 *   return await rpc.adapt(Api, context)(params)
 * }
 * ````
 *
 */
export const adapt = ServerAdapter.adapt
export * from '../server.ts'
