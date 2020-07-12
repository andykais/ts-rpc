//// import * as EventEmitter from 'eventemitter3'
//// const EE = new EventEmitter()

//type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never

//type ServiceGeneric = { [fnName: string]: (request: object) => any }
//type EventsGeneric = { [eventName: string]: any }

//type Request<T> = { fnKey: string; requestData: T }
//type Response<T> = { success: T; failure: Error }
//type ResolveHandlers<I extends ServiceGeneric> = {
//  // [K in keyof I]: ReplaceReturnType<I[K], Promise<ReturnType<I[K]>>>
//  [K in keyof I]: (request: ArgumentTypes<I[K]>[0]) => Promise<ReturnType<I[K]>>
//}
//type ResolveClient<I extends ServiceGeneric> = {
//  [K in keyof I]: (request: ArgumentTypes<I[K]>[0]) => Promise<Response<ReturnType<I[K]>>>
//}
//type ResolvePubber<I extends EventsGeneric> = { [K in keyof I]: (eventData: I[K]) => boolean }
//type ResolveSubber<I extends EventsGeneric> = {
//  [K in keyof I]: (cb: (eventData: I[K]) => void) => void
//}

//// type ResolveSubber_refactor<E extends keyof EventsGeneric> = (
////   event: E,
////   listener: (eventData: Events[E]) => void
//// ) => this
//// on<E extends keyof Events>(event: E, listener: (eventData: Events[E]) => void): this

//// class Pubber extends EventEmitter {}
//// class Subber extends EventEmitter {}

//type Route = string

//const createRpcService = <T extends ServiceGeneric, E extends EventsGeneric>(
//  handlers: ResolveHandlers<T>
//) => ({
//  put: async (req: any, res: any, next: any) => {
//    res.setHeader('Content-Type', 'application/json')
//    const { fnKey, requestData } = req.body
//    try {
//      const responseData = await handlers[fnKey](requestData)
//      res.end(JSON.stringify({ success: responseData, failure: null }))
//    } catch (e) {
//      res.end(JSON.stringify({ success: null, failure: e }))
//    }
//  },
//  pub: new Proxy(
//    {},
//    {
//      get(obj, prop) {
//        return (eventData: any) => {
//          // broadcast to all open websocket connections
//        }
//      }
//    }
//  ) as ResolvePubber<E>
//})

//const getServiceUrlFromFilename = (filename: string) => {
//  return '/settings/download-manager/service'
//}

//// const createRpcClient = <S extends ServiceGeneric, E extends EventsGeneric>(
////   route: Route,
////   fetch
//// ) =>

//const createRpcClient = <S extends ServiceGeneric, E extends EventsGeneric>(route: Route) => (
//  fetch: any
//) => ({
//  get: new Proxy(
//    {},
//    {
//      get(obj, fnKey) {
//        if (typeof fnKey === 'string') {
//          return async (requestData: any) => {
//            const protocol: Request<object> = { fnKey, requestData }
//            const response = await fetch(route, {
//              method: 'PUT',
//              body: JSON.stringify(protocol),
//              headers: { 'Content-Type': 'application/json' }
//            })
//            const result: Response<object> = await response.json()
//            const { success, failure } = result
//            if (failure) throw new Error(failure.message)
//            else return success
//          }
//        } else {
//          throw new Error('invalid client accessor')
//        }
//      }
//    }
//  ) as ResolveClient<S>,
//  set: {},
//  sub: new Proxy(
//    {},
//    {
//      get(obj, event) {
//        if (typeof event === 'string') {
//          return (cb: (eventData: any) => void) => {
//            // websocket listener logic goes here
//          }
//        } else {
//          throw new Error('invalid accessor')
//        }
//      }
//    }
//  ) as ResolveSubber<E>
//})
//// const createRpcClient = <T extends ServiceGeneric, E extends EventsGeneric>(
////   route: Route,
////   handlers: ResolveHandlers<T>
//// ) => (fetch): ResolveClient<T> => {
////   const client: any = {}
////   for (const [fnKey, fn] of Object.entries(handlers)) {
////     client[fnKey] = async (requestData: object) => {
////       const protocol: Request<object> = { fnKey, requestData }
////       const response = await fetch(route, { method: 'put', body: JSON.stringify(protocol) })
////       const result: Response<object> = await response.json()
////       const { success, failure } = result
////       if (failure) throw new Error(failure.message)
////       else return success
////     }
////   }
////   return client
//// }

//export { createRpcService, createRpcClient, getServiceUrlFromFilename }

//// // this should be replaced with an express Middleware definition
//// type MiddlewareFunction = ReturnType<typeof createRpcMiddleware>
//// const createRpcMiddleware = <T extends ServiceGeneric>(
////   route: Route,
////   handlers: ResolveHandlers<T>
//// ) => {
////   return async (req: any, res: any, next: Function) => {
////     const { fnKey, requestData } = req.body
////     try {
////       const responseData = await handlers[fnKey](requestData)
////       res.send({ success: responseData, failure: null })
////     } catch (e) {
////       res.send({ success: null, failure: e })
////     }
////     next()
////   }
//// }

//// const createRouteRpc = <T extends ServiceGeneric>(
////   route: Route,
////   handlers: ResolveHandlers<T>
//// ): { client: ResolveClient<T>; middleware: [Route, MiddlewareFunction] } => {
////   const client = createRpcClient<T>(route, handlers)
////   const middleware: [Route, MiddlewareFunction] = [route, createRpcMiddleware(route, handlers)]
////   return { client, middleware }
//// }

//// export { createRouteRpc }
////
//export const y = 3
