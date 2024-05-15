import { type ApiController } from '../server.ts'


type JsonPrimitive = void | Date | string | number | boolean | null
interface JsonMap extends Record<string, JsonPrimitive | JsonArray | JsonMap> {}
interface JsonArray extends Array<JsonPrimitive | JsonArray | JsonMap> {}
export type Json = JsonPrimitive | JsonMap | JsonArray


export type Event<EventName, EventData> = {
  name: EventName
  data: EventData
}

export type SpecMethod = (...args: any[]) => any // TODO why cant I put the Json type here?
export type SpecModule = typeof ApiController<any, any, any>

type EnsurePromise<T> = T extends Promise<infer V>
  ? Promise<V>
  : Promise<T>

type EnsureMethodReturnsPromise<T extends SpecMethod> = (...args: Parameters<T>) => EnsurePromise<ReturnType<T>>


type SpecEventListenerInterface<Events> = {
  on: <K extends keyof Events>(event: K, fn: (data: Events[K]) => void) => void
}

type ExtractSpec<T> = {
  [K in keyof T]:
    T[K] extends SpecMethod
      ? EnsureMethodReturnsPromise<T[K]>
      : T[K] extends ApiController<any, infer E, any>
        ? ExtractSpec<T[K]> & SpecEventListenerInterface<E>
        : never
}

export type InferSpec<RPCServer extends typeof ApiController<any, any, any>> =
  ExtractSpec<InstanceType<RPCServer>>

export type SpecBlueprint = {
  [name: string]:
    | SpecBlueprint
    | SpecMethod
}


type AllKeys<T> = T extends any ? keyof T : never;

type PickType<T, K extends AllKeys<T>> = T extends { [k in K]?: any }
  ? T[K]
  : never;

type Merge<T extends object> = {
  [k in AllKeys<T>]: PickType<T, k>;
};

type UnionToRecordTuple<T> = T extends Event<any, any> ? Record<T['name'], T['data']> : never
