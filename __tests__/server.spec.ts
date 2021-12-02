import { createClient } from '@src/client'
import WebSocket, { Server, WebSocketServer } from 'ws'
import '@blackglory/jest-matchers'
import { createServer } from '@src/server'
import { waitForEventEmitter } from '@blackglory/wait-for'

interface IAPI {
  eval(code: string): Promise<unknown>
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
  it('echo', async () => {
    const api = {
      echo(message: string): string {
        return message
      }
    }
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
})
