import { createRPCClient } from 'ts-rpc-proxy/client/index'
import { Api } from './definition'

const client = createRPCClient<Api>('/rpc')

;(async () => {
  client.image.getImageAndTags(1).then(r => console.log(r.image.id))

  const { downloadId } = await client.download.start(1, {}, {})

  // client is reactionary
  // WERE GOING WITH THIS DESIGN.
  // - its better to do actionable things
  // - error handling is easier with an await
  //   - In the other design, what happens if the server action craps out on a raw event?,
  //   - E.g. start a scraper and return a stream, if the scraper fails, who gets the error?
  // - cleaner to have a single client
  // - should be able to emit events without a listener. It should be a set and forget type system
  // const sseStream = await client.download.downloadEvents(downloadId)
  // sseStream.on('progress', ({ progress, label, id }) => console.log(id, label, ':', progress))

  // client explicitly asks for event stream
  // const events = createEventsRPC<Api>('/rpc')
  // await client.download.start(downloadId)
  // events.download.getActiveScaperStream(downloadId)
  //   .on('progress', console.log)
  //   .on('queued', console.log)
  //   .on('saved', console.log)
  //   .on('done', console.log)
  //
  // one more option:
  const sseStream = new client.download.downloadEvents(downloadId)
  sseStream.on('progress', ({ progress, label, id }) => console.log(id, label, ':', progress))
  sseStream.on('done', () => console.log('done.'))

  // this ones good! Super similar to EventSource api
  // all the proxy needs to do is { construct: () => { // EventSource }, apply: () => { // fetch } }
})()
