import * as DelightRPC from 'delight-rpc'
import { WebSocket, MessageEvent } from 'ws'
import { getResult } from 'return-style'
import { Logger, TerminalTransport, Level } from 'extra-logger'
import { isntNull, isString } from '@blackglory/prelude'
import { AbortController } from 'extra-abort'

export { Level } from 'extra-logger'

export function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, socket: WebSocket
, { loggerLevel = Level.None, parameterValidators, version, channel, ownPropsOnly }: {
    loggerLevel?: Level
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    channel?: string | RegExp | typeof DelightRPC.AnyChannel
    ownPropsOnly?: boolean
  } = {}
): () => void {
  const logger = new Logger({
    level: loggerLevel
  , transport: new TerminalTransport()
  })
  const idToController: Map<string, AbortController> = new Map()

  socket.addEventListener('message', handler)
  socket.addEventListener('close', () => {
    for (const controller of idToController.values()) {
      controller.abort()
    }

    idToController.clear()
  })
  return () => socket.removeEventListener('message', handler)

  async function handler(event: MessageEvent): Promise<void> {
    const data = event.data
    if (isString(data)) {
      const payload = getResult(() => JSON.parse(data))
      if (DelightRPC.isRequest(payload) || DelightRPC.isBatchRequest(payload)) {
        const controller = new AbortController()
        idToController.set(payload.id, controller)

        try {
          const response = await logger.infoTime(
            () => {
              if (DelightRPC.isRequest(payload)) {
                return payload.method.join('.')
              } else {
                return payload.requests.map(x => x.method.join('.')).join(', ')
              }
            }
          , () => DelightRPC.createResponse(
              api
            , payload
            , {
                parameterValidators
              , version
              , channel
              , ownPropsOnly
              , signal: controller.signal
              }
            )
          )

          if (isntNull(response)) {
            socket.send(JSON.stringify(response))
          }
        } finally {
          idToController.delete(payload.id)
        }
      } else if (DelightRPC.isAbort(payload)) {
        if (DelightRPC.matchChannel(payload, channel)) {
          idToController.get(payload.id)?.abort()
          idToController.delete(payload.id)
        }
      }
    }
  }
}
