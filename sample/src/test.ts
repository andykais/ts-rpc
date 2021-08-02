import './server/app'
import { client } from './client/index'

;(async () => {
  const data:null = await client.health
  // const data = await client.health.time()
  // console.log({ data })
})()
