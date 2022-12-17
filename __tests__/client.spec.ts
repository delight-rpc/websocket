import { createClient } from '@src/client'
import WebSocket, { Server, WebSocketServer } from 'ws'
import { createServer } from '@src/server'
import { waitForEventEmitter } from '@blackglory/wait-for'
import { getErrorPromise } from 'return-style'

interface IAPI {
  echo(message: string): string
  error(message: string): never
}

let server: WebSocketServer
beforeEach(() => {
  server = new Server({ port: 8080 })
  server.on('connection', socket => {
    const cancelServer = createServer<IAPI>({
      echo(message) {
        return message
      }
    , error(message) {
        throw new Error(message)
      }
    }, socket)
  })
})
afterEach(() => {
  server.close()
})

describe('createClient', () => {
  test('echo', async () => {
    const wsClient = new WebSocket('ws://localhost:8080')
    await waitForEventEmitter(wsClient, 'open')

    try {
      const [client] = createClient<IAPI>(wsClient)
      const result = await client.echo('hello')

      expect(result).toBe('hello')
    } finally {
      wsClient.close()
    }
  })

  test('error', async () => {
    const wsClient = new WebSocket('ws://localhost:8080')
    await waitForEventEmitter(wsClient, 'open')

    try {
      const [client] = createClient<IAPI>(wsClient)
      const err = await getErrorPromise(client.error('hello'))

      expect(err).toBeInstanceOf(Error)
      expect(err!.message).toMatch('hello')
    } finally {
      wsClient.close()
    }
  })
})
