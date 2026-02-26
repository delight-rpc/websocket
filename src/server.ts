import * as DelightRPC from 'delight-rpc'
import { WebSocket, MessageEvent } from 'ws'
import { getResult } from 'return-style'
import { Logger, TerminalTransport, Level } from 'extra-logger'
import { isntNull, isString } from '@blackglory/prelude'
import { AbortController } from 'extra-abort'
import { HashMap } from '@blackglory/structures'
import { SyncDestructor } from 'extra-defer'

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
  const destructor = new SyncDestructor()

  const logger = new Logger({
    level: loggerLevel
  , transport: new TerminalTransport()
  })

  const channelIdToController: HashMap<
    {
      channel?: string
    , id: string
    }
  , AbortController
  > = new HashMap(({ channel, id }) => JSON.stringify([channel, id]))
  destructor.defer(abortAllPendings)

  socket.addEventListener('message', receive)
  destructor.defer(() => socket.removeEventListener('message', receive))

  socket.addEventListener('close', close)
  destructor.defer(() => socket.removeEventListener('close', close))

  return close

  function close(): void {
    destructor.execute()
  }

  function abortAllPendings(): void {
    for (const controller of channelIdToController.values()) {
      controller.abort()
    }

    channelIdToController.clear()
  }

  async function receive(event: MessageEvent): Promise<void> {
    const data = event.data
    if (isString(data)) {
      const message = getResult(() => JSON.parse(data))
      if (DelightRPC.isRequest(message) || DelightRPC.isBatchRequest(message)) {
        const destructor = new SyncDestructor()

        const controller = new AbortController()
        channelIdToController.set(message, controller)
        destructor.defer(() => channelIdToController.delete(message))

        try {
          const response = await logger.infoTime(
            () => {
              if (DelightRPC.isRequest(message)) {
                return message.method.join('.')
              } else {
                return message.requests.map(x => x.method.join('.')).join(', ')
              }
            }
          , () => DelightRPC.createResponse(
              api
            , message
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
          destructor.execute()
        }
      } else if (DelightRPC.isAbort(message)) {
        if (DelightRPC.matchChannel(message, channel)) {
          channelIdToController.get(message)?.abort()
          channelIdToController.delete(message)
        }
      }
    }
  }
}
