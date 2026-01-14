[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / DevelopmentalCycleResult

# Interface: DevelopmentalCycleResult

Developmental cycle result

## Table of contents

### Properties

- [cycleNumber](DevelopmentalCycleResult.md#cyclenumber)
- [phase](DevelopmentalCycleResult.md#phase)
- [stateChanges](DevelopmentalCycleResult.md#statechanges)
- [coherenceAfter](DevelopmentalCycleResult.md#coherenceafter)
- [timestamp](DevelopmentalCycleResult.md#timestamp)

## Properties

### cycleNumber

• **cycleNumber**: `number`

#### Defined in

[src/types.ts:212](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L212)

___

### phase

• **phase**: ``"reflection"`` \| ``"perception"`` \| ``"modeling"`` \| ``"mirroring"`` \| ``"enaction"``

#### Defined in

[src/types.ts:213](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L213)

___

### stateChanges

• **stateChanges**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `agentDelta` | `AgentState` |
| `arenaDelta` | `ArenaState` |
| `virtualAgentDelta` | `Partial`\<[`VirtualAgentModel`](VirtualAgentModel.md)\> |
| `virtualArenaDelta` | `Partial`\<[`VirtualArenaModel`](VirtualArenaModel.md)\> |

#### Defined in

[src/types.ts:214](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L214)

___

### coherenceAfter

• **coherenceAfter**: `number`

#### Defined in

[src/types.ts:220](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L220)

___

### timestamp

• **timestamp**: `number`

#### Defined in

[src/types.ts:221](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L221)
