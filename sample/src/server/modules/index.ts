import type { CreateServerApi } from 'ts-rpc/server'
import type { Tag, GroveApi } from '../../spec'


class TagApi implements CreateServerApi<GroveApi['tag']> {
    async delete(id: Tag['id']) { }
}

class GroveApiServer implements CreateServerApi<GroveApi> {
  health = async () => ({ time: new Date().toString() })
  tag = new TagApi()
}

export { GroveApiServer }
