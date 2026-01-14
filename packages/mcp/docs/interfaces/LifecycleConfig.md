[Deep Tree Echo MCP - v1.0.0](../README.md) / [Exports](../modules.md) / LifecycleConfig

# Interface: LifecycleConfig

Lifecycle configuration

## Table of contents

### Properties

- [cycleIntervalMs](LifecycleConfig.md#cycleintervalms)
- [sequentialPhases](LifecycleConfig.md#sequentialphases)
- [coherenceThreshold](LifecycleConfig.md#coherencethreshold)
- [verbose](LifecycleConfig.md#verbose)

## Properties

### cycleIntervalMs

• **cycleIntervalMs**: `number`

Interval between automatic cycles (0 = manual only)

#### Defined in

[src/integration/lifecycle.ts:34](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L34)

___

### sequentialPhases

• **sequentialPhases**: `boolean`

Whether to run phases sequentially or allow overlap

#### Defined in

[src/integration/lifecycle.ts:36](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L36)

___

### coherenceThreshold

• **coherenceThreshold**: `number`

Coherence threshold below which extra integration is triggered

#### Defined in

[src/integration/lifecycle.ts:38](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L38)

___

### verbose

• **verbose**: `boolean`

Enable verbose logging

#### Defined in

[src/integration/lifecycle.ts:40](https://github.com/o9nn/deltecho-chat/blob/15d0e30998daea850f15334a96e7eed48b417f15/packages/mcp/src/integration/lifecycle.ts#L40)
