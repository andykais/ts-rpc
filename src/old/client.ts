import {
  ServiceGeneric,
  EventsGeneric,
  Route,
  Request,
  Response,
  ResolveClient,
  ResolveSubber
} from './types'

const RpcClient = <S extends ServiceGeneric, E extends EventsGeneric>(route: Route) => (
  fetch: any
) => ({
  get: new Proxy(
    {},
    {
      get(obj, fnKey) {
        if (typeof fnKey === 'string') {
          return async (requestData: any) => {
            const protocol: Request<object> = { fnKey, requestData }
            const response = await fetch(route, {
              method: 'PUT',
              body: JSON.stringify(protocol),
              headers: { 'Content-Type': 'application/json' }
            })
            const result: Response<object> = await response.json()
            const { success, failure } = result
            if (failure) throw new Error(failure.message)
            else return success
          }
        } else {
          throw new Error('invalid client accessor')
        }
      }
    }
  ) as ResolveClient<S>,
  set: {},
  sub: new Proxy(
    {},
    {
      get(obj, event) {
        if (typeof event === 'string') {
          return (cb: (eventData: any) => void) => {
            // websocket listener logic goes here
          }
        } else {
          throw new Error('invalid accessor')
        }
      }
    }
  ) as ResolveSubber<E>
})

export {
  RpcClient
}
