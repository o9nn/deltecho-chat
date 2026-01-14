[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / AgentMCPServer

# Class: AgentMCPServer

Agent-MCP Server

Represents an actual agent within the arena, containing its
virtual self-model (Vi) which in turn contains its world-view (Vo).

## Hierarchy

- `EventEmitter`

  ↳ **`AgentMCPServer`**

## Table of contents

### Constructors

- [constructor](AgentMCPServer.md#constructor)

### Methods

- [listResources](AgentMCPServer.md#listresources)
- [readResource](AgentMCPServer.md#readresource)
- [listTools](AgentMCPServer.md#listtools)
- [callTool](AgentMCPServer.md#calltool)
- [listPrompts](AgentMCPServer.md#listprompts)
- [getPrompt](AgentMCPServer.md#getprompt)
- [getVirtualAgent](AgentMCPServer.md#getvirtualagent)
- [getVirtualArena](AgentMCPServer.md#getvirtualarena)
- [updateVirtualAgent](AgentMCPServer.md#updatevirtualagent)
- [updateVirtualArena](AgentMCPServer.md#updatevirtualarena)
- [syncVirtualFromActual](AgentMCPServer.md#syncvirtualfromactual)
- [getAgent](AgentMCPServer.md#getagent)
- [getConfig](AgentMCPServer.md#getconfig)

## Constructors

### constructor

• **new AgentMCPServer**(`agent`, `config?`): [`AgentMCPServer`](AgentMCPServer.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `agent` | `AgentMembrane` |
| `config` | `Partial`\<[`AgentMCPConfig`](../interfaces/AgentMCPConfig.md)\> |

#### Returns

[`AgentMCPServer`](AgentMCPServer.md)

#### Overrides

EventEmitter.constructor

#### Defined in

[src/agent-mcp/index.ts:99](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L99)

## Methods

### listResources

▸ **listResources**(): \{ `uri`: `string` ; `name`: `string` ; `description`: `string`  }[]

Handle list_resources request

#### Returns

\{ `uri`: `string` ; `name`: `string` ; `description`: `string`  }[]

#### Defined in

[src/agent-mcp/index.ts:125](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L125)

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

[src/agent-mcp/index.ts:132](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L132)

___

### listTools

▸ **listTools**(): \{ `name`: `string` ; `description`: `string` ; `inputSchema`: `object`  }[]

Handle list_tools request

#### Returns

\{ `name`: `string` ; `description`: `string` ; `inputSchema`: `object`  }[]

#### Defined in

[src/agent-mcp/index.ts:164](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L164)

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

[src/agent-mcp/index.ts:175](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L175)

___

### listPrompts

▸ **listPrompts**(): \{ `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean`  }[]  }[]

Handle list_prompts request

#### Returns

\{ `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean`  }[]  }[]

#### Defined in

[src/agent-mcp/index.ts:194](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L194)

___

### getPrompt

▸ **getPrompt**(`name`, `args?`): `string`

Handle get_prompt request

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `args?` | `Record`\<`string`, `string`\> |

#### Returns

`string`

#### Defined in

[src/agent-mcp/index.ts:205](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L205)

___

### getVirtualAgent

▸ **getVirtualAgent**(): [`VirtualAgentModel`](../interfaces/VirtualAgentModel.md)

Get the virtual self-model (Vi)

#### Returns

[`VirtualAgentModel`](../interfaces/VirtualAgentModel.md)

#### Defined in

[src/agent-mcp/index.ts:238](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L238)

___

### getVirtualArena

▸ **getVirtualArena**(): [`VirtualArenaModel`](../interfaces/VirtualArenaModel.md)

Get the virtual world-view (Vo - inside Vi)

#### Returns

[`VirtualArenaModel`](../interfaces/VirtualArenaModel.md)

#### Defined in

[src/agent-mcp/index.ts:245](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L245)

___

### updateVirtualAgent

▸ **updateVirtualAgent**(`update`): `void`

Update the virtual self-model

#### Parameters

| Name | Type |
| :------ | :------ |
| `update` | `Partial`\<[`VirtualAgentModel`](../interfaces/VirtualAgentModel.md)\> |

#### Returns

`void`

#### Defined in

[src/agent-mcp/index.ts:252](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L252)

___

### updateVirtualArena

▸ **updateVirtualArena**(`update`): `void`

Update the virtual world-view

#### Parameters

| Name | Type |
| :------ | :------ |
| `update` | `Partial`\<[`VirtualArenaModel`](../interfaces/VirtualArenaModel.md)\> |

#### Returns

`void`

#### Defined in

[src/agent-mcp/index.ts:260](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L260)

___

### syncVirtualFromActual

▸ **syncVirtualFromActual**(): `void`

Sync virtual model from actual agent state
This is how perception updates the internal world-view

#### Returns

`void`

#### Defined in

[src/agent-mcp/index.ts:269](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L269)

___

### getAgent

▸ **getAgent**(): `AgentMembrane`

#### Returns

`AgentMembrane`

#### Defined in

[src/agent-mcp/index.ts:286](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L286)

___

### getConfig

▸ **getConfig**(): [`AgentMCPConfig`](../interfaces/AgentMCPConfig.md)

#### Returns

[`AgentMCPConfig`](../interfaces/AgentMCPConfig.md)

#### Defined in

[src/agent-mcp/index.ts:290](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L290)
