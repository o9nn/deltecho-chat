[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / ProtocolHandler

# Class: ProtocolHandler

Protocol Handler

Processes MCP JSON-RPC requests and routes them to the server.

## Table of contents

### Constructors

- [constructor](ProtocolHandler.md#constructor)

### Methods

- [handleRequest](ProtocolHandler.md#handlerequest)
- [handleRawRequest](ProtocolHandler.md#handlerawrequest)
- [addHandler](ProtocolHandler.md#addhandler)

## Constructors

### constructor

• **new ProtocolHandler**(`server`, `verbose?`): [`ProtocolHandler`](ProtocolHandler.md)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `server` | [`NestedMCPServer`](NestedMCPServer.md) | `undefined` |
| `verbose` | `boolean` | `false` |

#### Returns

[`ProtocolHandler`](ProtocolHandler.md)

#### Defined in

[src/transport/handler.ts:228](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/handler.ts#L228)

## Methods

### handleRequest

▸ **handleRequest**(`request`): `Promise`\<``null`` \| [`MCPResponse`](../interfaces/MCPResponse.md)\>

Handle a JSON-RPC request

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`MCPRequest`](../interfaces/MCPRequest.md) |

#### Returns

`Promise`\<``null`` \| [`MCPResponse`](../interfaces/MCPResponse.md)\>

#### Defined in

[src/transport/handler.ts:237](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/handler.ts#L237)

___

### handleRawRequest

▸ **handleRawRequest**(`raw`): `Promise`\<``null`` \| `string`\>

Parse and handle a raw JSON string

#### Parameters

| Name | Type |
| :------ | :------ |
| `raw` | `string` |

#### Returns

`Promise`\<``null`` \| `string`\>

#### Defined in

[src/transport/handler.ts:300](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/handler.ts#L300)

___

### addHandler

▸ **addHandler**(`method`, `handler`): `void`

Add a custom method handler

#### Parameters

| Name | Type |
| :------ | :------ |
| `method` | `string` |
| `handler` | `MethodHandler` |

#### Returns

`void`

#### Defined in

[src/transport/handler.ts:322](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/handler.ts#L322)
