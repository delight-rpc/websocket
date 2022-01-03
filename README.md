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
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void]
```

### createServer
```ts
function createServer<IAPI extends object>(
  api: IAPI
, socket: WebSocket
, parameterValidators?: DelightRPC.ParameterValidators<IAPI>
): () => void
```
