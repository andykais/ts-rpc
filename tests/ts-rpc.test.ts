import { test } from '../../testing/tools.ts'
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
  | rpc.Event<'message', User>
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
    throw new Error('unimplemented')
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

  /* interesting thought here to propagate events outside of a module:

    const rpc_server = new Api()
    // essentially we would just dogfood our own client api on the server. Easy enough
    rpc_server.chat.on('client_added', (client: ClientEmitter, data: User) => {
      rpc_server.telemetry.record_new_user(data)
    })

  */

  /*
   * TODO we need to decide how event sse emitters are used on event endpoints
   *

  // another approach is on startup, the client can just create an event stream for the whole client. Something like
  const client = new Client<ApiSkeleton>({ realtime: true })
  // This is then always receiving events. The downside is that a 'real' sdk would do some auth before attempting to grab a realtime connection, e.g. its tied to business logic
  // maybe I can make this explicit, something like a reserved method like 'realtime_connect' in the cases where we actually want to delay the connection
  // for our needs though, this is simple and good.


  @events
  async connect_to_chat(client: ClientEmitter, username: string) {
  }

  async connect_to_chat(username) {
    const user: User = { username }
    if (clients.has(username)) throw new RPCError('Duplicate', 'Username already exists')

    clients.set(username, { user, realtime: this.sse })

    // clients.push({ user, realtime: this.sse })
    this.sse.on('close', () => {
      clients.delete(username)
      // const index = clients.findIndex(c => c.user === user)
      // clients.splice(index, 1)
      for (const [_, client] of clients) client.realtime.emit('clientRemoved', user)
      console.log(`client ${user.username} removed`)
    })
    for (const [_, client] of clients) client.realtime.emit('clientAdded', user)
  }
  */
}

class Api extends rpc.ApiController<Context> {
  chat = this.module(ChatApi)

  server_time(): Date {
    throw new Error('unimplemented')
  }

//   foo() {}
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

test.only('client & server', async t => {
  t.fake_fetch.disable()

  const app = new oak.Application()
  const router = new oak.Router()
  const context: Context = { db: new Database() }
  router.put('/rpc/:signature', rpc.adapt(new Api(context)))
  app.use(router.routes())
  const abort_controller = new AbortController()
  const promise = app.listen({ port: 8001, signal: abort_controller.signal })

  await new Promise(resolve => setTimeout(resolve, 100))
  expect.expectTypeOf<ApiSpec['chat']['list_clients']>().toMatchTypeOf<() => Promise<User[]>>()
  expect.expectTypeOf<ApiSpec['server_time']>().toMatchTypeOf<() => Promise<Date>>()

  const client = rpc_client.create<ApiSpec>('http://0.0.0.0:8001/rpc/:signature')
  // await client.manager.realtime_connect()

  const users = await client.chat.list_clients()
  t.assert.equals(users, [])

  abort_controller.abort()
  await promise
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

