import {oak} from './src/deps.server.ts'
export * from './src/types.ts'
import * as contracts from './src/contracts.ts'
import * as errors from './src/errors.ts'

class ClientEmitter<Events> {
  emit(event: string, data: any) {
    throw new Error('unimplemented')
  }

  on(event: string, fn: (data: any) => void) {
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
    // // prettier-ignore
    // if (!api[module]) return send(res, error('ModuleNotFound', `module ${module} doesnt exist on the server. Module(s) available: ${Object.keys(api)}`))
    // // prettier-ignore
    // if (!api[module][method]) return send(res, error('MethodNotFound', `Method ${method} doesnt exist on the server. Method(s) available: ${Object.keys(api[module])}`))

// class RPCServerLogic {
//   public constructor(private rpc_server: ApiController<any, any, any>) {}
// }

async function handle_request(
  rpc_server: ApiController<any,any,any>,
  request_contract: contracts.RequestContract
): Promise<contracts.ResponseContract> {
  try {
    let rpc_accessor: any = rpc_server
    for (const name of request_contract.namespace) {
      rpc_accessor = rpc_accessor[name]
      if (rpc_accessor === undefined) throw new errors.RoutingError(request_contract)
    }
    const result = await rpc_accessor(request_contract.params)
    return { result }
  } catch (e) {
    if (e instanceof errors.RPCError) {
      return { error: {reason: e.reason, message: e.message} }
    } else {
      return { error: {reason: `UNKNOWN`, message: e.message} }
    }
  }
}

// TODO separate modules for express/oak/etc
function adapt(rpc_server: ApiController<any, any, any>) {
  return oak.route(async (req, ctx) => {
    // TODO add a zod layer here to be sure we actually got the contract we expect
    const request_contract: contracts.RequestContract = await req.json()
    const response_contract = await handle_request(rpc_server, request_contract)
    return Response.json(response_contract)
  })
}

export {
  Context,
  ClientEmitter,
  ApiController,
  adapt
}
