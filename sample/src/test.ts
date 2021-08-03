import './server/app'
import { client } from './client/index'

;(async () => {
  const data = await client.health()
  console.log('health:', data)
  const tags = await client.tag.list()
  console.log('tag.list:', tags)
  await client.tag.delete(tags[0].id)
  console.log('tag.delete', tags[0].id)
  const updated_tags = await client.tag.list()
  console.log('tag.list', updated_tags)
})()
