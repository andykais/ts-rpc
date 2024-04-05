import { test } from './tools/tools.ts'
import * as rpc from '../server.ts'
import * as rpc_client from '../client.ts'
import {z, oak} from '../src/deps.server.ts'
import * as expect from 'npm:expect-type@0.19.0'


class Database {}


interface User {
  id: number
  username: string
  created_at: Date
}

type Events =
  | rpc.Event<'user_message', {chat_message: string}>
  | rpc.Event<'client_added', User>
  | rpc.Event<'client_removed', User>

interface Context {
  db: Database
}

class ChatApi extends rpc.ApiController<Context, Events> {
  // hmm is this good, or should we have a module specific context as well?
  // the key piece here is tying a realtime connection to a 
  protected chat_clients = new Map<User['id'], rpc.ClientEmitter<Events>>()

  list_clients(): User[] {
    return []
  }

  // TODO some kind of 'auth' protocol that allows for attaching contextual data (either via headers or baked into the protocol)
  async send_message(user_id: number, message: string) {
    // TODO important note about this design. It is nice to have context, but we _need_ to instantiate the class on every request
    // or else we will be swapping this in and out which cannot work with async code
    this.request.realtime.emit('user_message', {chat_message: 'foobar'})
  }

  async join_chat(username: string) {
    // create user...
    const user = { id: -1, username, created_at: new Date() }
    // connect to chat...
    this.chat_clients.set(user.id, this.request.realtime)
    // handle cleanup when they disconnect...
    this.request.realtime.on('disconnect', () => {
      this.chat_clients.delete(user.id)
    })

    // fire off message
    for (const client of this.chat_clients.values()) {
      client.emit('client_added', user)
    }
  }
}

class Api extends rpc.ApiController<Context> {
  chat = this.module(ChatApi)

  server_time(): Date {
    return new Date()
  }
}


type ApiSpec = rpc.InferSpec<typeof Api>

test('client contracts', async t => {
  t.assert.fetch({
    request: {
      url: 'http://localhost:8080/rpc/chat.list_clients',
      method: 'PUT',
      body: JSON.stringify({
        namespace: ['chat', 'list_clients'],
        params: [],
      })
    },
    response: {
      body: JSON.stringify({ result: [{ id: 0, username: 'bob', created_at: new Date() }] })
    }
  })
  const client = rpc_client.create<ApiSpec>('http://localhost:8080/rpc/:signature')

  const users = await client.chat.list_clients()
  t.assert.equals(users.length, 1)
  t.assert.equals(users[0].id, 0)
  t.assert.equals(users[0].username, 'bob')
  // // TODO serializedates properly
  // t.assert.equals(users[0].created_at, new Date())


  // now lets try this without a signature
  t.assert.fetch({
    request: {
      // default domain is http://localhost
      url: 'http://localhost/rpc',
      method: 'PUT',
      body: JSON.stringify({
        namespace: ['chat', 'send_message'],
        params: [0, 'hello world'],
      })
    },
    response: {
      body: JSON.stringify({ result: undefined })
    }
  })
  const client_without_signature = rpc_client.create<ApiSpec>('/rpc')

  const empty_response = await client_without_signature.chat.send_message(0, 'hello world')
  t.assert.equals(empty_response, undefined)
})

test('client & server', async t => {
  t.fake_fetch.disable()

  const app = new oak.Application()
  const router = new oak.Router()
  const context: Context = { db: new Database() }
  router.put('/rpc/:signature', rpc.adapt(new Api(context)))
  app.use(router.routes())
  const abort_controller = new AbortController()
  app.listen({ port: 8001, signal: abort_controller.signal })
  await new Promise(resolve => app.addEventListener('listen', resolve))
  expect.expectTypeOf<ApiSpec['chat']['list_clients']>().toMatchTypeOf<() => Promise<User[]>>()
  expect.expectTypeOf<ApiSpec['server_time']>().toMatchTypeOf<() => Promise<Date>>()

  const client = rpc_client.create<ApiSpec>('http://0.0.0.0:8001/rpc/:signature')

  const users = await client.chat.list_clients()
  t.assert.equals(users, [])

  abort_controller.abort()
  await new Promise(resolve => app.addEventListener('close', resolve))
})

test.only('client & server w/ realtime events', async t => {
  t.fake_fetch.disable()

  const app = new oak.Application()
  const router = new oak.Router()
  const context: Context = { db: new Database() }
  router.all('/rpc/:signature', rpc.adapt(new Api(context)))
  app.use(router.routes())
  const abort_controller = new AbortController()
  app.listen({ port: 8001, signal: abort_controller.signal })
  await new Promise(resolve => app.addEventListener('listen', resolve))

  const client = rpc_client.create<ApiSpec>('http://0.0.0.0:8001/rpc/:signature')
  const realtime_error_promise = Promise.withResolvers()
  await client.manager.realtime.connect()

  // await new Promise(resolve => setTimeout(resolve, 100))
  console.log('connected to realtime!')
  // await realtime_error_promise.promise
  // console.log('aborting server...')
  // client.chat.on('user_message', data => {
  // })
  // // or
  // client.manager.realtime.on('chat.user_message', data => {
  // })

  client.manager.realtime.disconnect()
  await client.manager.realtime.status
  abort_controller.abort()
  await new Promise(resolve => app.addEventListener('close', resolve))
  console.log('server closed')
})


// const User = z.object({
//   id: z.string(),
//   username: z.string(),
//   created_at: z.datetime(),
// })

// const api = create_api({
//   accounts: create_module({
//     // design #1
//     create: create_function({
//       params: z.object({ username: z.string() }),
//       result: User
//     })

//     // design #2
//     create: create_function(
//       z.object({ username: z.string() }),
//       User,
//     )

//     // design #3
//     create: z.function()
//       .args([z.object({ username: z.string() })])
//       .returns(User)
//   })
// })

// // NOTE if we want to create a server function (validate args only, and make validation optional)
// // and a client side function (validate returns as args) we may need to create our own function() method that dumps enough data to create those zod validators
// const zfunc = z.function()
//   .args([z.number()])
//   .returns(z.string())




// class AccountsController extends Controller {
//   @validate(z.object({ username: z.string().optional() }))
//   async create(data: { username: string | undefined }) {
//     data.username ??= uuid.generate()
//     return data
//   }


//   create = method()
//     .validate(z.object({
//       username: z.string()
//     }))
//     .respond(async data => {
//       // do something
//       return user
//     })

//   @api.endpoint()
//   create = api.validate(z.object({ username: z.string() }), async data => {

//   })

//   events = new Emitter<Events>()
// }

// const accounts_module = module('accounts')
//   .method(
//     async data => {
//       // do something
//       return user
//     }
//   )


// // lets compare this to how ptyhon projects do this
// const python_code = python`

//   @game_server.controller(url='/game_servers/<type>/instances')
//   class GameServerInstanceController(Controller)
//     @game_server.endpoint(url='/', method='POST')
//     def launch(game_server_type_slug: str):
//       return game_server_instance.resolve(self.context)
// `



// // lets compare this to how a web app router registers controllers
// import { Application } from "jsr:@oak/oak/application";
// import { Router } from "jsr:@oak/oak/router";

// const router = new Router();
// router.get("/", (ctx) => {
//   ctx.response.body = `<!DOCTYPE html>
//     <html>
//       <head><title>Hello oak!</title><head>
//       <body>
//         <h1>Hello oak!</h1>
//       </body>
//     </html>
//   `;
// });

// const app = new Application();
// app.use(router.routes());
// app.use(router.allowedMethods());

// app.listen({ port: 8080 });

