import { createClient } from '@src/client.js'
import WebSocket, { WebSocketServer } from 'ws'
import { createServer } from '@src/server.js'
import { waitForEventEmitter } from '@blackglory/wait-for'
import { getErrorPromise } from 'return-style'
import { Level } from 'extra-logger'
import { promisify } from 'extra-promise'

interface IAPI {
  eval(code: string): Promise<unknown>
}

const api = {
  echo(message: string): string {
    return message
  }
, error(message: string): never {
    throw new Error(message)
  }
}

let server: WebSocketServer
beforeEach(() => {
  server = new WebSocketServer({ port: 8080 })
  server.on('connection', socket => {
    const [client] = createClient(socket)
    const cancelServer = createServer<IAPI>({
      async eval(code) {
        return await eval(code)
      }
    }, socket)
  })
})
afterEach(async () => {
  await promisify(server.close.bind(server))()
})

describe('createServer', () => {
  test('echo', async () => {
    const wsClient = new WebSocket('ws://localhost:8080')
    await waitForEventEmitter(wsClient, 'open')

    const cancelServer = createServer(api, wsClient, {
      loggerLevel: Level.None
    })
    const [client, close] = createClient<IAPI>(wsClient)
    try {
      const result = await client.eval('client.echo("hello")')
      expect(result).toEqual('hello')
    } finally {
      wsClient.close()
      cancelServer()
    }
  })

  test('error', async () => {
    const wsClient = new WebSocket('ws://localhost:8080')
    await waitForEventEmitter(wsClient, 'open')

    const cancelServer = createServer(api, wsClient, {
      loggerLevel: Level.None
    })
    const [client, close] = createClient<IAPI>(wsClient)
    try {
      const err = await getErrorPromise(client.eval('client.error("hello")'))
      expect(err).toBeInstanceOf(Error)
      expect(err!.message).toMatch('hello')
    } finally {
      wsClient.close()
      cancelServer()
    }
  })
})
