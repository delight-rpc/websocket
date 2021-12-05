import { createClient } from '@src/client'
import WebSocket, { Server, WebSocketServer } from 'ws'
import '@blackglory/jest-matchers'
import { createServer } from '@src/server'
import { waitForEventEmitter } from '@blackglory/wait-for'
import { getErrorPromise } from 'return-style'

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
  server = new Server({ port: 8080 })
  server.on('connection', socket => {
    const [client] = createClient(socket)
    const cancelServer = createServer<IAPI>({
      async eval(code) {
        return await eval(code)
      }
    }, socket)
  })
})
afterEach(() => {
  server.close()
})

describe('createServer', () => {
  test('echo', async () => {
    const wsClient = new WebSocket('ws://localhost:8080')
    await waitForEventEmitter(wsClient, 'open')

    const cancelServer = createServer(api, wsClient)
    const [client, close] = createClient<IAPI>(wsClient)
    try {
      const result = await client.eval('client.echo("hello")')
      expect(result).toEqual('hello')
    } finally {
      cancelServer()
    }
  })

  test('error', async () => {
    const wsClient = new WebSocket('ws://localhost:8080')
    await waitForEventEmitter(wsClient, 'open')

    const cancelServer = createServer(api, wsClient)
    const [client, close] = createClient<IAPI>(wsClient)
    try {
      const err = await getErrorPromise(client.eval('client.error("hello")'))
      expect(err).toBeInstanceOf(Error)
      expect(err!.message).toMatch('Error: hello')
    } finally {
      cancelServer()
    }
  })
})
