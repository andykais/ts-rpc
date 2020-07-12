import { ServiceGeneric, EventsGeneric, Route, ResolveHandlers, ResolvePubber } from './types'

const RpcService = <T extends ServiceGeneric, E extends EventsGeneric>(
  route: Route,
  handlers: ResolveHandlers<T>
) => ({
  route,
  put: async (req: any, res: any, next: any) => {
    res.setHeader('Content-Type', 'application/json')
    const { fnKey, requestData } = req.body
    try {
      const responseData = await handlers[fnKey](requestData)
      res.end(JSON.stringify({ success: responseData, failure: null }))
    } catch (e) {
      res.end(JSON.stringify({ success: null, failure: e }))
    }
  },
  pub: new Proxy(
    {},
    {
      get(obj, prop) {
        return (eventData: any) => {
          // broadcast to all open websocket connections
        }
      }
    }
  ) as ResolvePubber<E>
})
type ServiceHandlers = ReturnType<typeof RpcService>

type ServerApp = {
  use: (route: string, middleware: any, subApplication: any) => any
}
const registerRpcMiddleware = (route: string, app: any, services: ServiceHandlers[]) => {}

export { RpcService, registerRpcMiddleware }
