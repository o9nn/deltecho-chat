[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / ArenaMCPServer

# Class: ArenaMCPServer

Arena-MCP Server

The outer layer of the nested MCP architecture, representing the
actual world context in which agents operate.

## Hierarchy

- `EventEmitter`

  ↳ **`ArenaMCPServer`**

## Table of contents

### Constructors

- [constructor](ArenaMCPServer.md#constructor)

### Methods

- [listResources](ArenaMCPServer.md#listresources)
- [readResource](ArenaMCPServer.md#readresource)
- [listTools](ArenaMCPServer.md#listtools)
- [callTool](ArenaMCPServer.md#calltool)
- [listPrompts](ArenaMCPServer.md#listprompts)
- [getPrompt](ArenaMCPServer.md#getprompt)
- [registerAgent](ArenaMCPServer.md#registeragent)
- [deregisterAgent](ArenaMCPServer.md#deregisteragent)
- [getAgents](ArenaMCPServer.md#getagents)
- [setOrchestrationCallback](ArenaMCPServer.md#setorchestrationcallback)
- [getArena](ArenaMCPServer.md#getarena)
- [getConfig](ArenaMCPServer.md#getconfig)

## Constructors

### constructor

• **new ArenaMCPServer**(`arena`, `config?`): [`ArenaMCPServer`](ArenaMCPServer.md)

#### Parameters

| Name     | Type                                                             |
| :------- | :--------------------------------------------------------------- |
| `arena`  | `ArenaMembrane`                                                  |
| `config` | `Partial`\<[`ArenaMCPConfig`](../interfaces/ArenaMCPConfig.md)\> |

#### Returns

[`ArenaMCPServer`](ArenaMCPServer.md)

#### Overrides

EventEmitter.constructor

#### Defined in

[src/arena-mcp/index.ts:48](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L48)

## Methods

### listResources

▸ **listResources**(): \{ `uri`: `string` ; `name`: `string` ; `description`: `string` }[]

Handle list_resources request

#### Returns

\{ `uri`: `string` ; `name`: `string` ; `description`: `string` }[]

#### Defined in

[src/arena-mcp/index.ts:73](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L73)

---

### readResource

▸ **readResource**(`uri`): `unknown`

Handle read_resource request

#### Parameters

| Name  | Type     |
| :---- | :------- |
| `uri` | `string` |

#### Returns

`unknown`

#### Defined in

[src/arena-mcp/index.ts:80](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L80)

---

### listTools

▸ **listTools**(): \{ `name`: `string` ; `description`: `string` ; `inputSchema`: `object` }[]

Handle list_tools request

#### Returns

\{ `name`: `string` ; `description`: `string` ; `inputSchema`: `object` }[]

#### Defined in

[src/arena-mcp/index.ts:116](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L116)

---

### callTool

▸ **callTool**(`name`, `args`): `Promise`\<`unknown`\>

Handle call_tool request

#### Parameters

| Name   | Type      |
| :----- | :-------- |
| `name` | `string`  |
| `args` | `unknown` |

#### Returns

`Promise`\<`unknown`\>

#### Defined in

[src/arena-mcp/index.ts:127](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L127)

---

### listPrompts

▸ **listPrompts**(): \{ `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean` }[] }[]

Handle list_prompts request

#### Returns

\{ `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean` }[] }[]

#### Defined in

[src/arena-mcp/index.ts:146](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L146)

---

### getPrompt

▸ **getPrompt**(`name`, `args?`): `string`

Handle get_prompt request

#### Parameters

| Name    | Type                           |
| :------ | :----------------------------- |
| `name`  | `string`                       |
| `args?` | `Record`\<`string`, `string`\> |

#### Returns

`string`

#### Defined in

[src/arena-mcp/index.ts:157](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L157)

---

### registerAgent

▸ **registerAgent**(`ref`): `void`

Register an agent in this arena

#### Parameters

| Name  | Type                                                |
| :---- | :-------------------------------------------------- |
| `ref` | [`AgentReference`](../interfaces/AgentReference.md) |

#### Returns

`void`

#### Defined in

[src/arena-mcp/index.ts:186](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L186)

---

### deregisterAgent

▸ **deregisterAgent**(`agentId`): `boolean`

Deregister an agent

#### Parameters

| Name      | Type     |
| :-------- | :------- |
| `agentId` | `string` |

#### Returns

`boolean`

#### Defined in

[src/arena-mcp/index.ts:194](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L194)

---

### getAgents

▸ **getAgents**(): [`AgentReference`](../interfaces/AgentReference.md)[]

Get all registered agents

#### Returns

[`AgentReference`](../interfaces/AgentReference.md)[]

#### Defined in

[src/arena-mcp/index.ts:205](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L205)

---

### setOrchestrationCallback

▸ **setOrchestrationCallback**(`callback`): `void`

Set orchestration callback

#### Parameters

| Name       | Type                                                                                      |
| :--------- | :---------------------------------------------------------------------------------------- |
| `callback` | (`agents`: `string`[], `directive`: `string`) => `Promise`\<`Map`\<`string`, `string`\>\> |

#### Returns

`void`

#### Defined in

[src/arena-mcp/index.ts:212](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L212)

---

### getArena

▸ **getArena**(): `ArenaMembrane`

Get underlying arena membrane

#### Returns

`ArenaMembrane`

#### Defined in

[src/arena-mcp/index.ts:225](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L225)

---

### getConfig

▸ **getConfig**(): [`ArenaMCPConfig`](../interfaces/ArenaMCPConfig.md)

Get configuration

#### Returns

[`ArenaMCPConfig`](../interfaces/ArenaMCPConfig.md)

#### Defined in

[src/arena-mcp/index.ts:232](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L232)
