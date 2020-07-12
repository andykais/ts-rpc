type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never

type ServiceGeneric = { [fnName: string]: (request: object) => any }
type EventsGeneric = { [eventName: string]: any }

type Request<T> = { fnKey: string; requestData: T }
type Response<T> = { success: T; failure: Error }
type ResolveHandlers<I extends ServiceGeneric> = {
  // [K in keyof I]: ReplaceReturnType<I[K], Promise<ReturnType<I[K]>>>
  [K in keyof I]: (request: ArgumentTypes<I[K]>[0]) => Promise<ReturnType<I[K]>>
}
type ResolveClient<I extends ServiceGeneric> = {
  [K in keyof I]: (request: ArgumentTypes<I[K]>[0]) => Promise<Response<ReturnType<I[K]>>>
}
type ResolvePubber<I extends EventsGeneric> = { [K in keyof I]: (eventData: I[K]) => boolean }
type ResolveSubber<I extends EventsGeneric> = {
  [K in keyof I]: (cb: (eventData: I[K]) => void) => void
}

type Route = string

export {
  ServiceGeneric,
  EventsGeneric,
  Route,
  Request,
  Response,
  ResolveHandlers,
  ResolveClient,
  ResolvePubber,
  ResolveSubber
}
