# @delight-rpc/websocket
## Install
```sh
npm install --save @delight-rpc/websocket
# or
yarn add @delight-rpc/websocket
```

## API
### createClient
```ts
function createClient<IAPI extends object>(
  socket: WebSocket
, options?: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    expectedVersion?: `${number}.${number}.${number}`
    channel?: string
    timeout?: number
  }
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void]
```

### createBatchClient
```ts
function createBatchClient(
  socket: WebSocket
, options?: {
    expectedVersion?: `${number}.${number}.${number}`
    channel?: string
    timeout?: number
  }
): [client: DelightRPC.BatchClient, close: () => void]
```

### createServer
```ts
function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, socket: WebSocket
, options?: {
    loggerLevel?: Level = Level.None
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    channel?: string
    ownPropsOnly?: boolean
  }
): () => void
```
