import { createRPCServer, GenerateServerApi } from 'ts-rpc-proxy/server'
import { Api } from './definition'
import express from 'express'

type ServerApi = GenerateServerApi<Api>

// image module
type ImageApi = ServerApi['image']
const getImageAndTags: ImageApi['getImageAndTags'] = async imageId => {
  return { image: { id: 1, width: 1, height: 1, thumbnail: '', imageUrl: '' }, tags: [] }
}
const image = { getImageAndTags }

// download module
type DownloadApi = ServerApi['download']
const start: DownloadApi['start'] = async (scraperId, inputs, options) => {
  return { downloadId: 1 }
}
const downloadEvents: DownloadApi['downloadEvents'] = async function (downloadId) {
  this.sse.emit('progress', { progress: 1, id: 1, label: 'something' })
  this.sse.emit('done')
}
const download = { start, downloadEvents }

// const tag = {}
// const tagCategories = {}
// const scraper = {}
// const settings = {}
// const api = { tag, tagCategories, image, scraper, download, settings }
const api = { image, download }
const app = express()
// stretch goals:
// const rpcEmitter = createEventsRPC<Api>()
// const globalEmitter = new rpcEmitter.downloads.downloadEvents(downloadId)
// globalEmitter.emit('done')
// app.use('/rpc', createRPCServer<Api>(api, { rpcEmitter }))
// app.use('/rpc', server)
app.use('/rpc', createRPCServer<Api>(api))
const PORT = 4000
app.listen(PORT, () => console.log(`server listening on ${PORT}`))
