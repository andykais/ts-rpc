import { GenerateServerApi, ServerEmitter, RPCError } from 'ts-rpc/server'
import { Api, User, ChatRealtime } from '../../definition'
import { ServerApi } from '../'

type ChatApi = ServerApi['chat']

const clients = new Map<string, { user: User; realtime: ServerEmitter<ChatRealtime> }>()

// const clients: { user: User; realtime: ServerEmitter<ChatRealtime> }[] = []

const chatApi: ChatApi = {
  listClients: async () => Array.from(clients.values()).map(c => c.user),

  sendMessage: async (user, message) => {
    for (const [username, client] of clients) client.realtime.emit('message', user, message)
    console.log('clients.length', clients.size)
  },

  async connectToChat(username) {
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
}

export default chatApi
