[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / RelationMCPServer

# Class: RelationMCPServer

Relation-MCP Server

The integrating interface between Agent and Arena membranes.
Holds the virtual models (Vi containing Vo) that form the inverted mirror.

## Hierarchy

- `EventEmitter`

  ↳ **`RelationMCPServer`**

## Table of contents

### Constructors

- [constructor](RelationMCPServer.md#constructor)

### Methods

- [listResources](RelationMCPServer.md#listresources)
- [readResource](RelationMCPServer.md#readresource)
- [listTools](RelationMCPServer.md#listtools)
- [callTool](RelationMCPServer.md#calltool)
- [listPrompts](RelationMCPServer.md#listprompts)
- [getPrompt](RelationMCPServer.md#getprompt)
- [startMirrorSync](RelationMCPServer.md#startmirrorsync)
- [stopMirrorSync](RelationMCPServer.md#stopmirrorsync)
- [getVirtualAgent](RelationMCPServer.md#getvirtualagent)
- [getVirtualArena](RelationMCPServer.md#getvirtualarena)
- [updateVirtualAgent](RelationMCPServer.md#updatevirtualagent)
- [updateVirtualArena](RelationMCPServer.md#updatevirtualarena)
- [shutdown](RelationMCPServer.md#shutdown)
- [getRelation](RelationMCPServer.md#getrelation)
- [getAgent](RelationMCPServer.md#getagent)
- [getArena](RelationMCPServer.md#getarena)
- [getConfig](RelationMCPServer.md#getconfig)

## Constructors

### constructor

• **new RelationMCPServer**(`relation`, `agent`, `arena`, `virtualAgent`, `config?`): [`RelationMCPServer`](RelationMCPServer.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `relation` | `RelationInterface` |
| `agent` | `AgentMembrane` |
| `arena` | `ArenaMembrane` |
| `virtualAgent` | [`VirtualAgentModel`](../interfaces/VirtualAgentModel.md) |
| `config` | `Partial`\<[`RelationMCPConfig`](../interfaces/RelationMCPConfig.md)\> |

#### Returns

[`RelationMCPServer`](RelationMCPServer.md)

#### Overrides

EventEmitter.constructor

#### Defined in

[src/relation-mcp/index.ts:51](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L51)

## Methods

### listResources

▸ **listResources**(): \{ `uri`: `string` ; `name`: `string` ; `description`: `string`  }[]

Handle list_resources request

#### Returns

\{ `uri`: `string` ; `name`: `string` ; `description`: `string`  }[]

#### Defined in

[src/relation-mcp/index.ts:87](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L87)

___

### readResource

▸ **readResource**(`uri`): `unknown`

Handle read_resource request

#### Parameters

| Name | Type |
| :------ | :------ |
| `uri` | `string` |

#### Returns

`unknown`

#### Defined in

[src/relation-mcp/index.ts:94](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L94)

___

### listTools

▸ **listTools**(): \{ `name`: `string` ; `description`: `string` ; `inputSchema`: `object`  }[]

Handle list_tools request

#### Returns

\{ `name`: `string` ; `description`: `string` ; `inputSchema`: `object`  }[]

#### Defined in

[src/relation-mcp/index.ts:121](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L121)

___

### callTool

▸ **callTool**(`name`, `args`): `Promise`\<`unknown`\>

Handle call_tool request

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `args` | `unknown` |

#### Returns

`Promise`\<`unknown`\>

#### Defined in

[src/relation-mcp/index.ts:132](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L132)

___

### listPrompts

▸ **listPrompts**(): \{ `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean`  }[]  }[]

Handle list_prompts request

#### Returns

\{ `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean`  }[]  }[]

#### Defined in

[src/relation-mcp/index.ts:150](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L150)

___

### getPrompt

▸ **getPrompt**(`name`, `_args?`): `string`

Handle get_prompt request

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `_args?` | `Record`\<`string`, `string`\> |

#### Returns

`string`

#### Defined in

[src/relation-mcp/index.ts:161](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L161)

___

### startMirrorSync

▸ **startMirrorSync**(): `void`

Start periodic mirror synchronization

#### Returns

`void`

#### Defined in

[src/relation-mcp/index.ts:197](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L197)

___

### stopMirrorSync

▸ **stopMirrorSync**(): `void`

Stop mirror synchronization

#### Returns

`void`

#### Defined in

[src/relation-mcp/index.ts:210](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L210)

___

### getVirtualAgent

▸ **getVirtualAgent**(): [`VirtualAgentModel`](../interfaces/VirtualAgentModel.md)

Get virtual agent model (Vi)

#### Returns

[`VirtualAgentModel`](../interfaces/VirtualAgentModel.md)

#### Defined in

[src/relation-mcp/index.ts:319](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L319)

___

### getVirtualArena

▸ **getVirtualArena**(): [`VirtualArenaModel`](../interfaces/VirtualArenaModel.md)

Get virtual arena model (Vo)

#### Returns

[`VirtualArenaModel`](../interfaces/VirtualArenaModel.md)

#### Defined in

[src/relation-mcp/index.ts:326](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L326)

___

### updateVirtualAgent

▸ **updateVirtualAgent**(`update`): `void`

Update virtual agent model

#### Parameters

| Name | Type |
| :------ | :------ |
| `update` | `Partial`\<[`VirtualAgentModel`](../interfaces/VirtualAgentModel.md)\> |

#### Returns

`void`

#### Defined in

[src/relation-mcp/index.ts:333](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L333)

___

### updateVirtualArena

▸ **updateVirtualArena**(`update`): `void`

Update virtual arena model

#### Parameters

| Name | Type |
| :------ | :------ |
| `update` | `Partial`\<[`VirtualArenaModel`](../interfaces/VirtualArenaModel.md)\> |

#### Returns

`void`

#### Defined in

[src/relation-mcp/index.ts:341](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L341)

___

### shutdown

▸ **shutdown**(): `void`

Shutdown the server

#### Returns

`void`

#### Defined in

[src/relation-mcp/index.ts:353](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L353)

___

### getRelation

▸ **getRelation**(): `RelationInterface`

#### Returns

`RelationInterface`

#### Defined in

[src/relation-mcp/index.ts:362](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L362)

___

### getAgent

▸ **getAgent**(): `AgentMembrane`

#### Returns

`AgentMembrane`

#### Defined in

[src/relation-mcp/index.ts:366](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L366)

___

### getArena

▸ **getArena**(): `ArenaMembrane`

#### Returns

`ArenaMembrane`

#### Defined in

[src/relation-mcp/index.ts:370](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L370)

___

### getConfig

▸ **getConfig**(): [`RelationMCPConfig`](../interfaces/RelationMCPConfig.md)

#### Returns

[`RelationMCPConfig`](../interfaces/RelationMCPConfig.md)

#### Defined in

[src/relation-mcp/index.ts:374](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L374)
