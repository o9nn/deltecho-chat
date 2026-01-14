[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / ParticipationResult

# Interface: ParticipationResult

Result of agent participation

## Table of contents

### Properties

- [response](ParticipationResult.md#response)
- [facetsActivated](ParticipationResult.md#facetsactivated)
- [emotionalShift](ParticipationResult.md#emotionalshift)
- [insightsGained](ParticipationResult.md#insightsgained)
- [socialUpdates](ParticipationResult.md#socialupdates)

## Properties

### response

• **response**: `string`

#### Defined in

[src/types.ts:171](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L171)

___

### facetsActivated

• **facetsActivated**: (`string` \| `number` \| `symbol`)[]

#### Defined in

[src/types.ts:172](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L172)

___

### emotionalShift

• **emotionalShift**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `valence` | `number` |
| `arousal` | `number` |

#### Defined in

[src/types.ts:173](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L173)

___

### insightsGained

• **insightsGained**: `string`[]

#### Defined in

[src/types.ts:174](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L174)

___

### socialUpdates

• **socialUpdates**: `Map`\<`string`, `SocialMemory`\>

#### Defined in

[src/types.ts:175](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L175)
