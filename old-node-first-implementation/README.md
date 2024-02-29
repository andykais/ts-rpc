# ts-rpc

## Usage

First, define an api that both the client and server will use

```ts
// api.ts

// set up some common data structures
type Todo = {
  id: number
  content: string
  completed: boolean
  completedOn?: Date
}

// define the api
type Api = {
  todo: {
    createTodo(todo: string): Todo
    listTodos(): Todo[]
    updateTodoState(todoId: Todo['id'], completed: boolean)
  }
}

export { Api, Todo }
```

Then, set up a server

```ts
// server.js
import express from 'express'
import { createRPCServer, GenerateServerApi } from '<some-package-name>'
import { Api, Todo } from './api'

let uniqueId = 0
const database: { todos: Todo[] } = { todos: [] }

type ServerApi = GenerateServerApi<Api>
const api: ServerApi = {
  todo: {
    async createTodo(content) {
      database.todos.push({ id: uniqueId, content, completed: false })
      uniqueId++
    }

    async updateTodoState(id, completed) {
      const todo = database.todos.find(t => t.id === id)
      todo.completed = completed
    }

    async listTodos() {
      return database.todos
    }
  }
}

const app = express()
app.use('/rpc', createRPCServer<Api>(api))
app.listen(3000, () => console.log('Server listening on port 3000'))
```

Finally, access the api from your browser

```ts
// client.ts
import { createRPCClient } from 'ts-rpc-proxy/client/index'
import { Api } from './definition'

const client = createRPCClient<Api>('/rpc')

;(async () => {
  let todoItem = await client.todo.createTodo('test')

  todoItem = await client.todo.updateTodoState(todoItem.id, true)

  const todos = await client.todo.listTotos()
})()
```

See a fully working example in the [sample](./sample) folder.

## Realtime

Server push messages can be sent using [Server Sent
Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events). The api
is very similar to regular rpc functions.

```ts
// api.ts
import { EventStream } from '../src'

type TodoEvents = EventStream<{
  stateUpdate: [Todo]
}>

type Api = {
  todo: {
    todoEvents(): TodoEvents
  }
}
```

```ts
// server.ts

const todoEvents = []

const api = {
  todo: {
    async updateTodoState(id, completed) {
      const todo = database.todos.find(t => t.id === id)
      todo.completed = completed
      for (const emitter of todoEvents) emitter.emit('stateUpdate', todo)
    }

    async todoEvents() {
      todoEvents.push(this.sse)
      this.sse.onClose(todoEvents.filter(e => e !== this.sse))
    }
  }

}
```

```ts
// client.ts
const emitter = new client.todo.todoEvents()

emitter.on('stateUpdate', updatedTodo => {
  console.log(`Todo ${updatedTodo.id} was marked ${updatedTodo.completed ? 'completed' : 'incomplete'}`)
})
```
