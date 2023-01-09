type Literal = boolean | null | number | string;
type Json = Literal | { [key: string]: Json } | Json[];
export type RichJson = void | Date | Literal | { [key: string]: RichJson } | RichJson[];

export type ApiFunction = (...args: any[]) => any // Json type is good...but it makes interfaces pretty much useless

export interface ApiSpec {
  [module_or_method: string]: ApiSpec | ApiFunction
}

/**
 * use this class for errors shared on both the client & server
 * on the server, throw a class implementing this error
 * on the client, register these errors when instantiating the client
 */
class RPCError extends Error {
  public constructor(message: string, public data?: RichJson) {
    super(message)
  }
}

export { RPCError }
