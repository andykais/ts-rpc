interface Model {
  id: number
}
export interface Tag extends Model {
  group: string
  name: string
  description: string
}
export interface Media extends Model {
  title: string
  description: string
  media_url: string
  media_type: 'video' | 'image'
}
export interface Thumbnail extends Model {
  thumbnail_url: string
  media_id: Media['id']
}
export interface PaginatedList<Item> {
  total: number
  total_pages: number
  current_page: number
  cursor: string
  results: Item[]
}
export type GroveApi = {
  tag: {
    // create: (group: string, name: string, description: string) => Tag
    delete: (id: Tag['id']) => void
  //   search: (group: string, name: string) => Tag[]
  //   get_media_tags: (media_id: Media['id']) => Tag[]
  }
  // media: {
  //   get: (media_id: Media['id']) => Media
  //   thumbnail: {
  //     search: (tag_ids: Tag['id'][]) => PaginatedList<Thumbnail>
  //   }
  // }
  health: () => { time: string }
}
