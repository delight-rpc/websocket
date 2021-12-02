import { createClient } from '@src/client'
import WebSocket, { Server, WebSocketServer } from 'ws'
import '@blackglory/jest-matchers'
import { createServer } from '@src/server'
import { waitForEventEmitter } from '@blackglory/wait-for'

interface IAPI {
  echo(message: string): string
}

let server: WebSocketServer
beforeEach(() => {
  server = new Server({ port: 8080 })
  server.on('connection', socket => {
    const cancelServer = createServer<IAPI>({
      echo(message) {
        return message
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

    const [client] = createClient<IAPI>(wsClient)
    const result = await client.echo('hello')

    expect(result).toEqual('hello')
  })
})
