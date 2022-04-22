import * as DelightRPC from 'delight-rpc'
import { WebSocket, MessageEvent } from 'ws'
import { getResult } from 'return-style'
import { isString } from '@blackglory/types'
import { Logger, TerminalTransport, Level } from 'extra-logger'

export { Level } from 'extra-logger'

export function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, socket: WebSocket
, options: {
    loggerLevel: Level
  , parameterValidators?: DelightRPC.ParameterValidators<IAPI>
  , version?: `${number}.${number}.${number}`
  }
): () => void {
  const logger = new Logger({
    level: options.loggerLevel
  , transport: new TerminalTransport()
  })

  socket.addEventListener('message', handler)
  return () => socket.removeEventListener('message', handler)

  async function handler(event: MessageEvent): Promise<void> {
    const data = event.data
    if (isString(data)) {
      const req = getResult(() => JSON.parse(data))
      if (DelightRPC.isRequest(req) || DelightRPC.isBatchRequest(req)) {
        const result = await logger.infoTime(
          () => {
            if (DelightRPC.isRequest(req)) {
              return req.method.join('.')
            } else {
              return req.requests.map(x => x.method.join('.')).join(', ')
            }
          }
        , () => DelightRPC.createResponse(
            api
          , req
          , options.parameterValidators
          , options.version
          )
        )

        socket.send(JSON.stringify(result))
      }
    }
  }
}
