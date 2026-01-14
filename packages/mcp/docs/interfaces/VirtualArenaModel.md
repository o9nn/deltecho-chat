[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / VirtualArenaModel

# Interface: VirtualArenaModel

Virtual Arena Model (Vo) - The agent's mental image of the world
This is the inner-most layer, representing subjective world-view

## Table of contents

### Properties

- [situationalAwareness](VirtualArenaModel.md#situationalawareness)
- [knownEntities](VirtualArenaModel.md#knownentities)
- [perceivedRules](VirtualArenaModel.md#perceivedrules)
- [worldTheory](VirtualArenaModel.md#worldtheory)
- [uncertainties](VirtualArenaModel.md#uncertainties)
- [divergenceMetrics](VirtualArenaModel.md#divergencemetrics)

## Properties

### situationalAwareness

• **situationalAwareness**: `Object`

Subjective understanding of current situation

#### Type declaration

| Name | Type |
| :------ | :------ |
| `perceivedContext` | `string` |
| `assumedNarrativePhase` | `string` \| `number` \| `symbol` |
| `estimatedCoherence` | `number` |

#### Defined in

[src/types.ts:34](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L34)

___

### knownEntities

• **knownEntities**: `Map`\<`string`, [`EntityImpression`](EntityImpression.md)\>

Mental map of known entities and impressions

#### Defined in

[src/types.ts:41](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L41)

___

### perceivedRules

• **perceivedRules**: `string`[]

Believed rules and constraints of the world

#### Defined in

[src/types.ts:44](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L44)

___

### worldTheory

• **worldTheory**: `string`

The agent's theory of how the world works

#### Defined in

[src/types.ts:47](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L47)

___

### uncertainties

• **uncertainties**: `string`[]

Acknowledged knowledge gaps

#### Defined in

[src/types.ts:50](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L50)

___

### divergenceMetrics

• **divergenceMetrics**: `Object`

Divergence from actual arena (for self-awareness)

#### Type declaration

| Name | Type |
| :------ | :------ |
| `lastSyncTime` | `number` |
| `estimatedDrift` | `number` |
| `knownMisalignments` | `string`[] |

#### Defined in

[src/types.ts:53](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L53)
