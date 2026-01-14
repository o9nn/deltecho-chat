[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / Transport

# Interface: Transport

Transport interface

## Implemented by

- [`StdioTransport`](../classes/StdioTransport.md)

## Table of contents

### Methods

- [start](Transport.md#start)
- [stop](Transport.md#stop)
- [isRunning](Transport.md#isrunning)

## Methods

### start

▸ **start**(): `Promise`\<`void`\>

Start the transport

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/transport/types.ts:72](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/types.ts#L72)

___

### stop

▸ **stop**(): `Promise`\<`void`\>

Stop the transport

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/transport/types.ts:74](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/types.ts#L74)

___

### isRunning

▸ **isRunning**(): `boolean`

Check if running

#### Returns

`boolean`

#### Defined in

[src/transport/types.ts:76](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/types.ts#L76)
