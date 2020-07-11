import * as Rx from 'rxjs'
import { Json, EventStream, ValidateApiDefinition } from '../src'

// inputs
type ScraperOptions = any // TODO import from scrape-pages

type TagQuery = {
  boolean: 'AND' | 'OR' | 'NAND'
  tags: string[]
  leafs: TagQuery
}

// models
type Tag = {
  id: string
  name: string
  categoryId: string
}

type TagCategory = {
  id: number
  category: string
  color: string
}

type Image = {
  id: number
  width: number
  height: number
  thumbnail: string
  imageUrl: string
}

type ImageList = Pick<Image, 'id' | 'thumbnail'>[]

type Scraper = {
  id: number
  name: string
  description: string
  location: number
}

type ScraperHistory = {
  id: number
  scraperId: number
  startedOn: Date
  inputs: Json
}
type ScraperEvents = {
  initialized: []
  progress: [{ progress: number; label: string; id: number }]
  queued: [{ progress: number; label: string; id: number }]
  saved: [{ label: string; id: number }]
  done: []
}

type Settings = {
  keyboardShortcuts: {}
}

type ScraperProgress = {
  scraperId: number
  numQueued: number
  numInFlight: number
  numCompleted: number
}

type Api = {
  // tag: {
  //   search: (tagStr: string) => Tag[]
  //   setAsAlias: (originTagId: Tag['id'], aliasTagId: Tag['id']) => Tag[]
  //   getImageTags: (imageId: Image['id']) => string[]
  // }

  // tagCategories: {
  //   list: () => TagCategory[]
  // }

  image: {
    //   list: (filters: { scraperId?: Scraper['id']; tagQuery: TagQuery }, cursor?: number) => ImageList
    getImageAndTags: (imageId: Image['id']) => { image: Image; tags: Tag[] }
    //   setTags: (imageId: Image['id'], tagIds: Tag['id'][]) => Tag[]
    // events: {
    //   progress: { progress: number; id: number }
    //   complete: { id: number }
    // }

    // emit(event: 'progress', progress: number id: number)
    // emit(event: 'complete', id: number)
  }

  // scraper: {
  //   // prettier-ignore
  //   update: (scraperId: number, dbInfo: Scraper, instructions: string, defaultOptions: ScraperOptions) => Scraper
  //   delete: (scraperId: number) => void
  //   list: () => Scraper[]
  // }

  download: {
    // prettier-ignore
    start(scraperId: number, inputs: object, options: ScraperOptions): { downloadId: ScraperHistory['id'] }
    downloadEvents(downloadId: number): EventStream<ScraperEvents>
    //   stop: (downloadId: number) => void
    //   updateActiveScraperOptions: (downloadId: ScraperHistory['id'], options: ScraperOptions) => void
    //   // at runtime server detects if resonse is observable. If so, set up server sent events
    //   // then, at runtime client detects if response is { sseId: number } and sets up observable
    //   // I mean, we could just write this using native SSE, this is just extra gravy
    //   watchProgress: (downloadId: ScraperHistory['id']) => Rx.Observable<ScraperProgress>

    //   listActive: () => ScraperHistory[]
    //   listAll: () => ScraperHistory[]
  }

  // settings: {
  //   get: () => Settings
  //   set: (settings: Settings) => Settings
  // }
}

type X = ValidateApiDefinition<Api>

export { Api }
