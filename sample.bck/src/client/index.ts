import { createRPCClient, GenerateClientApi, ClientEmitter, RPCError } from 'ts-rpc/client'
import { Api, User } from '../definition'

type ClientApi = GenerateClientApi<Api>

type ChatRealtime = InstanceType<ClientApi['chat']['connectToChat']>

function getColorHSL(string: string) {
  var h, s, l
  const hue = [0, 360]
  const sat = [99, 100]
  const lit = [20, 40]

  var range = function (hash: number, min: number, max: number) {
    var diff = max - min
    var x = ((hash % diff) + diff) % diff
    return x + min
  }

  var hash = 0
  if (string.length === 0) return hash
  for (var i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }

  h = range(hash, hue[0], hue[1])
  s = range(hash, sat[0], sat[1])
  l = range(hash, lit[0], lit[1])

  return `hsl(${h}, ${s}%, ${l}%)`
}
function getOrThrowElement(query: string): Element {
  const element = document.querySelector(query)
  if (!element) throw new Error(`'${query}' not found.`)
  return element
}

async function getUsername(
  client: GenerateClientApi<Api>,
  promptMessage = 'Whats your name?'
): Promise<{ realtime: ChatRealtime; user: User }> {
  const messagesElement = getOrThrowElement('#messages') as HTMLElement
  const anchorElement = getOrThrowElement('#anchor') as HTMLElement

  const username = prompt(promptMessage)
  if (!username) return getUsername(client)

  try {
    const realtime = new client.chat.connectToChat(username)
    return await new Promise((resolve, reject) => {
      // todo also post the 'user added' message from here...
      realtime.on('clientAdded', user => {
        if (user.username === username) {
          resolve({ realtime, user })
          Chat.onUserAdded(messagesElement, anchorElement)(user)
        }
      })
      ;(realtime.on as any)('error', (error: RPCError) => {
        reject(error)
      })
    })
  } catch (e) {
    if (e instanceof RPCError) {
      if (e.code === 'Duplicate') return getUsername(client, 'Username taken! Try another one.')
    }
    throw e
  }
}

class Chat {
  messagesElement: HTMLElement
  anchorElement: HTMLElement
  chatInput: HTMLInputElement

  constructor(private client: ClientApi, private realtime: ChatRealtime, private user: User) {
    const chatboxForm = getOrThrowElement('#chatbox') as HTMLElement
    this.chatInput = getOrThrowElement('#chatbox textarea') as HTMLInputElement
    this.messagesElement = getOrThrowElement('#messages') as HTMLElement
    this.anchorElement = getOrThrowElement('#anchor') as HTMLElement
    this.chatInput.focus()

    chatboxForm.onsubmit = e => {
      e.preventDefault()
      this.sendChatMessage()
    }
    this.chatInput.onkeypress = e => {
      if (e.which == 13 && !e.shiftKey) {
        e.preventDefault()
        this.sendChatMessage()
      }
    }
    this.onChatMessage = this.onChatMessage.bind(this)
    this.onUserRemoved = this.onUserRemoved.bind(this)

    realtime.on('message', this.onChatMessage)
    realtime.on('clientAdded', Chat.onUserAdded(this.messagesElement, this.anchorElement))
    realtime.on('clientRemoved', this.onUserRemoved)
  }

  sendChatMessage() {
    const message = this.chatInput.value
    this.chatInput.value = ''
    this.client.chat.sendMessage(this.user, message)
  }

  onChatMessage(user: User, message: string) {
    const userColor = getColorHSL(user.username)
    const newMessage = document.createElement('div')
    newMessage.innerHTML = `
    <div class="message-line">
      <span class="username" style="color:${userColor}">${user.username}</span>
      <span class="in-between">: </span>
      <span class="message">${message}</span>
    </div>`
    this.messagesElement.insertBefore(newMessage, this.anchorElement)
  }

  //prettier-ignore
  static onUserAdded = (messagesElement: HTMLElement, anchorElement: HTMLElement) => (user: User) => {
    const userColor = getColorHSL(user.username)
    const newMessage = document.createElement('div')
    newMessage.innerHTML = `
    <div class="message-line">
      <span class="notification-text">user</span>
      <span class="username" style="color:${userColor}">${user.username}</span>
      <span class="notification-text">joined the chat.</span>
    </div>`
    messagesElement.insertBefore(newMessage, anchorElement)
  }

  onUserRemoved(user: User) {
    const userColor = getColorHSL(user.username)
    const newMessage = document.createElement('div')
    newMessage.innerHTML = `
    <div class="message-line">
      <span class="notification-text">user</span>
      <span class="username" style="color:${userColor}">${user.username}</span>
      <span class="notification-text">left the chat.</span>
    </div>`
    this.messagesElement.insertBefore(newMessage, this.anchorElement)
  }
}

window.onload = async () => {
  const client = createRPCClient<Api>('/rpc')
  const { realtime, user } = await getUsername(client)

  const chatDom = new Chat(client, realtime, user)
}
