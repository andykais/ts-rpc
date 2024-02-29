import { test } from '../../testing/tools.ts'

import {create_rpc_server} from '../server.ts'
import {create_rpc_client} from '../client.ts'
import {oak} from '../src/deps.server.ts'

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
