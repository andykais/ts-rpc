import { create_rpc_client } from 'ts-rpc/client'
import fetch from 'cross-fetch'
import type { GroveApi } from '../spec'

const PORT = process.env.PORT || 4000
// note in the browser the connection string could be as simple as '/rpc'
export const client = create_rpc_client<GroveApi>(`http://localhost:${PORT}/rpc`, { fetch })
