import * as DelightRPC from 'delight-rpc'
import { Deferred } from 'extra-promise'
import { CustomError } from '@blackglory/errors'
import { WebSocket, MessageEvent } from 'ws'
import { getResult } from 'return-style'
import { isntUndefined, isString } from '@blackglory/prelude'
import { IResponse, IError, IBatchResponse } from '@delight-rpc/protocol'
import { withAbortSignal, raceAbortSignals, timeoutSignal } from 'extra-abort'

export function createClient<IAPI extends object>(
  socket: WebSocket
, { parameterValidators, expectedVersion, channel, timeout }: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    expectedVersion?: string
    channel?: string
    timeout?: number
  } = {}
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void] {
  const pendings: Record<string, Deferred<IResponse<any>> | undefined> = {}

  socket.addEventListener('message', handler)

  const client = DelightRPC.createClient<IAPI>(
    async function send(request, signal) {
      const res = new Deferred<IResponse<any>>()
      pendings[request.id] = res
      try {
        socket.send(JSON.stringify(request))

        const mergedSignal = raceAbortSignals([
          isntUndefined(timeout) && timeoutSignal(timeout)
        , signal
        ])
        mergedSignal.addEventListener('abort', () => {
          const abort = DelightRPC.createAbort(request.id, channel)
          socket.send(JSON.stringify(abort))
        })

        return await withAbortSignal(mergedSignal, () => res)
      } finally {
        delete pendings[request.id]
      }
    }
  , {
      parameterValidators
    , expectedVersion
    , channel
    }
  )

  return [client, close]

  function close() {
    socket.removeEventListener('message', handler)

    for (const [key, deferred] of Object.entries(pendings)) {
      deferred!.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(event: MessageEvent): void {
    const data = event.data
    if (isString(data)) {
      const res = getResult(() => JSON.parse(data))
      if (DelightRPC.isResult(res) || DelightRPC.isError(res)) {
        pendings[res.id]?.resolve(res)
      }
    }
  }
}

export function createBatchClient(
  socket: WebSocket
, { expectedVersion, channel, timeout }: {
    expectedVersion?: string
    channel?: string
    timeout?: number
  } = {}
): [client: DelightRPC.BatchClient, close: () => void] {
  const pendings: Record<
    string
  , | Deferred<IError | IBatchResponse<unknown>>
    | undefined
  > = {}

  socket.addEventListener('message', handler)

  const client = new DelightRPC.BatchClient(
    async function send(request) {
      const res = new Deferred<
      | IError
      | IBatchResponse<unknown>
      >()
      pendings[request.id] = res
      try {
        socket.send(JSON.stringify(request))

        const mergedSignal = raceAbortSignals([
          isntUndefined(timeout) && timeoutSignal(timeout)
        ])
        mergedSignal.addEventListener('abort', () => {
          const abort = DelightRPC.createAbort(request.id, channel)
          socket.send(JSON.stringify(abort))
        })

        return await withAbortSignal(mergedSignal, () => res)
      } finally {
        delete pendings[request.id]
      }
    }
  , {
      expectedVersion
    , channel
    }
  )

  return [client, close]

  function close() {
    socket.removeEventListener('message', handler)

    for (const [key, deferred] of Object.entries(pendings)) {
      deferred!.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(event: MessageEvent): void {
    const data = event.data
    if (isString(data)) {
      const res = getResult(() => JSON.parse(data))
      if (DelightRPC.isError(res) || DelightRPC.isBatchResponse(res)) {
        pendings[res.id]?.resolve(res)
      }
    }
  }
}

export class ClientClosed extends CustomError {}
