import { path, assert, FakeTime, serve, file_server } from './deps.ts'
import { FetchMock, FetchMockNotFound } from './fetch_mock.ts'

const __dirname = path.dirname(path.dirname(path.fromFileUrl(import.meta.url)))

async function assert_fetch_mock_not_found(grob_fn: () => Promise<any>) {
  await assert.assertRejects(grob_fn, FetchMockNotFound)
}

async function assert_file_contents(filepath: string, expected_content: string) {
  const file_contents = await Deno.readTextFile(filepath)
  assert.assertEquals(file_contents, expected_content)
}


interface Asserts {
  fetch: FetchMock['expector']
  fetch_mock_not_found: typeof assert_fetch_mock_not_found
  rejects: typeof assert.assertRejects
  equals: typeof assert.assertEquals
  not_equals: typeof assert.assertNotEquals
  file_contents: typeof assert_file_contents
}

interface TestContext extends Deno.TestContext {
  // artifacts_folder: string
  // fixtures_folder: string
  assert: Asserts
  fake_time: FakeTimeTool
  fake_fetch: FetchMock
}

type TestFunction = (t: TestContext) => Promise<void>

type TestOptions = Pick<Deno.TestDefinition, 'only' | 'ignore'>

class FakeTimeTool {
  public time: FakeTime | undefined
  public setup() {
    this.time = new FakeTime()
  }

  tick(millis: number) {
    this.time?.tick(millis)
  }

  restore() {
    this.time?.restore()
  }
}

function test(test_name: string, fn: TestFunction, options?: TestOptions) {
  // const artifacts_folder = path.join(__dirname, 'artifacts', test_name)
  // const fixtures_folder = path.join(__dirname, 'fixtures')
  const fetch_mock = new FetchMock()
  const fake_time = new FakeTimeTool()

  async function setup() {
    // await Deno.remove(artifacts_folder, { recursive: true }).catch(e => {
    //   if (e instanceof Deno.errors.NotFound) {}
    //   else throw e
    // })
    // await Deno.mkdir(artifacts_folder, { recursive: true })
    fetch_mock.enable()
  }
  function cleanup() {
    fake_time.restore()
    fetch_mock.clean()
  }

  const test_function = async (deno_test_context: Deno.TestContext) => {
    const test_context: TestContext = {
      ...deno_test_context,
      // artifacts_folder,
      // fixtures_folder,
      fake_time,
      fake_fetch: fetch_mock,
      assert: {
        fetch: fetch_mock.expector,
        fetch_mock_not_found: assert_fetch_mock_not_found,
        rejects: assert.assertRejects,
        equals: assert.assertEquals,
        not_equals: assert.assertNotEquals,
        file_contents: assert_file_contents,
      }
    }

    let errors_occurred_in_test_function = false
    await setup()
    try {
      await fn(test_context)
    } catch (e) {
      errors_occurred_in_test_function = true
      throw e
    } finally {
      try {
        cleanup()
      } catch (e) {
        if (errors_occurred_in_test_function) {
          fetch_mock.clean(true)
        }
        else throw e

      }
    }
  }

  Deno.test({
    name: test_name,
    fn: test_function,
    ...options,
  })
}

test.only = (test_name: string, fn: TestFunction) => test(test_name, fn, { only: true })
test.skip = (test_name: string, fn: TestFunction) => test(test_name, fn, { ignore: true })

export { test, FetchMockNotFound }

