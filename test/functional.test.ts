import { test, assert_equals, assert_true, expect_type } from './util.ts'
import { Client } from '../src/client.ts'
import { Server } from '../src/server.ts'
import { Application, Router, } from "https://deno.land/x/oak@v11.1.0/mod.ts";

interface Book {
  title: string
  genre: string
}

// define our shared client/server contracts
type HealthSpec = {
  time(): Date
  sleep(seconds: number): Promise<void>
}

type BookSpec = {
  list(query: { genre: string }): { count: number; books: Book[] }
}

type Spec = {
  version: () => string
  health: HealthSpec
  books: BookSpec
}

// create the server rpc functions
// server functions can be either classes or pure objects, it doesnt matter
const health_api: HealthSpec = {
  time: () => new Date(),
  sleep: (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000)),
}

class BookApi implements BookSpec {
  constructor(private db: Book[]) {}

  list: BookSpec['list'] = (query) => {
    const books = this.db.filter(book => book.genre === query.genre)
    return {
      count: books.length,
      books,
    }
  }
}

class ServerApi implements Spec {
  db: Book[]
  health: HealthSpec
  books: BookApi

  version() { return '1.0.0' }

  constructor() {
    this.db = [
      { title: 'The Hobbit', genre: 'fantasy' },
      { title: 'Enders Game', genre: 'scifi' },
    ]
    this.health = health_api
    this.books = new BookApi(this.db)
  }
}

test('client->server rest', async () => {
  const controller = new AbortController()
  try{

    const client = Client.create<Spec>('http://localhost:3000/rpc')
    const server = Server.create<Spec>(new ServerApi())
    const app = new Application()
    app.use(server.oak_handler)
    app.listen({ port: 3000, signal: controller.signal });

    const time = await client.health.time()
    assert_equals(typeof time, 'object')
    expect_type<Date>(time)
    assert_true(time.getTime() > 0)
    assert_true(time.getTime() <= Date.now())
    assert_equals(new Date(time), time)

    const books_fantasy = await client.books.list({ genre: 'fantasy' })
    expect_type<{ count: number; books: { title: string; genre: string }[] }>(books_fantasy)
    assert_equals(books_fantasy.count, 1)
    assert_equals(books_fantasy.books[0].title, 'The Hobbit')

    const books_scifi = await client.books.list({ genre: 'scifi' })
    assert_equals(books_scifi.count, 1)
    assert_equals(books_scifi.books[0].title, 'Enders Game')

    const before_time = performance.now()
    await client.health.sleep(1)
    const seconds_elapsed = (performance.now() - before_time) / 1000
    assert_true(seconds_elapsed >= 1)

  } finally {
    controller.abort()
  }
})
