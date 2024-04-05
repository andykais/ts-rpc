import { mock } from './deps.ts'


type PromiseController<T> = ReturnType<typeof Promise.withResolvers<T>>

interface MockFetchInstructions {
  request: {
    method?: string
    url?: string
    body?: any
    headers?: Record<string, string>
  },
  response: {
    status_code?: number
    body?: any
    headers?: Record<string, string>
  } | Promise<Response>
}

interface LiveExpectation {
  status: 'UNFULFILLED' | 'RESPONDING' | 'FULFILLED'
  request: Promise<Request>
  remove: () => void
}

interface MockExpectation {
  promise_controller: PromiseController<Request>
  instructions: MockFetchInstructions
  live_expectation: LiveExpectation
}


class FetchMockNotFound extends Error {
  name = 'FetchMockNotFound'
}


class FetchMock {
  private disabled: boolean
  private fetch_stub: mock.Stub<Window & typeof globalThis, Parameters<typeof fetch>> | undefined
  private expectations: MockExpectation[]
  public constructor() {
    this.disabled = false
    this.expectations = []
  }

  public enable() {
    this.fetch_stub = mock.stub(window, 'fetch', this.responder)
    this.disabled = false
  }

  public disable() {
    this.clean()
    this.disabled = true
  }

  public clean(force = false) {
    if (this.disabled && !force) return

    if (!force) {
      if (this.fetch_stub === undefined) throw new Error('FetchMock.start() must be called before calling FetchMock.clean()')
      if (this.expectations.length > 0) {
        throw new Error(`Fetch contains ${this.expectations.length} remaining expectations that went unfetched`)
      }
    }
    this.expectations = []
    this.fetch_stub!.restore()
  }

  public expector = (instructions: MockFetchInstructions): LiveExpectation => {
    const promise_controller = Promise.withResolvers<Request>()
    // push to the front of the array, so that when we respond, we look at the newest mocks first
    const live_expectation: LiveExpectation = {
      status: 'UNFULFILLED',
      request: promise_controller.promise,
      remove: () => {
        const index = this.expectations.findIndex(e => e.live_expectation === live_expectation)
        if (index === -1) throw new Error('fetch expectation not found (it has perhaps already been fulfilled)')
        this.expectations.splice(index, 1)
      }
    }
    this.expectations.push({
      promise_controller,
      instructions,
      live_expectation,
    })
    return live_expectation
  }

  private responder = async (input: string | Request | URL, init?: RequestInit) => {

    let url = input.toString()
    let method = 'GET'
    let headers = init?.headers
    if (input instanceof Request) {
      url = input.url
      method = input.method ?? method
      headers ??= input.headers
    }
    if (init?.method) {
      method = init.method
    }

    const input_request = new Request(url, { method, headers, ...init })

    const identifier = `${method} ${url}`
    if (this.expectations.length === 0) {
      throw new FetchMockNotFound(`Zero expectations set up, request for ${identifier} was rejected`)
    }


    for (const [index, expectation] of this.expectations.entries()) {
      const { request, response } = expectation.instructions
      if (request.url && request.url !== url) {
        continue
      }
      if (request.method && request.method !== method) {
        continue
      }
      if (request.headers) {
        if (headers === undefined) continue
        for (const [key, val] of Object.entries(request.headers)) {
          const input_header = Object.entries(headers).find(([k, v]) => k === key && v === val)
          if (input_header === undefined) continue
        }
      }
      if (request.body) {
        throw new Error('unimplemented')
      }

      this.expectations.splice(index, 1)

      if (response instanceof Promise) {
        expectation.live_expectation.status = 'RESPONDING'
        const result = await response
        expectation.live_expectation.status = 'FULFILLED'
        return result
        expectation.promise_controller.resolve(input_request)
      } else {
        const fetch_response = new Response(response.body, { headers: response.headers, status: response.status_code })
        expectation.live_expectation.status = 'FULFILLED'
        expectation.promise_controller.resolve(input_request)
        return fetch_response
      }
    }
    // const serialized_expectations = this.expectations.map(e => `  ${e.instructions.request.method} ${e.instructions.request.url}${e.instructions.request.body ? ' body: "..."' : ''}${headers ? ` headers: ${headers}` : ''}`).join('\n')
    const serialized_expectations = this.expectations.map(e => '  ' + JSON.stringify(e.instructions.request)).join('\n')
    throw new FetchMockNotFound(`No expectation found for ${identifier} out of ${this.expectations.length} set up expectations:\n${serialized_expectations}`)
  }
}

export { FetchMock, FetchMockNotFound }
