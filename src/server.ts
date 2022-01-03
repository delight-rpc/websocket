import * as DelightRPC from 'delight-rpc'
import { WebSocket, MessageEvent } from 'ws'
import { getResult } from 'return-style'
import { isString } from '@blackglory/types'

export function createServer<IAPI extends object>(
  api: IAPI
, socket: WebSocket
, parameterValidators?: DelightRPC.ParameterValidators<IAPI>
): () => void {
  socket.addEventListener('message', handler)
  return () => socket.removeEventListener('message', handler)

  async function handler(event: MessageEvent): Promise<void> {
    const data = event.data
    if (isString(data)) {
      const req = getResult(() => JSON.parse(data))
      if (DelightRPC.isRequest(req)) {
        const result = await DelightRPC.createResponse(api, req, parameterValidators)

        socket.send(JSON.stringify(result))
      }
    }
  }
}
