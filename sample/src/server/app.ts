import express from 'express'
import { create_rpc_server, CreateServerApi } from 'ts-rpc/server'
import { GroveApiServer } from './modules/index'
import type { GroveApi } from '../spec'

export type GroveServerApi = CreateServerApi<GroveApi>

const app = express()
// app.use(express.static('./build/client'))
app.put('/rpc', create_rpc_server<GroveApi>(new GroveApiServer()))
const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`))
