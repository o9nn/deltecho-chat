[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / NestedMCPServerConfig

# Interface: NestedMCPServerConfig

Unified server configuration

## Table of contents

### Properties

- [instanceName](NestedMCPServerConfig.md#instancename)
- [arena](NestedMCPServerConfig.md#arena)
- [agent](NestedMCPServerConfig.md#agent)
- [relation](NestedMCPServerConfig.md#relation)
- [enableLifecycle](NestedMCPServerConfig.md#enablelifecycle)
- [lifecycleIntervalMs](NestedMCPServerConfig.md#lifecycleintervalms)
- [verbose](NestedMCPServerConfig.md#verbose)

## Properties

### instanceName

• **instanceName**: `string`

Instance name

#### Defined in

[src/server.ts:43](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L43)

___

### arena

• `Optional` **arena**: `Partial`\<[`ArenaMCPConfig`](ArenaMCPConfig.md)\>

Arena layer configuration

#### Defined in

[src/server.ts:45](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L45)

___

### agent

• `Optional` **agent**: `Partial`\<[`AgentMCPConfig`](AgentMCPConfig.md)\>

Agent layer configuration

#### Defined in

[src/server.ts:47](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L47)

___

### relation

• `Optional` **relation**: `Partial`\<[`RelationMCPConfig`](RelationMCPConfig.md)\>

Relation layer configuration

#### Defined in

[src/server.ts:49](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L49)

___

### enableLifecycle

• **enableLifecycle**: `boolean`

Enable automatic lifecycle cycling

#### Defined in

[src/server.ts:51](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L51)

___

### lifecycleIntervalMs

• **lifecycleIntervalMs**: `number`

Lifecycle cycle interval (0 = manual)

#### Defined in

[src/server.ts:53](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L53)

___

### verbose

• **verbose**: `boolean`

Enable verbose logging

#### Defined in

[src/server.ts:55](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L55)
