import express from 'express'
import { createRPCServer, CreateServerApi } from 'ts-rpc/server'
import { GroveApi } from '../spec'
// import chat from './modules/chat'

export type GroveServerApi = CreateServerApi<GroveApi>

const app = express()
// app.use(express.static('./build/client'))
// app.use('/rpc', createRPCServer<Api>({ chat }))
const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`))
