import type { CreateServerApi } from 'ts-rpc/server'
import type { Tag, GroveApi } from '../../spec'


class TagApi implements CreateServerApi<GroveApi['tag']> {
  private tags: Tag[]  = [
    { id: 1, group: '', name: 'landscape', description: '' },
    { id: 2, group: 'file', name: 'animated', description: '' },
  ]

  public async list() {
    return this.tags
  }

  public async delete(id: Tag['id']) {
    const index = this.tags.findIndex(t => t.id === id)
    if (index === undefined) throw new Error(`Tag ${index} does not exist`)
    this.tags.splice(index, 1)
  }
}

class GroveApiServer implements CreateServerApi<GroveApi> {
  public health = async () => ({ time: new Date().toString() })
  public tag = new TagApi()
}

export { GroveApiServer }
