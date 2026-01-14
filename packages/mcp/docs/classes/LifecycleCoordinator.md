[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / LifecycleCoordinator

# Class: LifecycleCoordinator

Developmental Lifecycle Coordinator

Manages the continuous cycle of:
Perception → Modeling → Reflection → Mirroring → Enaction

Each cycle integrates the Actual (Ao, Ai) with the Virtual (Vi, Vo)
through the Relation interface (S).

## Hierarchy

- `EventEmitter`

  ↳ **`LifecycleCoordinator`**

## Table of contents

### Constructors

- [constructor](LifecycleCoordinator.md#constructor)

### Methods

- [start](LifecycleCoordinator.md#start)
- [stop](LifecycleCoordinator.md#stop)
- [runCycle](LifecycleCoordinator.md#runcycle)
- [executePhase](LifecycleCoordinator.md#executephase)
- [getCycleCount](LifecycleCoordinator.md#getcyclecount)
- [getCurrentPhase](LifecycleCoordinator.md#getcurrentphase)
- [isRunning](LifecycleCoordinator.md#isrunning)
- [getConfig](LifecycleCoordinator.md#getconfig)

## Constructors

### constructor

• **new LifecycleCoordinator**(`arenaMCP`, `agentMCP`, `relationMCP`, `config?`): [`LifecycleCoordinator`](LifecycleCoordinator.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `arenaMCP` | [`ArenaMCPServer`](ArenaMCPServer.md) |
| `agentMCP` | [`AgentMCPServer`](AgentMCPServer.md) |
| `relationMCP` | [`RelationMCPServer`](RelationMCPServer.md) |
| `config` | `Partial`\<[`LifecycleConfig`](../interfaces/LifecycleConfig.md)\> |

#### Returns

[`LifecycleCoordinator`](LifecycleCoordinator.md)

#### Overrides

EventEmitter.constructor

#### Defined in

[src/integration/lifecycle.ts:81](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L81)

## Methods

### start

▸ **start**(): `void`

Start the lifecycle coordinator

#### Returns

`void`

#### Defined in

[src/integration/lifecycle.ts:101](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L101)

___

### stop

▸ **stop**(): `void`

Stop the lifecycle coordinator

#### Returns

`void`

#### Defined in

[src/integration/lifecycle.ts:120](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L120)

___

### runCycle

▸ **runCycle**(): `Promise`\<[`DevelopmentalCycleResult`](../interfaces/DevelopmentalCycleResult.md)[]\>

Run a complete developmental cycle

#### Returns

`Promise`\<[`DevelopmentalCycleResult`](../interfaces/DevelopmentalCycleResult.md)[]\>

#### Defined in

[src/integration/lifecycle.ts:139](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L139)

___

### executePhase

▸ **executePhase**(`phase`, `cycleId?`): `Promise`\<[`DevelopmentalCycleResult`](../interfaces/DevelopmentalCycleResult.md)\>

Execute a single lifecycle phase

#### Parameters

| Name | Type |
| :------ | :------ |
| `phase` | [`LifecyclePhase`](../enums/LifecyclePhase.md) |
| `cycleId` | `number` |

#### Returns

`Promise`\<[`DevelopmentalCycleResult`](../interfaces/DevelopmentalCycleResult.md)\>

#### Defined in

[src/integration/lifecycle.ts:171](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L171)

___

### getCycleCount

▸ **getCycleCount**(): `number`

#### Returns

`number`

#### Defined in

[src/integration/lifecycle.ts:395](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L395)

___

### getCurrentPhase

▸ **getCurrentPhase**(): [`LifecyclePhase`](../enums/LifecyclePhase.md)

#### Returns

[`LifecyclePhase`](../enums/LifecyclePhase.md)

#### Defined in

[src/integration/lifecycle.ts:399](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L399)

___

### isRunning

▸ **isRunning**(): `boolean`

#### Returns

`boolean`

#### Defined in

[src/integration/lifecycle.ts:403](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L403)

___

### getConfig

▸ **getConfig**(): [`LifecycleConfig`](../interfaces/LifecycleConfig.md)

#### Returns

[`LifecycleConfig`](../interfaces/LifecycleConfig.md)

#### Defined in

[src/integration/lifecycle.ts:407](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L407)
