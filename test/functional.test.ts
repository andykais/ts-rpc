import { test, assert_equals } from './util.ts'
import { Client } from '../src/client.ts'
import { create_rpc_server } from '../src/server.ts'
import { Application, Router, } from "https://deno.land/x/oak@v11.1.0/mod.ts";


type HealthSpec = {
  time(): Date
}

type Spec = {
  health: HealthSpec
}


class HealthServerApi implements HealthSpec {
  time() {
    return new Date()
  }
}

class ServerApi implements Spec {
  health = new HealthServerApi()
}

test('client->server rest', async () => {
  const controller = new AbortController()
  try{

  const client = Client.create<Spec>('http://localhost:3000/rpc')
  const server = create_rpc_server<Spec>(new ServerApi())
  const app = new Application()
  app.use(server.oak_handler)
  app.listen({ port: 3000, signal: controller.signal });

  const time = await client.health.time()
  assert_equals(typeof time, 'object')

  controller.abort()
  } finally {
    controller.abort()
  }
})
