import * as fs from 'fs'
import express from 'express'
import { createRPCServer, GenerateServerApi } from 'ts-rpc/server'
import { Api } from '../definition'
import chat from './modules/chat'

export type ServerApi = GenerateServerApi<Api>

const app = express()
// prettier-ignore
app.use(express.static('./build/client'))
app.use('/rpc', createRPCServer<Api>({ chat }))
// app.get('/', (req,res) => res.send(fs.readFileSync('./index.html').toString()))
const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`))
