# ts-rpc

A typesafe remote procedure call (RPC) library focused on human readable REST-like api calls and server pushes via server sent events. Define your server api once, and get client usage auto complete & type safety for free!


## Usage

First, define an api for your backend
```ts
// this implementation uses an oak rest server, so we will import our backend dependencies from the oak adapter
import * as rpc from 'ts-rpc/adapters/oak.ts'


interface Todo {
  id: number
  created_at: Date
  message: string
  completed_on: Date
}

class TodoApi extends rpc.ApiController<Context> {
  create(message: string): Todo {
    return this.context.db.create_todo({message, completed_on: null })
  }
  complete(todo_id; number): Todo {
    this.context.db.update_todo(todo_id, {completed_on: new Date()})
  }
  list(): Todo[] {
    return this.context.db.list_todos()
  }
}

class Api extends rpc.ApiController<Context> {
  todo = this.module(TodoApi)

  time() {
    return new Date()
  }
}
```

Then, integrate it into your server
```ts
import oak from 'oak'
import Database from './database.ts'

const app = new oak.Application()
const router = new oak.Router()
const context: Context = { db: new Database() }
router.put('/rpc', rpc.adapt(Api, context))
app.use(router.routes())
app.listen()
```


Finally, instantiate your client (in the browser or wherever)
```ts
import * as rpc from 'ts-rpc/client.ts'

const client = rpc.create<ApiSpec>('/rpc')

const todo = await client.todo.create('do laundry')
await client.todo.complete(todo.id)
const todos = client.todo.list()
```

## Realtime
`ts-rpc` supports server push messages using [Server Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).

```ts
interface Events {
  added: Todo
  completed: Todo
}
class TodoApi extends rpc.ApiController<Context, Events> {
  create(message: string): Todo {
    const todo = this.context.db.create_todo({message, completed_on: null })
    this.request.realtime.emit('completed', todo)
  }
  complete(todo_id; number): Todo {
    this.context.db.update_todo(todo_id, {completed_on: new Date()})
    const todo = this.context.db.get_todo(todo_id)
    // `request` field is populated per-request with a class that maintains the SSE connection
    this.request.realtime.emit('completed', todo)
  }
  list(): Todo[] {
    return this.context.db.list_todos()
  }
}
```
These can then be listened to on the client like so:
```ts
import * as rpc from 'ts-rpc/client.ts'

const client = rpc.create<ApiSpec>('/rpc')
client.todo.on('added', todo => {
  console.log(`Added a new todo: ${todo.message}`)
})

client.todo.on('completed', todo => {
  console.log(`Completed todo ${todo.message} on ${todo.completed_on}`)
})

const todo = await client.todo.create('do laundry')
await client.todo.complete(todo.id)
const todos = client.todo.list()
```
