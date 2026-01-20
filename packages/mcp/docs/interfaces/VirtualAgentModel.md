[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / VirtualAgentModel

# Interface: VirtualAgentModel

Virtual Agent Model (Vi) - The agent's model of itself
Contains Vo as the inverted inner world-view

## Table of contents

### Properties

- [selfImage](VirtualAgentModel.md#selfimage)
- [selfStory](VirtualAgentModel.md#selfstory)
- [perceivedCapabilities](VirtualAgentModel.md#perceivedcapabilities)
- [roleUnderstanding](VirtualAgentModel.md#roleunderstanding)
- [currentGoals](VirtualAgentModel.md#currentgoals)
- [worldView](VirtualAgentModel.md#worldview)
- [selfAwareness](VirtualAgentModel.md#selfawareness)

## Properties

### selfImage

• **selfImage**: `Object`

Self-image: how the agent perceives its own character

#### Type declaration

| Name                     | Type                             |
| :----------------------- | :------------------------------- |
| `perceivedFacets`        | `CharacterFacets`                |
| `believedStrengths`      | `string`[]                       |
| `acknowledgedWeaknesses` | `string`[]                       |
| `perceivedDominantFacet` | `string` \| `number` \| `symbol` |

#### Defined in

[src/types.ts:79](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L79)

---

### selfStory

• **selfStory**: `string`

Self-narrative: the agent's story about itself

#### Defined in

[src/types.ts:87](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L87)

---

### perceivedCapabilities

• **perceivedCapabilities**: `string`[]

Capabilities the agent believes it has

#### Defined in

[src/types.ts:90](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L90)

---

### roleUnderstanding

• **roleUnderstanding**: `string`

Understanding of role and purpose

#### Defined in

[src/types.ts:93](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L93)

---

### currentGoals

• **currentGoals**: `string`[]

Goals and motivations

#### Defined in

[src/types.ts:96](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L96)

---

### worldView

• **worldView**: [`VirtualArenaModel`](VirtualArenaModel.md)

INVERTED: The world-view lives INSIDE the self-model

#### Defined in

[src/types.ts:99](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L99)

---

### selfAwareness

• **selfAwareness**: `Object`

Meta-awareness: knowing that Vi differs from Ai

#### Type declaration

| Name                | Type       |
| :------------------ | :--------- |
| `lastReflection`    | `number`   |
| `perceivedAccuracy` | `number`   |
| `activeQuestions`   | `string`[] |

#### Defined in

[src/types.ts:102](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L102)
