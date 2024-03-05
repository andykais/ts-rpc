import { test } from '../../testing/tools.ts'

import {create_rpc_server} from '../server.ts'
import {create_rpc_client} from '../client.ts'
import {z, oak} from '../src/deps.server.ts'

test('basic', async t => {
  const app = new oak.Application()
  const router = new oak.Router()
  router.put('/rpc/:signature', create_rpc_server().adapters.oak)
  app.use(router.routes())
  const server_controller = new AbortController()
  const server_promise = app.listen({
    port: 8001,
    signal: server_controller.signal,
  })

  await new Promise(resolve => setTimeout(resolve, 100))
  server_controller.abort()
  await server_promise
})


const User = z.object({
  id: z.string(),
  username: z.string(),
  created_at: z.datetime(),
})

const api = create_api({
  accounts: create_module({
    // design #1
    create: create_function({
      params: z.object({ username: z.string() }),
      result: User
    })

    // design #2
    create: create_function(
      z.object({ username: z.string() }),
      User,
    )

    // design #3
    create: z.function()
      .args([z.object({ username: z.string() })])
      .returns(User)
  })
})

// NOTE if we want to create a server function (validate args only, and make validation optional)
// and a client side function (validate returns as args) we may need to create our own function() method that dumps enough data to create those zod validators
const zfunc = z.function()
  .args([z.number()])
  .returns(z.string())



