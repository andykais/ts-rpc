import {oak} from './src/deps.server.ts'

const adapters = {
  oak(context: oak.Context) {
  }
}

export function create_rpc_server() {
  return {adapters}
}
