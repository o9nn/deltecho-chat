[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / NestedMCPServer

# Class: NestedMCPServer

Nested MCP Server

The unified server that orchestrates all three MCP layers and the
developmental lifecycle, implementing the inverted mirror pattern.

**`Example`**

```typescript
const server = await NestedMCPServer.create({ instanceName: 'MyEcho' });
await server.start();

// Access individual layers
const arenaPrompt = server.getArenaServer().getPrompt('world_context');
const agentPrompt = server.getAgentServer().getPrompt('persona_context');

// Run a lifecycle cycle
const results = await server.runLifecycleCycle();
```

## Hierarchy

- `EventEmitter`

  ↳ **`NestedMCPServer`**

## Table of contents

### Methods

- [create](NestedMCPServer.md#create)
- [start](NestedMCPServer.md#start)
- [stop](NestedMCPServer.md#stop)
- [runLifecycleCycle](NestedMCPServer.md#runlifecyclecycle)
- [executePhase](NestedMCPServer.md#executephase)
- [listAllResources](NestedMCPServer.md#listallresources)
- [readResource](NestedMCPServer.md#readresource)
- [listAllTools](NestedMCPServer.md#listalltools)
- [callTool](NestedMCPServer.md#calltool)
- [listAllPrompts](NestedMCPServer.md#listallprompts)
- [getPrompt](NestedMCPServer.md#getprompt)
- [getArenaServer](NestedMCPServer.md#getarenaserver)
- [getAgentServer](NestedMCPServer.md#getagentserver)
- [getRelationServer](NestedMCPServer.md#getrelationserver)
- [getLifecycle](NestedMCPServer.md#getlifecycle)
- [getAARSystem](NestedMCPServer.md#getaarsystem)
- [getVirtualAgent](NestedMCPServer.md#getvirtualagent)
- [getVirtualArena](NestedMCPServer.md#getvirtualarena)
- [getConfig](NestedMCPServer.md#getconfig)
- [isRunning](NestedMCPServer.md#isrunning)
- [getStateSummary](NestedMCPServer.md#getstatesummary)

## Methods

### create

▸ **create**(`config?`): `Promise`\<[`NestedMCPServer`](NestedMCPServer.md)\>

Create a new NestedMCPServer

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Partial`\<[`NestedMCPServerConfig`](../interfaces/NestedMCPServerConfig.md)\> |

#### Returns

`Promise`\<[`NestedMCPServer`](NestedMCPServer.md)\>

#### Defined in

[src/server.ts:170](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L170)

___

### start

▸ **start**(): `Promise`\<`void`\>

Start the server and all subsystems

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/server.ts:262](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L262)

___

### stop

▸ **stop**(): `Promise`\<`void`\>

Stop the server and all subsystems

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/server.ts:280](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L280)

___

### runLifecycleCycle

▸ **runLifecycleCycle**(): `Promise`\<`any`[]\>

Run a single lifecycle cycle manually

#### Returns

`Promise`\<`any`[]\>

#### Defined in

[src/server.ts:299](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L299)

___

### executePhase

▸ **executePhase**(`phase`): `Promise`\<`any`\>

Execute a specific lifecycle phase

#### Parameters

| Name | Type |
| :------ | :------ |
| `phase` | [`LifecyclePhase`](../enums/LifecyclePhase.md) |

#### Returns

`Promise`\<`any`\>

#### Defined in

[src/server.ts:306](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L306)

___

### listAllResources

▸ **listAllResources**(): \{ `layer`: ``"arena"`` \| ``"agent"`` \| ``"relation"`` ; `uri`: `string` ; `name`: `string` ; `description`: `string`  }[]

Unified list_resources across all layers

#### Returns

\{ `layer`: ``"arena"`` \| ``"agent"`` \| ``"relation"`` ; `uri`: `string` ; `name`: `string` ; `description`: `string`  }[]

#### Defined in

[src/server.ts:317](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L317)

___

### readResource

▸ **readResource**(`uri`): `unknown`

Unified read_resource that routes to appropriate layer

#### Parameters

| Name | Type |
| :------ | :------ |
| `uri` | `string` |

#### Returns

`unknown`

#### Defined in

[src/server.ts:342](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L342)

___

### listAllTools

▸ **listAllTools**(): \{ `layer`: ``"arena"`` \| ``"agent"`` \| ``"relation"`` ; `name`: `string` ; `description`: `string` ; `inputSchema`: `object`  }[]

Unified list_tools across all layers

#### Returns

\{ `layer`: ``"arena"`` \| ``"agent"`` \| ``"relation"`` ; `name`: `string` ; `description`: `string` ; `inputSchema`: `object`  }[]

#### Defined in

[src/server.ts:356](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L356)

___

### callTool

▸ **callTool**(`layer`, `name`, `args`): `Promise`\<`unknown`\>

Unified call_tool that routes to appropriate layer

#### Parameters

| Name | Type |
| :------ | :------ |
| `layer` | ``"arena"`` \| ``"agent"`` \| ``"relation"`` |
| `name` | `string` |
| `args` | `unknown` |

#### Returns

`Promise`\<`unknown`\>

#### Defined in

[src/server.ts:381](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L381)

___

### listAllPrompts

▸ **listAllPrompts**(): \{ `layer`: ``"arena"`` \| ``"agent"`` \| ``"relation"`` ; `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean`  }[]  }[]

Unified list_prompts across all layers

#### Returns

\{ `layer`: ``"arena"`` \| ``"agent"`` \| ``"relation"`` ; `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean`  }[]  }[]

#### Defined in

[src/server.ts:397](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L397)

___

### getPrompt

▸ **getPrompt**(`layer`, `name`, `args?`): `string`

Unified get_prompt that routes to appropriate layer

#### Parameters

| Name | Type |
| :------ | :------ |
| `layer` | ``"arena"`` \| ``"agent"`` \| ``"relation"`` |
| `name` | `string` |
| `args?` | `Record`\<`string`, `string`\> |

#### Returns

`string`

#### Defined in

[src/server.ts:422](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L422)

___

### getArenaServer

▸ **getArenaServer**(): [`ArenaMCPServer`](ArenaMCPServer.md)

#### Returns

[`ArenaMCPServer`](ArenaMCPServer.md)

#### Defined in

[src/server.ts:443](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L443)

___

### getAgentServer

▸ **getAgentServer**(): [`AgentMCPServer`](AgentMCPServer.md)

#### Returns

[`AgentMCPServer`](AgentMCPServer.md)

#### Defined in

[src/server.ts:447](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L447)

___

### getRelationServer

▸ **getRelationServer**(): [`RelationMCPServer`](RelationMCPServer.md)

#### Returns

[`RelationMCPServer`](RelationMCPServer.md)

#### Defined in

[src/server.ts:451](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L451)

___

### getLifecycle

▸ **getLifecycle**(): [`LifecycleCoordinator`](LifecycleCoordinator.md)

#### Returns

[`LifecycleCoordinator`](LifecycleCoordinator.md)

#### Defined in

[src/server.ts:455](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L455)

___

### getAARSystem

▸ **getAARSystem**(): `AARSystem`

#### Returns

`AARSystem`

#### Defined in

[src/server.ts:459](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L459)

___

### getVirtualAgent

▸ **getVirtualAgent**(): [`VirtualAgentModel`](../interfaces/VirtualAgentModel.md)

#### Returns

[`VirtualAgentModel`](../interfaces/VirtualAgentModel.md)

#### Defined in

[src/server.ts:463](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L463)

___

### getVirtualArena

▸ **getVirtualArena**(): [`VirtualArenaModel`](../interfaces/VirtualArenaModel.md)

#### Returns

[`VirtualArenaModel`](../interfaces/VirtualArenaModel.md)

#### Defined in

[src/server.ts:467](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L467)

___

### getConfig

▸ **getConfig**(): [`NestedMCPServerConfig`](../interfaces/NestedMCPServerConfig.md)

#### Returns

[`NestedMCPServerConfig`](../interfaces/NestedMCPServerConfig.md)

#### Defined in

[src/server.ts:471](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L471)

___

### isRunning

▸ **isRunning**(): `boolean`

#### Returns

`boolean`

#### Defined in

[src/server.ts:475](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L475)

___

### getStateSummary

▸ **getStateSummary**(): `object`

Get a summary of the current state for debugging

#### Returns

`object`

#### Defined in

[src/server.ts:482](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L482)
