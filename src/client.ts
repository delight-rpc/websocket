import * as DelightRPC from 'delight-rpc'
import { Deferred } from 'extra-promise'
import { CustomError } from '@blackglory/errors'
import { WebSocket, MessageEvent } from 'ws'
import { getResult } from 'return-style'
import { isString } from '@blackglory/types'

export function createClient<IAPI extends object>(
  socket: WebSocket
, parameterValidators?: DelightRPC.ParameterValidators<IAPI>
, expectedVersion?: `${number}.${number}.${number}`
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void] {
  const pendings: { [id: string]: Deferred<DelightRPC.IResponse<any>> } = {}

  socket.addEventListener('message', handler)

  const client = DelightRPC.createClient<IAPI>(
    async function send(request) {
      const res = new Deferred<DelightRPC.IResponse<any>>()
      pendings[request.id] = res
      try {
        socket.send(JSON.stringify(request))
        return await res
      } finally {
        delete pendings[request.id]
      }
    }
  , parameterValidators
  , expectedVersion
  )

  return [client, close]

  function close() {
    socket.removeEventListener('message', handler)

    for (const [key, deferred] of Object.entries(pendings)) {
      deferred.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(event: MessageEvent): void {
    const data = event.data
    if (isString(data)) {
      const res = getResult(() => JSON.parse(data))
      if (DelightRPC.isResult(res) || DelightRPC.isError(res)) {
        pendings[res.id].resolve(res)
      }
    }
  }
}

export function createBatchClient(
  socket: WebSocket
, expectedVersion?: `${number}.${number}.${number}`
): [client: DelightRPC.BatchClient, close: () => void] {
  const pendings: {
    [id: string]: Deferred<
    | DelightRPC.IError
    | DelightRPC.IBatchResponse<unknown>
    >
  } = {}

  socket.addEventListener('message', handler)

  const client = new DelightRPC.BatchClient(
    async function send(request) {
      const res = new Deferred<
      | DelightRPC.IError
      | DelightRPC.IBatchResponse<unknown>
      >()
      pendings[request.id] = res
      try {
        socket.send(JSON.stringify(request))
        return await res
      } finally {
        delete pendings[request.id]
      }
    }
  , expectedVersion
  )

  return [client, close]

  function close() {
    socket.removeEventListener('message', handler)

    for (const [key, deferred] of Object.entries(pendings)) {
      deferred.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(event: MessageEvent): void {
    const data = event.data
    if (isString(data)) {
      const res = getResult(() => JSON.parse(data))
      if (DelightRPC.isError(res) || DelightRPC.isBatchResponse(res)) {
        pendings[res.id].resolve(res)
      }
    }
  }
}

export class ClientClosed extends CustomError {}
