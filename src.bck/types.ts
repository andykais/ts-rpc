import { RPCError } from './errors'

type JsonPrimitive = void | Date | string | number | boolean | null
interface JsonMap extends Record<string, JsonPrimitive | JsonArray | JsonMap> {}
interface JsonArray extends Array<JsonPrimitive | JsonArray | JsonMap> {}
type Json = JsonPrimitive | JsonMap | JsonArray

type ApiFunction = (...args: any[]) => Json
type ApiModule = {
  [method: string]: ApiFunction
}
type ApiDefinition = {
  [moduleNamespace: string]: ApiModule
}

type EventsDefinition = {
  [eventName: string]: any[]
  // TODO add error types
  // error: [RPCError]
}
type EventStream<T extends EventsDefinition> = {
  'rpc-internal-identifier': 'sse'
}

export {
  Json,
  ApiFunction,
  ApiModule,
  ApiDefinition,
  EventStream,
  ValidateApiDefinition,
  EventsDefinition,
  ArgumentTypes
}

// utility types
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never

type ValidateApiDefinition<T extends ApiDefinition> = T
