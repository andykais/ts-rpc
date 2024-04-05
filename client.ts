import * as contracts from './src/contracts.ts'
import * as types from './src/types.ts'
import * as errors from './src/errors.ts'

const DEFAULT_HOST = typeof (globalThis as any).document !== 'undefined'
  ? undefined
  : 'http://localhost'

class UrlRoute {
  private constructor(private config: {url_origin: string; static_route: string; route_signature_suffix: boolean}) {}

  public static parse(route: string) {
    const url = new URL(route, DEFAULT_HOST)
    let pathname = url.pathname
    const url_origin = url.origin

    if (!pathname.startsWith('/')) throw new errors.RouteParseError(route)
    pathname = pathname.substring(1)
    const parts = pathname.split('/').map(part => {
      if (part.startsWith(':')) return { type: 'param', part: part.substring(1)} as const
      else return { type: 'path', part } as const
    })

    if (parts.length === 0) {
      throw new errors.RouteParseError(route)
    }

    let static_route = ''
    let route_signature_suffix = false
    for (const [index, part] of parts.entries()) {
      if (part.type === 'param') {
        if (index === 0 || index !== parts.length - 1) throw new errors.RouteParseError(route)
        route_signature_suffix = true
        continue
      }
      static_route += `/${part.part}`
    }
    if (static_route === '') throw new errors.RouteParseError(route)
    return new UrlRoute({url_origin, static_route, route_signature_suffix})
  }

  public get_url(request_contract: contracts.RequestContract | contracts.EventRequestMessage) {
    if (this.config.route_signature_suffix) {
      if (request_contract.type === '__SSE__') return `${this.config.url_origin}${this.config.static_route}/${request_contract.type}`
      else return `${this.config.url_origin}${this.config.static_route}/${request_contract.namespace.join('.')}`
    }
    else return `${this.config.url_origin}${this.config.static_route}`
  }
}

interface ClientConfig {
  route: string
}

interface RealtimeConnectOptions {
  onerror?: (ev: Event) => void
}

interface InternalContext {
  client: Client
  config: ClientConfig
  route: UrlRoute
}

class ClientRealtime {
  #ctx: InternalContext
  #status: Promise<void> | undefined
  #status_resolver: PromiseWithResolvers<void> | undefined
  #event_target: EventTarget
  #event_source: EventSource | undefined

  public constructor(ctx: InternalContext) {
    this.#ctx = ctx
    this.#event_target = new EventTarget()
  }

  get target() {
    return this.#event_target
  }

  get status() {
    if (this.#status_resolver) return this.#status_resolver.promise
    else return Promise.resolve()
  }

  public async connect() {
    const event_source_contract: contracts.EventRequestMessage = {type: '__SSE__', event_type: 'request'}
    const url = this.#ctx.route.get_url(event_source_contract)
    // const url = route + `?type=sse&module=${encodeURIComponent(module)}&method=${encodeURIComponent(method)}&params=${encodeURIComponent(JSON.stringify(params))}`
    // this.eventSource = new EventSource(url)
    console.log('starting event source...')
    const event_source_connected = Promise.withResolvers<void>()

    const status_resolver = Promise.withResolvers<void>()
    this.#status_resolver = status_resolver
    // this.#status = status_resolver.promise
    this.#event_source = new EventSource(url)
    console.log('event source called.')
    this.#event_source.addEventListener('message', ev => {
      const event_contract: contracts.EventContract = JSON.parse(ev.data)
      if (event_contract.event_type === 'connected') {
        event_source_connected.resolve()
      } else if (event_contract.event_type === 'emit') {
        const event_key = [...event_contract.event.namespace, event_contract.event.name].join('.')
        this.#event_target.dispatchEvent(new CustomEvent(event_key, {detail: event_contract.event.data}))
      }
      console.log({event_contract})
    })
    // this.#event_source.onmessage = ({ data }) => {
    //   console.log({data})
    //   // const event_contract: contracts.EventContract = JSON.parse(data)
    //   // const event_namespace_name = [...event_contract.namespace, event_contract.event.name].join('.')
    //   // this.#event_target.dispatchEvent(new CustomEvent(event_namespace_name, {detail: event_contract}))
    // }

    // TODO handle errors
    this.#event_source.onerror = e => {
      console.log(e)
      status_resolver.reject(new Error(`Event Source Error: ${e.type}`))
    }

    await event_source_connected.promise
  }

  public disconnect() {
    if (!this.#event_source) {
      throw new Error(`Event source not initialized`)
    }

    this.#event_source.close()
    this.#status_resolver?.resolve()
  }

}

class ClientManager {
  #ctx: InternalContext
  realtime: ClientRealtime
  // #event_target: EventTarget
  // #event_source: EventSource | undefined

  public constructor(client: Client, config: ClientConfig) {
    this.#ctx = {
      client: client,
      config: config,
      route: UrlRoute.parse(config.route),
    }
    this.realtime = new ClientRealtime(this.#ctx)
  }

  public async set_header() {
    throw new Error('unimplemented')
  }

  public async call(request_contract: contracts.RequestContract) {
    // TODO serialize via messagepack to support Date/Uint8Array
    const response = await fetch(this.#ctx.route.get_url(request_contract), {
      method: 'PUT',
      body: JSON.stringify(request_contract)
    })
    const body: contracts.ResponseContract = await response.json()
    if ('error' in body) {
      throw new errors.RPCError(body.error.reason, body.error.message)
    } else {
      return body.result
    }
  }
}

class Client {
  public manager: ClientManager

  public constructor(route: string) {
    this.manager = new ClientManager(this, {route})
  }
}

class ProxyTarget {}
function create_proxy(client: Client, namespace: string[]): any {
  return new Proxy(ProxyTarget, {
    get: (target, prop) => {
      if (typeof prop === 'symbol') return (target as any)[prop]
      if (namespace.length === 0 && prop === 'manager') {
        return client.manager
      }

      return create_proxy(client, [...namespace, prop])
    },
    apply: async (target, prop, args: any[]) => {
      const request_contract: contracts.RequestContract = {type: '__REQUEST__', namespace, params: args}
      return await client.manager.call(request_contract)
    },
  })
}

function create<T extends types.SpecBlueprint>(route: string): T & Client {
  const client = new Client(route)
  return create_proxy(client, []) as any
}

export { create }
