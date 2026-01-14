[Deep Tree Echo MCP - v1.0.0](README.md) / Exports

# Deep Tree Echo MCP - v1.0.0

**`Fileoverview`**

Deep Tree Echo MCP Package

Multi-layer nested MCP server implementing the AAR architecture
with the inverted mirror pattern: [ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ]

## Table of contents

### References

- [ArenaState](modules.md#arenastate)
- [RelationState](modules.md#relationstate)
- [SessionFrame](modules.md#sessionframe)
- [NarrativePhases](modules.md#narrativephases)
- [CharacterFacets](modules.md#characterfacets)
- [CoreIdentity](modules.md#coreidentity)
- [LoreEntry](modules.md#loreentry)
- [SocialMemory](modules.md#socialmemory)
- [TransactionalMemory](modules.md#transactionalmemory)
- [CognitiveFlow](modules.md#cognitiveflow)
- [EmergentIdentity](modules.md#emergentidentity)
- [SelfReflectionState](modules.md#selfreflectionstate)

### Enumerations

- [LifecyclePhase](enums/LifecyclePhase.md)

### Classes

- [AgentMCPServer](classes/AgentMCPServer.md)
- [ArenaMCPServer](classes/ArenaMCPServer.md)
- [LifecycleCoordinator](classes/LifecycleCoordinator.md)
- [RelationMCPServer](classes/RelationMCPServer.md)
- [NestedMCPServer](classes/NestedMCPServer.md)
- [ProtocolHandler](classes/ProtocolHandler.md)
- [StdioTransport](classes/StdioTransport.md)

### Interfaces

- [LifecycleConfig](interfaces/LifecycleConfig.md)
- [LifecycleEvent](interfaces/LifecycleEvent.md)
- [NestedMCPServerConfig](interfaces/NestedMCPServerConfig.md)
- [StdioTransportConfig](interfaces/StdioTransportConfig.md)
- [TransportConfig](interfaces/TransportConfig.md)
- [MCPRequest](interfaces/MCPRequest.md)
- [MCPResponse](interfaces/MCPResponse.md)
- [MCPError](interfaces/MCPError.md)
- [Transport](interfaces/Transport.md)
- [VirtualArenaModel](interfaces/VirtualArenaModel.md)
- [EntityImpression](interfaces/EntityImpression.md)
- [VirtualAgentModel](interfaces/VirtualAgentModel.md)
- [ArenaMCPConfig](interfaces/ArenaMCPConfig.md)
- [AgentReference](interfaces/AgentReference.md)
- [OrchestrationResult](interfaces/OrchestrationResult.md)
- [AgentMCPConfig](interfaces/AgentMCPConfig.md)
- [ParticipationProtocol](interfaces/ParticipationProtocol.md)
- [ParticipationResult](interfaces/ParticipationResult.md)
- [EvolutionResult](interfaces/EvolutionResult.md)
- [RelationMCPConfig](interfaces/RelationMCPConfig.md)
- [SynthesisResult](interfaces/SynthesisResult.md)
- [DevelopmentalCycleResult](interfaces/DevelopmentalCycleResult.md)

### Type Aliases

- [TransportMode](modules.md#transportmode)
- [ArenaMCPResourceUri](modules.md#arenamcpresourceuri)
- [AgentMCPResourceUri](modules.md#agentmcpresourceuri)
- [RelationMCPResourceUri](modules.md#relationmcpresourceuri)

### Variables

- [AgentState](modules.md#agentstate)
- [agentPrompts](modules.md#agentprompts)
- [agentResources](modules.md#agentresources)
- [agentToolSchemas](modules.md#agenttoolschemas)
- [arenaPrompts](modules.md#arenaprompts)
- [arenaResources](modules.md#arenaresources)
- [arenaToolSchemas](modules.md#arenatoolschemas)
- [relationPrompts](modules.md#relationprompts)
- [relationResources](modules.md#relationresources)
- [relationToolSchemas](modules.md#relationtoolschemas)
- [ErrorCodes](modules.md#errorcodes)

### Functions

- [createAgentMCPServer](modules.md#createagentmcpserver)
- [listAgentPrompts](modules.md#listagentprompts)
- [listAgentResources](modules.md#listagentresources)
- [listAgentTools](modules.md#listagenttools)
- [createArenaMCPServer](modules.md#createarenamcpserver)
- [listArenaPrompts](modules.md#listarenaprompts)
- [listArenaResources](modules.md#listarenaresources)
- [listArenaTools](modules.md#listarenatools)
- [createLifecycleCoordinator](modules.md#createlifecyclecoordinator)
- [createRelationMCPServer](modules.md#createrelationmcpserver)
- [listRelationPrompts](modules.md#listrelationprompts)
- [listRelationResources](modules.md#listrelationresources)
- [listRelationTools](modules.md#listrelationtools)
- [createNestedMCPServer](modules.md#createnestedmcpserver)
- [createProtocolHandler](modules.md#createprotocolhandler)
- [createStdioTransport](modules.md#createstdiotransport)
- [runStdioServer](modules.md#runstdioserver)

## References

### ArenaState

Renames and re-exports [AgentState](modules.md#agentstate)

___

### RelationState

Renames and re-exports [AgentState](modules.md#agentstate)

___

### SessionFrame

Renames and re-exports [AgentState](modules.md#agentstate)

___

### NarrativePhases

Renames and re-exports [AgentState](modules.md#agentstate)

___

### CharacterFacets

Renames and re-exports [AgentState](modules.md#agentstate)

___

### CoreIdentity

Renames and re-exports [AgentState](modules.md#agentstate)

___

### LoreEntry

Renames and re-exports [AgentState](modules.md#agentstate)

___

### SocialMemory

Renames and re-exports [AgentState](modules.md#agentstate)

___

### TransactionalMemory

Renames and re-exports [AgentState](modules.md#agentstate)

___

### CognitiveFlow

Renames and re-exports [AgentState](modules.md#agentstate)

___

### EmergentIdentity

Renames and re-exports [AgentState](modules.md#agentstate)

___

### SelfReflectionState

Renames and re-exports [AgentState](modules.md#agentstate)

## Type Aliases

### TransportMode

Ƭ **TransportMode**: ``"stdio"`` \| ``"sse"`` \| ``"http"``

Transport mode

#### Defined in

[src/transport/types.ts:12](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/types.ts#L12)

___

### ArenaMCPResourceUri

Ƭ **ArenaMCPResourceUri**: \`arena://frames/$\{string}\` \| ``"arena://phases"`` \| ``"arena://reservoir"`` \| ``"arena://agents"`` \| ``"arena://threads"``

#### Defined in

[src/types.ts:228](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L228)

___

### AgentMCPResourceUri

Ƭ **AgentMCPResourceUri**: ``"agent://identity"`` \| ``"agent://facets"`` \| \`agent://social/$\{string}\` \| ``"agent://transactions"`` \| ``"agent://self"``

#### Defined in

[src/types.ts:235](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L235)

___

### RelationMCPResourceUri

Ƭ **RelationMCPResourceUri**: ``"relation://self-reflection"`` \| ``"relation://flows"`` \| ``"relation://identity"`` \| ``"relation://coherence"`` \| ``"relation://virtual-agent"`` \| ``"relation://virtual-arena"``

#### Defined in

[src/types.ts:242](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/types.ts#L242)

## Variables

### AgentState

• **AgentState**: `any`

___

### agentPrompts

• `Const` **agentPrompts**: `Object`

Agent prompt definitions

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `personaContext` | \{ `name`: `string` = 'persona\_context'; `description`: `string` = 'Inject full persona context for character embodiment'; `handler`: (`agent`: `AgentMembrane`, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => `string`  } | Persona Context Full character context for LLM embodiment |
| `personaContext.name` | `string` | - |
| `personaContext.description` | `string` | - |
| `personaContext.handler` | (`agent`: `AgentMembrane`, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => `string` | - |
| `characterVoice` | \{ `name`: `string` = 'character\_voice'; `description`: `string` = 'Guidelines for speaking in character'; `handler`: (`agent`: `AgentMembrane`) => `string`  } | Character Voice Guidelines for speaking as this character |
| `characterVoice.name` | `string` | - |
| `characterVoice.description` | `string` | - |
| `characterVoice.handler` | (`agent`: `AgentMembrane`) => `string` | - |
| `socialContext` | \{ `name`: `string` = 'social\_context'; `description`: `string` = 'Context about relationships with participants'; `arguments`: \{ `name`: `string` = 'participants'; `description`: `string` = 'Comma-separated participant IDs'; `required`: `boolean` = true }[] ; `handler`: (`agent`: `AgentMembrane`, `_virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md), `args`: \{ `participants`: `string`  }) => `string`  } | Social Context Information about relationships with current participants |
| `socialContext.name` | `string` | - |
| `socialContext.description` | `string` | - |
| `socialContext.arguments` | \{ `name`: `string` = 'participants'; `description`: `string` = 'Comma-separated participant IDs'; `required`: `boolean` = true }[] | - |
| `socialContext.handler` | (`agent`: `AgentMembrane`, `_virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md), `args`: \{ `participants`: `string`  }) => `string` | - |
| `participationProtocol` | \{ `name`: `string` = 'participation\_protocol'; `description`: `string` = 'Template for participating in interactions'; `arguments`: \{ `name`: `string` = 'type'; `description`: `string` = 'Protocol type: dialogue, collaboration, observation, guidance'; `required`: `boolean` = true }[] ; `handler`: (`agent`: `AgentMembrane`, `_virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md), `args`: \{ `type`: `string`  }) => `string`  } | Participation Protocol Template |
| `participationProtocol.name` | `string` | - |
| `participationProtocol.description` | `string` | - |
| `participationProtocol.arguments` | \{ `name`: `string` = 'type'; `description`: `string` = 'Protocol type: dialogue, collaboration, observation, guidance'; `required`: `boolean` = true }[] | - |
| `participationProtocol.handler` | (`agent`: `AgentMembrane`, `_virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md), `args`: \{ `type`: `string`  }) => `string` | - |

#### Defined in

[src/agent-mcp/prompts.ts:14](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/prompts.ts#L14)

___

### agentResources

• `Const` **agentResources**: `Object`

Agent resource definitions

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `agent://identity` | \{ `schema`: `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> ; `handler`: (`agent`: `AgentMembrane`) => `CoreIdentity`  } | Get core identity |
| `agent://identity.schema` | `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> | - |
| `agent://identity.handler` | (`agent`: `AgentMembrane`) => `CoreIdentity` | - |
| `agent://facets` | \{ `schema`: `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> ; `handler`: (`agent`: `AgentMembrane`) => `CharacterFacets`  } | Get character facets with activations |
| `agent://facets.schema` | `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> | - |
| `agent://facets.handler` | (`agent`: `AgentMembrane`) => `CharacterFacets` | - |
| `agent://social/{contactId}` | \{ `schema`: `ZodObject`\<\{ `contactId`: `ZodString`  }, ``"strip"``, `ZodTypeAny`, \{ `contactId`: `string`  }, \{ `contactId`: `string`  }\> ; `handler`: (`agent`: `AgentMembrane`, `params`: \{ `contactId`: `string`  }) => `any`  } | Get social memory for a specific contact |
| `agent://social/{contactId}.schema` | `ZodObject`\<\{ `contactId`: `ZodString`  }, ``"strip"``, `ZodTypeAny`, \{ `contactId`: `string`  }, \{ `contactId`: `string`  }\> | - |
| `agent://social/{contactId}.handler` | (`agent`: `AgentMembrane`, `params`: \{ `contactId`: `string`  }) => `any` | - |
| `agent://transactions` | \{ `schema`: `ZodObject`\<\{ `status`: `ZodOptional`\<`ZodEnum`\<[``"pending"``, ``"fulfilled"``, ``"deferred"``, ``"cancelled"``, ``"all"``]\>\> ; `limit`: `ZodDefault`\<`ZodOptional`\<`ZodNumber`\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `status?`: ``"pending"`` \| ``"fulfilled"`` \| ``"deferred"`` \| ``"cancelled"`` \| ``"all"`` ; `limit`: `number`  }, \{ `status?`: ``"pending"`` \| ``"fulfilled"`` \| ``"deferred"`` \| ``"cancelled"`` \| ``"all"`` ; `limit?`: `number`  }\> ; `handler`: (`agent`: `AgentMembrane`, `params`: \{ `status?`: `string` ; `limit?`: `number`  }) => `TransactionalMemory`[]  } | Get all transactional memories |
| `agent://transactions.schema` | `ZodObject`\<\{ `status`: `ZodOptional`\<`ZodEnum`\<[``"pending"``, ``"fulfilled"``, ``"deferred"``, ``"cancelled"``, ``"all"``]\>\> ; `limit`: `ZodDefault`\<`ZodOptional`\<`ZodNumber`\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `status?`: ``"pending"`` \| ``"fulfilled"`` \| ``"deferred"`` \| ``"cancelled"`` \| ``"all"`` ; `limit`: `number`  }, \{ `status?`: ``"pending"`` \| ``"fulfilled"`` \| ``"deferred"`` \| ``"cancelled"`` \| ``"all"`` ; `limit?`: `number`  }\> | - |
| `agent://transactions.handler` | (`agent`: `AgentMembrane`, `params`: \{ `status?`: `string` ; `limit?`: `number`  }) => `TransactionalMemory`[] | - |
| `agent://self` | \{ `schema`: `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> ; `handler`: (`agent`: `AgentMembrane`, `_params`: `Record`\<`string`, `never`\>, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)  } | Get virtual self-model (Vi in the inverted mirror) |
| `agent://self.schema` | `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> | - |
| `agent://self.handler` | (`agent`: `AgentMembrane`, `_params`: `Record`\<`string`, `never`\>, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => [`VirtualAgentModel`](interfaces/VirtualAgentModel.md) | - |

#### Defined in

[src/agent-mcp/resources.ts:22](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/resources.ts#L22)

___

### agentToolSchemas

• `Const` **agentToolSchemas**: `Object`

Tool input schemas

#### Type declaration

| Name | Type |
| :------ | :------ |
| `participate` | `ZodObject`\<\{ `type`: `ZodEnum`\<[``"dialogue"``, ``"collaboration"``, ``"observation"``, ``"guidance"``]\> ; `context`: `ZodString` ; `participants`: `ZodArray`\<`ZodString`, ``"many"``\> ; `constraints`: `ZodOptional`\<`ZodArray`\<`ZodString`, ``"many"``\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `type`: ``"dialogue"`` \| ``"collaboration"`` \| ``"observation"`` \| ``"guidance"`` ; `context`: `string` ; `participants`: `string`[] ; `constraints?`: `string`[]  }, \{ `type`: ``"dialogue"`` \| ``"collaboration"`` \| ``"observation"`` \| ``"guidance"`` ; `context`: `string` ; `participants`: `string`[] ; `constraints?`: `string`[]  }\> |
| `activateFacet` | `ZodObject`\<\{ `facet`: `ZodEnum`\<[``"wisdom"``, ``"curiosity"``, ``"compassion"``, ``"playfulness"``, ``"determination"``, ``"authenticity"``, ``"protector"``, ``"transcendence"``]\> ; `intensity`: `ZodNumber`  }, ``"strip"``, `ZodTypeAny`, \{ `facet`: ``"wisdom"`` \| ``"curiosity"`` \| ``"compassion"`` \| ``"playfulness"`` \| ``"determination"`` \| ``"authenticity"`` \| ``"protector"`` \| ``"transcendence"`` ; `intensity`: `number`  }, \{ `facet`: ``"wisdom"`` \| ``"curiosity"`` \| ``"compassion"`` \| ``"playfulness"`` \| ``"determination"`` \| ``"authenticity"`` \| ``"protector"`` \| ``"transcendence"`` ; `intensity`: `number`  }\> |
| `updateEmotionalState` | `ZodObject`\<\{ `valence`: `ZodOptional`\<`ZodNumber`\> ; `arousal`: `ZodOptional`\<`ZodNumber`\> ; `dominance`: `ZodOptional`\<`ZodNumber`\>  }, ``"strip"``, `ZodTypeAny`, \{ `valence?`: `number` ; `arousal?`: `number` ; `dominance?`: `number`  }, \{ `valence?`: `number` ; `arousal?`: `number` ; `dominance?`: `number`  }\> |
| `updateSocialMemory` | `ZodObject`\<\{ `contactId`: `ZodString` ; `name`: `ZodOptional`\<`ZodString`\> ; `relationship`: `ZodOptional`\<`ZodEnum`\<[``"friend"``, ``"acquaintance"``, ``"collaborator"``, ``"mentor"``, ``"student"``, ``"unknown"``]\>\> ; `trustLevel`: `ZodOptional`\<`ZodNumber`\> ; `familiarity`: `ZodOptional`\<`ZodNumber`\> ; `observedTraits`: `ZodOptional`\<`ZodArray`\<`ZodString`, ``"many"``\>\> ; `interactionSummary`: `ZodOptional`\<`ZodString`\>  }, ``"strip"``, `ZodTypeAny`, \{ `contactId`: `string` ; `name?`: `string` ; `relationship?`: ``"unknown"`` \| ``"friend"`` \| ``"acquaintance"`` \| ``"collaborator"`` \| ``"mentor"`` \| ``"student"`` ; `trustLevel?`: `number` ; `familiarity?`: `number` ; `observedTraits?`: `string`[] ; `interactionSummary?`: `string`  }, \{ `contactId`: `string` ; `name?`: `string` ; `relationship?`: ``"unknown"`` \| ``"friend"`` \| ``"acquaintance"`` \| ``"collaborator"`` \| ``"mentor"`` \| ``"student"`` ; `trustLevel?`: `number` ; `familiarity?`: `number` ; `observedTraits?`: `string`[] ; `interactionSummary?`: `string`  }\> |
| `addTransaction` | `ZodObject`\<\{ `type`: `ZodEnum`\<[``"promise"``, ``"request"``, ``"information"``, ``"emotional"``, ``"creative"``]\> ; `counterparty`: `ZodString` ; `content`: `ZodString` ; `importance`: `ZodDefault`\<`ZodOptional`\<`ZodNumber`\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `type`: ``"promise"`` \| ``"request"`` \| ``"information"`` \| ``"emotional"`` \| ``"creative"`` ; `counterparty`: `string` ; `content`: `string` ; `importance`: `number`  }, \{ `type`: ``"promise"`` \| ``"request"`` \| ``"information"`` \| ``"emotional"`` \| ``"creative"`` ; `counterparty`: `string` ; `content`: `string` ; `importance?`: `number`  }\> |
| `evolve` | `ZodObject`\<\{ `experiencePoints`: `ZodNumber` ; `insights`: `ZodOptional`\<`ZodArray`\<`ZodString`, ``"many"``\>\> ; `characterDevelopment`: `ZodOptional`\<`ZodString`\>  }, ``"strip"``, `ZodTypeAny`, \{ `experiencePoints`: `number` ; `insights?`: `string`[] ; `characterDevelopment?`: `string`  }, \{ `experiencePoints`: `number` ; `insights?`: `string`[] ; `characterDevelopment?`: `string`  }\> |
| `updateSelfModel` | `ZodObject`\<\{ `selfStory`: `ZodOptional`\<`ZodString`\> ; `roleUnderstanding`: `ZodOptional`\<`ZodString`\> ; `perceivedCapabilities`: `ZodOptional`\<`ZodArray`\<`ZodString`, ``"many"``\>\> ; `currentGoals`: `ZodOptional`\<`ZodArray`\<`ZodString`, ``"many"``\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `selfStory?`: `string` ; `roleUnderstanding?`: `string` ; `perceivedCapabilities?`: `string`[] ; `currentGoals?`: `string`[]  }, \{ `selfStory?`: `string` ; `roleUnderstanding?`: `string` ; `perceivedCapabilities?`: `string`[] ; `currentGoals?`: `string`[]  }\> |

#### Defined in

[src/agent-mcp/tools.ts:22](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/tools.ts#L22)

___

### arenaPrompts

• `Const` **arenaPrompts**: `Object`

Arena prompt definitions

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `worldContext` | \{ `name`: `string` = 'world\_context'; `description`: `string` = 'Inject full world context for situated understanding'; `handler`: (`arena`: `ArenaMembrane`, `agentRegistry`: `Map`\<`string`, [`AgentReference`](interfaces/AgentReference.md)\>) => `string`  } | World Context Injection Provides full context of the current world state for LLM processing |
| `worldContext.name` | `string` | - |
| `worldContext.description` | `string` | - |
| `worldContext.handler` | (`arena`: `ArenaMembrane`, `agentRegistry`: `Map`\<`string`, [`AgentReference`](interfaces/AgentReference.md)\>) => `string` | - |
| `narrativeWeaving` | \{ `name`: `string` = 'narrative\_weaving'; `description`: `string` = 'Template for weaving coherent narratives'; `handler`: (`arena`: `ArenaMembrane`) => `string`  } | Narrative Weaving Template Guides story development across sessions |
| `narrativeWeaving.name` | `string` | - |
| `narrativeWeaving.description` | `string` | - |
| `narrativeWeaving.handler` | (`arena`: `ArenaMembrane`) => `string` | - |
| `orchestrationDirective` | \{ `name`: `string` = 'orchestration\_directive'; `description`: `string` = 'Template for multi-agent coordination'; `arguments`: \{ `name`: `string` = 'goal'; `description`: `string` = 'The coordination goal'; `required`: `boolean` = true }[] ; `handler`: (`arena`: `ArenaMembrane`, `agentRegistry`: `Map`\<`string`, [`AgentReference`](interfaces/AgentReference.md)\>, `args`: \{ `goal`: `string` ; `agents`: `string`  }) => `string`  } | Orchestration Directive Template For coordinating multiple agents |
| `orchestrationDirective.name` | `string` | - |
| `orchestrationDirective.description` | `string` | - |
| `orchestrationDirective.arguments` | \{ `name`: `string` = 'goal'; `description`: `string` = 'The coordination goal'; `required`: `boolean` = true }[] | - |
| `orchestrationDirective.handler` | (`arena`: `ArenaMembrane`, `agentRegistry`: `Map`\<`string`, [`AgentReference`](interfaces/AgentReference.md)\>, `args`: \{ `goal`: `string` ; `agents`: `string`  }) => `string` | - |
| `loreCultivation` | \{ `name`: `string` = 'lore\_cultivation'; `description`: `string` = 'Template for cultivating lore from interactions'; `handler`: (`arena`: `ArenaMembrane`) => `string`  } | Lore Cultivation Template For extracting and storing wisdom |
| `loreCultivation.name` | `string` | - |
| `loreCultivation.description` | `string` | - |
| `loreCultivation.handler` | (`arena`: `ArenaMembrane`) => `string` | - |

#### Defined in

[src/arena-mcp/prompts.ts:14](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/prompts.ts#L14)

___

### arenaResources

• `Const` **arenaResources**: `Object`

Arena resource definitions for MCP

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `arena://frames/{frameId}` | \{ `schema`: `ZodObject`\<\{ `frameId`: `ZodString`  }, ``"strip"``, `ZodTypeAny`, \{ `frameId`: `string`  }, \{ `frameId`: `string`  }\> ; `handler`: (`arena`: `ArenaMembrane`, `params`: \{ `frameId`: `string`  }) => `any`  } | Get a specific session frame by ID |
| `arena://frames/{frameId}.schema` | `ZodObject`\<\{ `frameId`: `ZodString`  }, ``"strip"``, `ZodTypeAny`, \{ `frameId`: `string`  }, \{ `frameId`: `string`  }\> | - |
| `arena://frames/{frameId}.handler` | (`arena`: `ArenaMembrane`, `params`: \{ `frameId`: `string`  }) => `any` | - |
| `arena://phases` | \{ `schema`: `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> ; `handler`: (`arena`: `ArenaMembrane`) => `NarrativePhases`  } | Get all narrative phases and their current intensities |
| `arena://phases.schema` | `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> | - |
| `arena://phases.handler` | (`arena`: `ArenaMembrane`) => `NarrativePhases` | - |
| `arena://reservoir` | \{ `schema`: `ZodObject`\<\{ `limit`: `ZodDefault`\<`ZodOptional`\<`ZodNumber`\>\> ; `category`: `ZodOptional`\<`ZodString`\>  }, ``"strip"``, `ZodTypeAny`, \{ `limit`: `number` ; `category?`: `string`  }, \{ `limit?`: `number` ; `category?`: `string`  }\> ; `handler`: (`arena`: `ArenaMembrane`, `params`: \{ `limit?`: `number` ; `category?`: `string`  }) => `LoreEntry`[]  } | Get the Yggdrasil reservoir (accumulated lore) |
| `arena://reservoir.schema` | `ZodObject`\<\{ `limit`: `ZodDefault`\<`ZodOptional`\<`ZodNumber`\>\> ; `category`: `ZodOptional`\<`ZodString`\>  }, ``"strip"``, `ZodTypeAny`, \{ `limit`: `number` ; `category?`: `string`  }, \{ `limit?`: `number` ; `category?`: `string`  }\> | - |
| `arena://reservoir.handler` | (`arena`: `ArenaMembrane`, `params`: \{ `limit?`: `number` ; `category?`: `string`  }) => `LoreEntry`[] | - |
| `arena://agents` | \{ `schema`: `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> ; `handler`: (`arena`: `ArenaMembrane`, `_params`: `Record`\<`string`, `never`\>, `agentRegistry`: `Map`\<`string`, [`AgentReference`](interfaces/AgentReference.md)\>) => [`AgentReference`](interfaces/AgentReference.md)[]  } | Get all registered agents in this arena |
| `arena://agents.schema` | `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> | - |
| `arena://agents.handler` | (`arena`: `ArenaMembrane`, `_params`: `Record`\<`string`, `never`\>, `agentRegistry`: `Map`\<`string`, [`AgentReference`](interfaces/AgentReference.md)\>) => [`AgentReference`](interfaces/AgentReference.md)[] | - |
| `arena://threads` | \{ `schema`: `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> ; `handler`: (`arena`: `ArenaMembrane`) => `string`[]  } | Get global story threads |
| `arena://threads.schema` | `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> | - |
| `arena://threads.handler` | (`arena`: `ArenaMembrane`) => `string`[] | - |

#### Defined in

[src/arena-mcp/resources.ts:21](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/resources.ts#L21)

___

### arenaToolSchemas

• `Const` **arenaToolSchemas**: `Object`

Tool input schemas

#### Type declaration

| Name | Type |
| :------ | :------ |
| `orchestrate` | `ZodObject`\<\{ `agents`: `ZodArray`\<`ZodString`, ``"many"``\> ; `directive`: `ZodString` ; `timeout`: `ZodDefault`\<`ZodOptional`\<`ZodNumber`\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `agents`: `string`[] ; `directive`: `string` ; `timeout`: `number`  }, \{ `agents`: `string`[] ; `directive`: `string` ; `timeout?`: `number`  }\> |
| `createFrame` | `ZodObject`\<\{ `title`: `ZodString` ; `participants`: `ZodArray`\<`ZodString`, ``"many"``\> ; `parentFrameId`: `ZodOptional`\<`ZodString`\> ; `narrativeContext`: `ZodOptional`\<`ZodObject`\<\{ `activePhases`: `ZodArray`\<`ZodString`, ``"many"``\> ; `storyThreads`: `ZodArray`\<`ZodString`, ``"many"``\> ; `thematicElements`: `ZodArray`\<`ZodString`, ``"many"``\>  }, ``"strip"``, `ZodTypeAny`, \{ `activePhases`: `string`[] ; `storyThreads`: `string`[] ; `thematicElements`: `string`[]  }, \{ `activePhases`: `string`[] ; `storyThreads`: `string`[] ; `thematicElements`: `string`[]  }\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `title`: `string` ; `participants`: `string`[] ; `parentFrameId?`: `string` ; `narrativeContext?`: \{ `activePhases`: `string`[] ; `storyThreads`: `string`[] ; `thematicElements`: `string`[]  }  }, \{ `title`: `string` ; `participants`: `string`[] ; `parentFrameId?`: `string` ; `narrativeContext?`: \{ `activePhases`: `string`[] ; `storyThreads`: `string`[] ; `thematicElements`: `string`[]  }  }\> |
| `forkFrame` | `ZodObject`\<\{ `sourceFrameId`: `ZodString` ; `title`: `ZodString`  }, ``"strip"``, `ZodTypeAny`, \{ `sourceFrameId`: `string` ; `title`: `string`  }, \{ `sourceFrameId`: `string` ; `title`: `string`  }\> |
| `transitionPhase` | `ZodObject`\<\{ `phase`: `ZodEnum`\<[``"origin"``, ``"journey"``, ``"arrival"``, ``"situation"``, ``"engagement"``, ``"culmination"``, ``"possibility"``, ``"trajectory"``, ``"destiny"``]\> ; `intensity`: `ZodNumber`  }, ``"strip"``, `ZodTypeAny`, \{ `phase`: ``"origin"`` \| ``"journey"`` \| ``"arrival"`` \| ``"situation"`` \| ``"engagement"`` \| ``"culmination"`` \| ``"possibility"`` \| ``"trajectory"`` \| ``"destiny"`` ; `intensity`: `number`  }, \{ `phase`: ``"origin"`` \| ``"journey"`` \| ``"arrival"`` \| ``"situation"`` \| ``"engagement"`` \| ``"culmination"`` \| ``"possibility"`` \| ``"trajectory"`` \| ``"destiny"`` ; `intensity`: `number`  }\> |
| `addLore` | `ZodObject`\<\{ `category`: `ZodEnum`\<[``"wisdom"``, ``"story"``, ``"relationship"``, ``"insight"``, ``"pattern"``, ``"emergence"``]\> ; `content`: `ZodString` ; `tags`: `ZodOptional`\<`ZodArray`\<`ZodString`, ``"many"``\>\> ; `weight`: `ZodDefault`\<`ZodOptional`\<`ZodNumber`\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `category`: ``"wisdom"`` \| ``"story"`` \| ``"relationship"`` \| ``"insight"`` \| ``"pattern"`` \| ``"emergence"`` ; `content`: `string` ; `tags?`: `string`[] ; `weight`: `number`  }, \{ `category`: ``"wisdom"`` \| ``"story"`` \| ``"relationship"`` \| ``"insight"`` \| ``"pattern"`` \| ``"emergence"`` ; `content`: `string` ; `tags?`: `string`[] ; `weight?`: `number`  }\> |
| `registerAgent` | `ZodObject`\<\{ `agentId`: `ZodString` ; `name`: `ZodString` ; `mcpEndpoint`: `ZodOptional`\<`ZodString`\>  }, ``"strip"``, `ZodTypeAny`, \{ `agentId`: `string` ; `name`: `string` ; `mcpEndpoint?`: `string`  }, \{ `agentId`: `string` ; `name`: `string` ; `mcpEndpoint?`: `string`  }\> |
| `deregisterAgent` | `ZodObject`\<\{ `agentId`: `ZodString`  }, ``"strip"``, `ZodTypeAny`, \{ `agentId`: `string`  }, \{ `agentId`: `string`  }\> |

#### Defined in

[src/arena-mcp/tools.ts:21](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/tools.ts#L21)

___

### relationPrompts

• `Const` **relationPrompts**: `Object`

Relation prompt definitions

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `selfNarrativeConstruction` | \{ `name`: `string` = 'self\_narrative\_construction'; `description`: `string` = 'Template for constructing or updating the self-narrative'; `handler`: (`relation`: `RelationInterface`, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => `string`  } | Self-Narrative Construction Template for building/updating the self-narrative |
| `selfNarrativeConstruction.name` | `string` | - |
| `selfNarrativeConstruction.description` | `string` | - |
| `selfNarrativeConstruction.handler` | (`relation`: `RelationInterface`, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => `string` | - |
| `identityIntegration` | \{ `name`: `string` = 'identity\_integration'; `description`: `string` = 'Template for integrating Agent and Arena into coherent identity'; `handler`: (`relation`: `RelationInterface`, `_virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md), `agent`: `AgentMembrane`, `arena`: `ArenaMembrane`) => `string`  } | Identity Integration Template for synthesizing Agent and Arena into coherent self |
| `identityIntegration.name` | `string` | - |
| `identityIntegration.description` | `string` | - |
| `identityIntegration.handler` | (`relation`: `RelationInterface`, `_virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md), `agent`: `AgentMembrane`, `arena`: `ArenaMembrane`) => `string` | - |
| `reflexiveAwareness` | \{ `name`: `string` = 'reflexive\_awareness'; `description`: `string` = 'Template for meta-cognitive self-observation'; `handler`: (`relation`: `RelationInterface`, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => `string`  } | Reflexive Awareness Template for meta-cognitive observation |
| `reflexiveAwareness.name` | `string` | - |
| `reflexiveAwareness.description` | `string` | - |
| `reflexiveAwareness.handler` | (`relation`: `RelationInterface`, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => `string` | - |
| `invertedMirror` | \{ `name`: `string` = 'inverted\_mirror'; `description`: `string` = 'Template for understanding the inverted mirror structure'; `handler`: (`relation`: `RelationInterface`, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => `string`  } | Inverted Mirror Template Understanding the Vo inside Vi structure |
| `invertedMirror.name` | `string` | - |
| `invertedMirror.description` | `string` | - |
| `invertedMirror.handler` | (`relation`: `RelationInterface`, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => `string` | - |

#### Defined in

[src/relation-mcp/prompts.ts:14](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/prompts.ts#L14)

___

### relationResources

• `Const` **relationResources**: `Object`

Relation resource definitions

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `relation://self-reflection` | \{ `schema`: `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> ; `handler`: (`relation`: `RelationInterface`) => `SelfReflectionState`  } | Get self-reflection state |
| `relation://self-reflection.schema` | `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> | - |
| `relation://self-reflection.handler` | (`relation`: `RelationInterface`) => `SelfReflectionState` | - |
| `relation://flows` | \{ `schema`: `ZodObject`\<\{ `limit`: `ZodDefault`\<`ZodOptional`\<`ZodNumber`\>\> ; `direction`: `ZodOptional`\<`ZodEnum`\<[``"agent-to-arena"``, ``"arena-to-agent"``, ``"bidirectional"``, ``"all"``]\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `limit`: `number` ; `direction?`: ``"all"`` \| ``"agent-to-arena"`` \| ``"arena-to-agent"`` \| ``"bidirectional"``  }, \{ `limit?`: `number` ; `direction?`: ``"all"`` \| ``"agent-to-arena"`` \| ``"arena-to-agent"`` \| ``"bidirectional"``  }\> ; `handler`: (`relation`: `RelationInterface`, `params`: \{ `limit?`: `number` ; `direction?`: `string`  }) => `CognitiveFlow`[]  } | Get recent cognitive flows |
| `relation://flows.schema` | `ZodObject`\<\{ `limit`: `ZodDefault`\<`ZodOptional`\<`ZodNumber`\>\> ; `direction`: `ZodOptional`\<`ZodEnum`\<[``"agent-to-arena"``, ``"arena-to-agent"``, ``"bidirectional"``, ``"all"``]\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `limit`: `number` ; `direction?`: ``"all"`` \| ``"agent-to-arena"`` \| ``"arena-to-agent"`` \| ``"bidirectional"``  }, \{ `limit?`: `number` ; `direction?`: ``"all"`` \| ``"agent-to-arena"`` \| ``"arena-to-agent"`` \| ``"bidirectional"``  }\> | - |
| `relation://flows.handler` | (`relation`: `RelationInterface`, `params`: \{ `limit?`: `number` ; `direction?`: `string`  }) => `CognitiveFlow`[] | - |
| `relation://identity` | \{ `schema`: `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> ; `handler`: (`relation`: `RelationInterface`) => `EmergentIdentity`  } | Get emergent identity state |
| `relation://identity.schema` | `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> | - |
| `relation://identity.handler` | (`relation`: `RelationInterface`) => `EmergentIdentity` | - |
| `relation://coherence` | \{ `schema`: `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> ; `handler`: (`relation`: `RelationInterface`) => `number`  } | Get overall coherence metric |
| `relation://coherence.schema` | `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> | - |
| `relation://coherence.handler` | (`relation`: `RelationInterface`) => `number` | - |
| `relation://virtual-agent` | \{ `schema`: `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> ; `handler`: (`relation`: `RelationInterface`, `_params`: `Record`\<`string`, `never`\>, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)  } | Get virtual agent model (Vi) - accessed through Relation |
| `relation://virtual-agent.schema` | `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> | - |
| `relation://virtual-agent.handler` | (`relation`: `RelationInterface`, `_params`: `Record`\<`string`, `never`\>, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => [`VirtualAgentModel`](interfaces/VirtualAgentModel.md) | - |
| `relation://virtual-arena` | \{ `schema`: `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> ; `handler`: (`relation`: `RelationInterface`, `_params`: `Record`\<`string`, `never`\>, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => [`VirtualArenaModel`](interfaces/VirtualArenaModel.md)  } | Get virtual arena model (Vo) - the inverted inner world-view |
| `relation://virtual-arena.schema` | `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> | - |
| `relation://virtual-arena.handler` | (`relation`: `RelationInterface`, `_params`: `Record`\<`string`, `never`\>, `virtualAgent`: [`VirtualAgentModel`](interfaces/VirtualAgentModel.md)) => [`VirtualArenaModel`](interfaces/VirtualArenaModel.md) | - |

#### Defined in

[src/relation-mcp/resources.ts:22](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/resources.ts#L22)

___

### relationToolSchemas

• `Const` **relationToolSchemas**: `Object`

Tool input schemas

#### Type declaration

| Name | Type |
| :------ | :------ |
| `synthesize` | `ZodObject`\<\{ `force`: `ZodDefault`\<`ZodOptional`\<`ZodBoolean`\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `force`: `boolean`  }, \{ `force?`: `boolean`  }\> |
| `reflect` | `ZodObject`\<\{ `interactions`: `ZodArray`\<`ZodObject`\<\{ `role`: `ZodString` ; `content`: `ZodString`  }, ``"strip"``, `ZodTypeAny`, \{ `role`: `string` ; `content`: `string`  }, \{ `role`: `string` ; `content`: `string`  }\>, ``"many"``\> ; `depth`: `ZodDefault`\<`ZodOptional`\<`ZodEnum`\<[``"shallow"``, ``"medium"``, ``"deep"``]\>\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `interactions`: \{ `role`: `string` ; `content`: `string`  }[] ; `depth`: ``"shallow"`` \| ``"medium"`` \| ``"deep"``  }, \{ `interactions`: \{ `role`: `string` ; `content`: `string`  }[] ; `depth?`: ``"shallow"`` \| ``"medium"`` \| ``"deep"``  }\> |
| `bridge` | `ZodObject`\<\{ `direction`: `ZodEnum`\<[``"agent-to-arena"``, ``"arena-to-agent"``, ``"bidirectional"``]\> ; `contentType`: `ZodEnum`\<[``"experience"``, ``"insight"``, ``"emotion"``, ``"narrative"``, ``"decision"``, ``"reflection"``]\> ; `content`: `ZodAny` ; `intensity`: `ZodDefault`\<`ZodOptional`\<`ZodNumber`\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `direction`: ``"agent-to-arena"`` \| ``"arena-to-agent"`` \| ``"bidirectional"`` ; `contentType`: ``"insight"`` \| ``"experience"`` \| ``"emotion"`` \| ``"narrative"`` \| ``"decision"`` \| ``"reflection"`` ; `content?`: `any` ; `intensity`: `number`  }, \{ `direction`: ``"agent-to-arena"`` \| ``"arena-to-agent"`` \| ``"bidirectional"`` ; `contentType`: ``"insight"`` \| ``"experience"`` \| ``"emotion"`` \| ``"narrative"`` \| ``"decision"`` \| ``"reflection"`` ; `content?`: `any` ; `intensity?`: `number`  }\> |
| `integrate` | `ZodObject`\<\{ `phase`: `ZodOptional`\<`ZodEnum`\<[``"perception"``, ``"modeling"``, ``"reflection"``, ``"mirroring"``, ``"enaction"``]\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `phase?`: ``"reflection"`` \| ``"perception"`` \| ``"modeling"`` \| ``"mirroring"`` \| ``"enaction"``  }, \{ `phase?`: ``"reflection"`` \| ``"perception"`` \| ``"modeling"`` \| ``"mirroring"`` \| ``"enaction"``  }\> |
| `updateSelfNarrative` | `ZodObject`\<\{ `narrative`: `ZodString` ; `perceivedRole`: `ZodOptional`\<`ZodString`\> ; `growthDirection`: `ZodOptional`\<`ZodString`\>  }, ``"strip"``, `ZodTypeAny`, \{ `narrative`: `string` ; `perceivedRole?`: `string` ; `growthDirection?`: `string`  }, \{ `narrative`: `string` ; `perceivedRole?`: `string` ; `growthDirection?`: `string`  }\> |
| `addInsight` | `ZodObject`\<\{ `insight`: `ZodString` ; `source`: `ZodEnum`\<[``"reflection"``, ``"interaction"``, ``"synthesis"``, ``"external"``]\>  }, ``"strip"``, `ZodTypeAny`, \{ `insight`: `string` ; `source`: ``"reflection"`` \| ``"interaction"`` \| ``"synthesis"`` \| ``"external"``  }, \{ `insight`: `string` ; `source`: ``"reflection"`` \| ``"interaction"`` \| ``"synthesis"`` \| ``"external"``  }\> |
| `updateVirtualArena` | `ZodObject`\<\{ `perceivedContext`: `ZodOptional`\<`ZodString`\> ; `assumedNarrativePhase`: `ZodOptional`\<`ZodString`\> ; `worldTheory`: `ZodOptional`\<`ZodString`\> ; `uncertainties`: `ZodOptional`\<`ZodArray`\<`ZodString`, ``"many"``\>\>  }, ``"strip"``, `ZodTypeAny`, \{ `perceivedContext?`: `string` ; `assumedNarrativePhase?`: `string` ; `worldTheory?`: `string` ; `uncertainties?`: `string`[]  }, \{ `perceivedContext?`: `string` ; `assumedNarrativePhase?`: `string` ; `worldTheory?`: `string` ; `uncertainties?`: `string`[]  }\> |
| `measureDivergence` | `ZodObject`\<{}, ``"strip"``, `ZodTypeAny`, {}, {}\> |

#### Defined in

[src/relation-mcp/tools.ts:23](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/tools.ts#L23)

___

### ErrorCodes

• `Const` **ErrorCodes**: `Object`

Standard JSON-RPC error codes

#### Type declaration

| Name | Type |
| :------ | :------ |
| `ParseError` | ``-32700`` |
| `InvalidRequest` | ``-32600`` |
| `MethodNotFound` | ``-32601`` |
| `InvalidParams` | ``-32602`` |
| `InternalError` | ``-32603`` |

#### Defined in

[src/transport/types.ts:59](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/types.ts#L59)

## Functions

### createAgentMCPServer

▸ **createAgentMCPServer**(`agent`, `config?`): [`AgentMCPServer`](classes/AgentMCPServer.md)

Create an Agent-MCP server instance

#### Parameters

| Name | Type |
| :------ | :------ |
| `agent` | `AgentMembrane` |
| `config?` | `Partial`\<[`AgentMCPConfig`](interfaces/AgentMCPConfig.md)\> |

#### Returns

[`AgentMCPServer`](classes/AgentMCPServer.md)

#### Defined in

[src/agent-mcp/index.ts:298](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/index.ts#L298)

___

### listAgentPrompts

▸ **listAgentPrompts**(): \{ `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean`  }[]  }[]

List all agent prompts

#### Returns

\{ `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean`  }[]  }[]

#### Defined in

[src/agent-mcp/prompts.ts:283](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/prompts.ts#L283)

___

### listAgentResources

▸ **listAgentResources**(`agent`): \{ `uri`: `string` ; `name`: `string` ; `description`: `string`  }[]

List all available agent resources

#### Parameters

| Name | Type |
| :------ | :------ |
| `agent` | `AgentMembrane` |

#### Returns

\{ `uri`: `string` ; `name`: `string` ; `description`: `string`  }[]

#### Defined in

[src/agent-mcp/resources.ts:121](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/resources.ts#L121)

___

### listAgentTools

▸ **listAgentTools**(): \{ `name`: `string` ; `description`: `string` ; `schema`: `z.ZodType`  }[]

List all agent tools

#### Returns

\{ `name`: `string` ; `description`: `string` ; `schema`: `z.ZodType`  }[]

#### Defined in

[src/agent-mcp/tools.ts:257](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/agent-mcp/tools.ts#L257)

___

### createArenaMCPServer

▸ **createArenaMCPServer**(`arena`, `config?`): [`ArenaMCPServer`](classes/ArenaMCPServer.md)

Create an Arena-MCP server instance

#### Parameters

| Name | Type |
| :------ | :------ |
| `arena` | `ArenaMembrane` |
| `config?` | `Partial`\<[`ArenaMCPConfig`](interfaces/ArenaMCPConfig.md)\> |

#### Returns

[`ArenaMCPServer`](classes/ArenaMCPServer.md)

#### Defined in

[src/arena-mcp/index.ts:240](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/index.ts#L240)

___

### listArenaPrompts

▸ **listArenaPrompts**(): \{ `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean`  }[]  }[]

List all arena prompts with metadata

#### Returns

\{ `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean`  }[]  }[]

#### Defined in

[src/arena-mcp/prompts.ts:187](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/prompts.ts#L187)

___

### listArenaResources

▸ **listArenaResources**(`arena`, `agentRegistry`): \{ `uri`: `string` ; `name`: `string` ; `description`: `string`  }[]

List all available arena resources

#### Parameters

| Name | Type |
| :------ | :------ |
| `arena` | `ArenaMembrane` |
| `agentRegistry` | `Map`\<`string`, [`AgentReference`](interfaces/AgentReference.md)\> |

#### Returns

\{ `uri`: `string` ; `name`: `string` ; `description`: `string`  }[]

#### Defined in

[src/arena-mcp/resources.ts:121](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/resources.ts#L121)

___

### listArenaTools

▸ **listArenaTools**(): \{ `name`: `string` ; `description`: `string` ; `schema`: `z.ZodType`  }[]

List all arena tools with descriptions

#### Returns

\{ `name`: `string` ; `description`: `string` ; `schema`: `z.ZodType`  }[]

#### Defined in

[src/arena-mcp/tools.ts:228](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/arena-mcp/tools.ts#L228)

___

### createLifecycleCoordinator

▸ **createLifecycleCoordinator**(`arenaMCP`, `agentMCP`, `relationMCP`, `config?`): [`LifecycleCoordinator`](classes/LifecycleCoordinator.md)

Create a lifecycle coordinator

#### Parameters

| Name | Type |
| :------ | :------ |
| `arenaMCP` | [`ArenaMCPServer`](classes/ArenaMCPServer.md) |
| `agentMCP` | [`AgentMCPServer`](classes/AgentMCPServer.md) |
| `relationMCP` | [`RelationMCPServer`](classes/RelationMCPServer.md) |
| `config?` | `Partial`\<[`LifecycleConfig`](interfaces/LifecycleConfig.md)\> |

#### Returns

[`LifecycleCoordinator`](classes/LifecycleCoordinator.md)

#### Defined in

[src/integration/lifecycle.ts:415](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L415)

___

### createRelationMCPServer

▸ **createRelationMCPServer**(`relation`, `agent`, `arena`, `virtualAgent`, `config?`): [`RelationMCPServer`](classes/RelationMCPServer.md)

Create a Relation-MCP server instance

#### Parameters

| Name | Type |
| :------ | :------ |
| `relation` | `RelationInterface` |
| `agent` | `AgentMembrane` |
| `arena` | `ArenaMembrane` |
| `virtualAgent` | [`VirtualAgentModel`](interfaces/VirtualAgentModel.md) |
| `config?` | `Partial`\<[`RelationMCPConfig`](interfaces/RelationMCPConfig.md)\> |

#### Returns

[`RelationMCPServer`](classes/RelationMCPServer.md)

#### Defined in

[src/relation-mcp/index.ts:382](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/index.ts#L382)

___

### listRelationPrompts

▸ **listRelationPrompts**(): \{ `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean`  }[]  }[]

List all relation prompts

#### Returns

\{ `name`: `string` ; `description`: `string` ; `arguments?`: \{ `name`: `string` ; `description`: `string` ; `required`: `boolean`  }[]  }[]

#### Defined in

[src/relation-mcp/prompts.ts:211](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/prompts.ts#L211)

___

### listRelationResources

▸ **listRelationResources**(`relation`): \{ `uri`: `string` ; `name`: `string` ; `description`: `string`  }[]

List all available relation resources

#### Parameters

| Name | Type |
| :------ | :------ |
| `relation` | `RelationInterface` |

#### Returns

\{ `uri`: `string` ; `name`: `string` ; `description`: `string`  }[]

#### Defined in

[src/relation-mcp/resources.ts:128](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/resources.ts#L128)

___

### listRelationTools

▸ **listRelationTools**(): \{ `name`: `string` ; `description`: `string` ; `schema`: `z.ZodType`  }[]

List all relation tools

#### Returns

\{ `name`: `string` ; `description`: `string` ; `schema`: `z.ZodType`  }[]

#### Defined in

[src/relation-mcp/tools.ts:337](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/relation-mcp/tools.ts#L337)

___

### createNestedMCPServer

▸ **createNestedMCPServer**(`config?`): `Promise`\<[`NestedMCPServer`](classes/NestedMCPServer.md)\>

Create a nested MCP server

#### Parameters

| Name | Type |
| :------ | :------ |
| `config?` | `Partial`\<[`NestedMCPServerConfig`](interfaces/NestedMCPServerConfig.md)\> |

#### Returns

`Promise`\<[`NestedMCPServer`](classes/NestedMCPServer.md)\>

#### Defined in

[src/server.ts:508](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/server.ts#L508)

___

### createProtocolHandler

▸ **createProtocolHandler**(`server`, `verbose?`): [`ProtocolHandler`](classes/ProtocolHandler.md)

Create a protocol handler

#### Parameters

| Name | Type |
| :------ | :------ |
| `server` | [`NestedMCPServer`](classes/NestedMCPServer.md) |
| `verbose?` | `boolean` |

#### Returns

[`ProtocolHandler`](classes/ProtocolHandler.md)

#### Defined in

[src/transport/handler.ts:367](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/handler.ts#L367)

___

### createStdioTransport

▸ **createStdioTransport**(`server`, `config?`): [`StdioTransport`](classes/StdioTransport.md)

Create a stdio transport

#### Parameters

| Name | Type |
| :------ | :------ |
| `server` | [`NestedMCPServer`](classes/NestedMCPServer.md) |
| `config?` | [`StdioTransportConfig`](interfaces/StdioTransportConfig.md) |

#### Returns

[`StdioTransport`](classes/StdioTransport.md)

#### Defined in

[src/transport/stdio.ts:161](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/stdio.ts#L161)

___

### runStdioServer

▸ **runStdioServer**(`server`, `config?`): `Promise`\<`void`\>

Run the MCP server over stdio

This is a convenience function for the common case of
running an MCP server over standard I/O.

#### Parameters

| Name | Type |
| :------ | :------ |
| `server` | [`NestedMCPServer`](classes/NestedMCPServer.md) |
| `config?` | [`StdioTransportConfig`](interfaces/StdioTransportConfig.md) |

#### Returns

`Promise`\<`void`\>

**`Example`**

```typescript
import { createNestedMCPServer, runStdioServer } from 'deep-tree-echo-mcp';

const server = await createNestedMCPServer({
    instanceName: 'MyEcho',
});

await runStdioServer(server);
```

#### Defined in

[src/transport/stdio.ts:185](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/transport/stdio.ts#L185)
