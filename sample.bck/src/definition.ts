import { EventStream } from 'ts-rpc'

type User = {
  username: string
}

type ChatRealtime = EventStream<{
  // message: [user: User, message: string]
  message: [User, string]
  clientAdded: [User]
  clientRemoved: [User]
}>

type Api = {
  chat: {
    listClients(): User[]
    sendMessage(user: User, message: string): void
    connectToChat(username: string): ChatRealtime
  }
}

export { Api, User, ChatRealtime }
