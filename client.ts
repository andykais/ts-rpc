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

  public get_url(request_contract: contracts.RequestContract) {
    if (this.config.route_signature_suffix) return `${this.config.url_origin}${this.config.static_route}/${request_contract.namespace.join('.')}`
    else return `${this.config.url_origin}${this.config.static_route}`
  }
}

interface ClientConfig {
  route: string
}

class ClientManager {
  #client: Client
  #config: ClientConfig
  #route: UrlRoute

  public constructor(client: Client, config: ClientConfig) {
    this.#client = client
    this.#config = config
    this.#route = UrlRoute.parse(config.route)
  }

  public async realtime_connect() {
    throw new Error('unimplemented')
  }

  public async set_header() {
    throw new Error('unimplemented')
  }

  public async realtime_disconnect() {
    throw new Error('unimplemented')
  }

  public async call(request_contract: contracts.RequestContract) {
    // TODO serialize via messagepack to support Date/Uint8Array
    const response = await fetch(this.#route.get_url(request_contract), {
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

      return create_proxy(client, [...namespace, prop])
    },
    apply: async (target, prop, args: any[]) => {
      const request_contract: contracts.RequestContract = {namespace, params: args}
      return await client.manager.call(request_contract)
    },
  })
}

function create<T extends types.SpecBlueprint>(route: string): T & Client {
  const client = new Client(route)
  return create_proxy(client, []) as any
}

export { create }
