import * as Rx from 'rxjs'

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
  // GenerateClientApiModule,
  // GenerateClientApi,
  EventsDefinition,
  ArgumentTypes
}

// utility types
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never

// type GenerateClientApiModule<T extends ApiModule> = {
//   [K in keyof T]: (...args: ArgumentTypes<T[K]>) => Promise<ReturnType<T[K]>>
// }
// type GenerateClientApi<T extends ApiDefinition> = {
//   [K in keyof T]: GenerateClientApiModule<T[K]>
// }

// interface ServerEmitterI<T> {
//   'rpc-internal-class-identifier': 'sse'
// }
// type GenerateServerReturnType<T> = T extends EventStream<infer R> ? ServerEmitterI<R> : T
// type GenerateServerEmitFunction<T extends EventsDefinition> = {}

// // prettier-ignore
// type GenerateServerApiModule<T extends ApiModule> = {
//   // [K in keyof T]: (...args: ArgumentTypes<T[K]>) => Promise<ReturnType<T[K]>>
//   [K in keyof T]: (...args: ArgumentTypes<T[K]>) => Promise<GenerateServerReturnType<ReturnType<T[K]>>>
// }
// type GenerateServerApi<T extends ApiDefinition> = {
//   [K in keyof T]: GenerateServerApiModule<T[K]>
// }

type ValidateApiDefinition<T extends ApiDefinition> = T
