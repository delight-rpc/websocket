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
, parameterValidators?: DelightRPC.ParameterValidators<IAPI>
, expectedVersion?: `${number}.${number}.${number}`
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void]
```

### createBatchClient
```ts
function createBatchClient(
  socket: WebSocket
, expectedVersion?: `${number}.${number}.${number}`
): [client: DelightRPC.BatchClient, close: () => void]
```

### createServer
```ts
function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, socket: WebSocket
, options: {
    loggerLevel: Level
  , parameterValidators?: DelightRPC.ParameterValidators<IAPI>
  , version?: `${number}.${number}.${number}`
  }
): () => void
```
