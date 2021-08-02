type Literal = boolean | null | number | string;
export type Json = Literal | { [key: string]: Json } | Json[];
// TODO support rich json?
export type RichJson = void | Date | Literal | { [key: string]: Json } | Json[];


export type ApiFunction = (...args: any[]) => Json | void

export interface ApiSpec {
  [module_or_method: string]: ApiSpec | ApiFunction
}

/**
 * use this class for errors shared on both the client & server
 * on the server, throw a class implementing this error
 * on the client, register these errors when instantiating the client
 */
class RPCError extends Error {
  public constructor(message: string, public data?: Json) {
    super(message)
  }
}

export { RPCError }
