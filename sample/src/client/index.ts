import { create_rpc_client } from 'ts-rpc/client'
import fetch from 'cross-fetch'

export const client = create_rpc_client('/rpc', { fetch })
