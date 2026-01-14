[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / StdioTransport

# Class: StdioTransport

Stdio Transport

Reads JSON-RPC requests from stdin (one per line)
and writes responses to stdout (one per line).

## Implements

- [`Transport`](../interfaces/Transport.md)

## Table of contents

### Constructors

- [constructor](StdioTransport.md#constructor)

### Methods

- [start](StdioTransport.md#start)
- [stop](StdioTransport.md#stop)
- [isRunning](StdioTransport.md#isrunning)

## Constructors

### constructor

• **new StdioTransport**(`server`, `config?`): [`StdioTransport`](StdioTransport.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `server` | [`NestedMCPServer`](NestedMCPServer.md) |
| `config` | [`StdioTransportConfig`](../interfaces/StdioTransportConfig.md) |

#### Returns

[`StdioTransport`](StdioTransport.md)

#### Defined in

[src/transport/stdio.ts:34](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/stdio.ts#L34)

## Methods

### start

▸ **start**(): `Promise`\<`void`\>

Start the transport

#### Returns

`Promise`\<`void`\>

#### Implementation of

[Transport](../interfaces/Transport.md).[start](../interfaces/Transport.md#start)

#### Defined in

[src/transport/stdio.ts:43](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/stdio.ts#L43)

___

### stop

▸ **stop**(): `Promise`\<`void`\>

Stop the transport

#### Returns

`Promise`\<`void`\>

#### Implementation of

[Transport](../interfaces/Transport.md).[stop](../interfaces/Transport.md#stop)

#### Defined in

[src/transport/stdio.ts:93](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/stdio.ts#L93)

___

### isRunning

▸ **isRunning**(): `boolean`

Check if running

#### Returns

`boolean`

#### Implementation of

[Transport](../interfaces/Transport.md).[isRunning](../interfaces/Transport.md#isrunning)

#### Defined in

[src/transport/stdio.ts:114](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/stdio.ts#L114)
