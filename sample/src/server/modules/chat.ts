import { GenerateServerApi, ServerEmitter } from 'ts-rpc/server'
import { Api, User, ChatRealtime } from '../../definition'
import { ServerApi } from '../'

type ChatApi = ServerApi['chat']

const clients: { user: User; realtime: ServerEmitter<ChatRealtime> }[] = []

const chatApi: ChatApi = {
  listClients: async () => clients.map(c => c.user),

  sendMessage: async (user, message) => {
    for (const client of clients) client.realtime.emit('message', user, message)
    console.log('clients.length', clients.length)
  },

  async connectToChat(username) {
    const user: User = { username }
    clients.push({ user, realtime: this.sse })
    this.sse.on('close', () => {
      const index = clients.findIndex(c => c.user === user)
      clients.splice(index, 1)
      for (const client of clients) client.realtime.emit('clientRemoved', user)
      console.log('client removed')
    })
    for (const client of clients) client.realtime.emit('clientAdded', user)
  }
}

export default chatApi
