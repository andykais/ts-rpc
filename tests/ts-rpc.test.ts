import { test } from './tools/tools.ts'
import * as rpc from 'ts-rpc/adapters/oak.ts'
// import * as rpc from '../server.ts'
import * as rpc_client from '../client.ts'
import {z, oak} from '../src/deps.server.ts'
import * as expect from 'npm:expect-type@0.19.0'


interface User {
  id: number
  username: string
  created_at: Date
}


class Database {
  #users: Map<User['id'], User> = new Map()

  create_user(username: string) {
    const user = { id: Math.ceil(Math.random() * 1000), username, created_at: new Date() }
    this.#users.set(user.id, user)
    return user
  }

  get_user(user_id: number) {
    const user = this.#users.get(user_id)
    if (!user) throw new Error('not found')
    else return user
  }

  list_users(query?: { user_ids: number[] }) {
    const user_list = [...this.#users.values()]
    if (query?.user_ids) {
      return user_list.filter(user => query.user_ids.includes(user.id))
    }
    return user_list
  }
}


interface Events {
  user_message: {from_user_id: User['id']; chat_message: string}
  client_added: User
  client_removed: User
}

class ChatRoom extends Map<User['id'], rpc.ClientRealtimeEmitter<Events>> {
  add_user(user: User, realtime: rpc.ClientRealtimeEmitter<Events>) {
    realtime.status.finally(() => {
      this.delete(user.id)
      for (const [user_id, client] of this.entries()) {
        client.emit('client_removed', user)
      }
    })

    this.set(user.id, realtime)
    for (const [user_id, client] of this.entries()) {
      client.emit('client_added', user)
    }
  }

  list_users(context: Context) {
    return context.db.list_users({user_ids: [...this.keys()]})
  }

  send_message(user_id: User['id'], chat_message: string) {
    for (const client of this.values()) {
      client.emit('user_message', {from_user_id: user_id, chat_message })
    }
  }
}

type ChatRoomName = string
class ChatRooms extends Map<ChatRoomName, ChatRoom> {
  create(chat_room: string): ChatRoom {
    const chat_room_impl = super.get(chat_room) ?? new ChatRoom()
    this.set(chat_room, chat_room_impl)
    return chat_room_impl
  }

  get(chat_room: string) {
    const chat_room_impl = super.get(chat_room)
    if (!chat_room_impl) throw new Error('not found')
    return chat_room_impl
  }
}

interface Context {
  db: Database
  chat_rooms: ChatRooms
}


class UserApi extends rpc.ApiController<Context> {
  create(username: string) {
    return this.context.db.create_user(username)
  }
}

class ChatApi extends rpc.ApiController<Context, Events> {
  list_chat_rooms(): string[] {
    return [...this.context.chat_rooms.keys()]
  }

  list_users(chat_room: string): User[] {
    const chat_room_impl = this.context.chat_rooms.get(chat_room)
    return chat_room_impl.list_users(this.context)
  }

  send_message(user_id: number, chat_room: string, message: string) {
    const chat_room_impl = this.context.chat_rooms.get(chat_room)
    chat_room_impl.send_message(user_id, message)
  }

  join_chat(user_id: number, chat_room: string) {
    const user = this.context.db.get_user(user_id)
    const chat_room_impl = this.context.chat_rooms.create(chat_room)
    chat_room_impl.add_user(user, this.request.realtime)
  }
}

class Api extends rpc.ApiController<Context> {
  chat = this.module(ChatApi)

  user = this.module(UserApi)

  server_time(): Date {
    return new Date()
  }
}


type ApiSpec = rpc.InferSpec<typeof Api>

test('client contracts', async t => {
  t.assert.fetch({
    request: {
      url: 'http://localhost:8080/rpc/chat.list_users',
      method: 'PUT',
      body: JSON.stringify({
        type: '__REQUEST__',
        namespace: ['chat'],
        method: 'list_users',
        params: ['coolguys'],
      })
    },
    response: {
      body: JSON.stringify({ result: [{ id: 0, username: 'bob', created_at: new Date() }] })
    }
  })
  const client = rpc_client.create<ApiSpec>('http://localhost:8080/rpc/:signature')

  const users = await client.chat.list_users('coolguys')
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
        type: '__REQUEST__',
        namespace: ['chat'],
        method: 'send_message',
        params: [0, 'my-chat-room', 'hello world'],
      })
    },
    response: {
      body: JSON.stringify({ result: undefined })
    }
  })
  const client_without_signature = rpc_client.create<ApiSpec>('/rpc')

  const empty_response = await client_without_signature.chat.send_message(0, 'my-chat-room', 'hello world')
  t.assert.equals(empty_response, undefined)
})

test('client & server', async t => {
  t.fake_fetch.disable()

  const app = new oak.Application()
  const router = new oak.Router()
  const context: Context = { db: new Database(), chat_rooms: new ChatRooms() }
  router.put('/rpc/:signature', rpc.adapt(Api, context))
  app.use(router.routes())
  const abort_controller = new AbortController()
  app.listen({ port: 8001, signal: abort_controller.signal })
  await new Promise(resolve => app.addEventListener('listen', resolve))
  expect.expectTypeOf<ApiSpec['chat']['list_chat_rooms']>().toMatchTypeOf<() => Promise<string[]>>()
  expect.expectTypeOf<ApiSpec['server_time']>().toMatchTypeOf<() => Promise<Date>>()

  const client = rpc_client.create<ApiSpec>('http://0.0.0.0:8001/rpc/:signature')

  const chat_rooms = await client.chat.list_chat_rooms()
  t.assert.equals(chat_rooms, [])

  const server_status = new Promise(resolve => app.addEventListener('close', resolve))
  abort_controller.abort()
  await server_status
})

test('client & server w/ realtime events', async t => {
  t.fake_fetch.disable()

  const app = new oak.Application()
  const router = new oak.Router()
  const context: Context = { db: new Database(), chat_rooms: new ChatRooms() }
  router.all('/rpc/:signature', rpc.adapt(Api, context))
  app.use(router.routes())
  const abort_controller = new AbortController()
  app.listen({ port: 8001, signal: abort_controller.signal })
  await new Promise(resolve => app.addEventListener('listen', resolve))

  const client_1 = rpc_client.create<ApiSpec>('http://0.0.0.0:8001/rpc/:signature')
  const realtime_error_promise = Promise.withResolvers()
  await client_1.manager.realtime.connect()

  await t.step({
    name: 'test date serialization',
    ignore: true,
    fn: async () => {
      await client_1.server_time()
    }
  })

  const events: {
    client_added: Events['client_added'][]
    user_message: Events['user_message'][]
  } = {
    client_added: [],
    user_message: [],
  }
  client_1.chat.on('client_added', message => {
    events.client_added.push(message)
  })
  client_1.chat.on('user_message', message => {
    events.user_message.push(message)
  })


  const user_bob = await client_1.user.create('bob')
  await client_1.chat.join_chat(user_bob['id'], 'coolguys')
  t.assert.list_partial(events.client_added, [{username: 'bob'}])

  const users = await client_1.chat.list_users('coolguys')
  t.assert.list_partial(await client_1.chat.list_users('coolguys'), [{username: 'bob'}])

  const client_2 = rpc_client.create<ApiSpec>('http://0.0.0.0:8001/rpc/:signature')
  await client_2.manager.realtime.connect()
  const user_alice = await client_2.user.create('alice')
  await client_2.chat.join_chat(user_alice['id'], 'coolguys')
  t.assert.list_partial(events.client_added, [{username: 'bob'}, {username: 'alice'}])

  t.assert.list_partial(await client_1.chat.list_users('coolguys'), [{username: 'bob'}, {username: 'alice'}])

  await client_2.chat.send_message(user_alice.id, 'coolguys', 'sup nerds')

  // now lets disconnect alice and make sure all our hooks for the disconnect fired correctly
  client_2.manager.realtime.disconnect()
  // this happens over io which uses the event loop, so we await here to make sure our message gets sent before we assert
  await new Promise(resolve => setTimeout(resolve))
  t.assert.list_partial(await client_1.chat.list_users('coolguys'), [{username: 'bob'}])

  // TODO test non-existent routes and sending non serializable data (like functions)

  client_1.manager.realtime.disconnect()
  await client_1.manager.realtime.status
  await client_2.manager.realtime.status
  const server_status = new Promise(resolve => app.addEventListener('close', resolve))
  abort_controller.abort()
  await server_status
})
