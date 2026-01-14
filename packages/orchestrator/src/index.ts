/**
 * @fileoverview Deep Tree Echo Orchestrator
 *
 * Main entry point for the orchestrator package.
 * Exports all public APIs for orchestration services.
 */

// Core Orchestrator
export {
  Orchestrator,
  type OrchestratorConfig,
  type CognitiveTierMode,
} from './orchestrator.js';

// DeltaChat Interface
export {
  DeltaChatInterface,
  type DeltaChatConfig,
  type DeltaChatMessage,
  type DeltaChatContact,
  type DeltaChatChat,
  type DeltaChatAccount,
  type DeltaChatEvent,
  type DeltaChatEventType,
} from './deltachat-interface/index.js';

// Dovecot Interface
export {
  DovecotInterface,
  type DovecotConfig,
  type EmailMessage,
} from './dovecot-interface/index.js';

// IPC Server
export {
  IPCServer,
  IPCMessageType,
  type IPCMessage,
  type IPCRequestHandler,
  type IPCServerConfig,
} from './ipc/server.js';
export { StorageManager } from './ipc/storage-manager.js';

// Task Scheduler
export {
  TaskScheduler,
  TaskStatus,
  type ScheduledTask,
  type TaskResult,
} from './scheduler/task-scheduler.js';

// Webhook Server
export { WebhookServer, type WebhookServerConfig } from './webhooks/webhook-server.js';

// Dove9 Integration
export {
  Dove9Integration,
  type Dove9IntegrationConfig,
  type Dove9Response,
} from './dove9-integration.js';

// Sys6 Bridge - 30-step cognitive cycle integration
export {
  Sys6OrchestratorBridge,
  type Sys6BridgeConfig,
  type Sys6StepAddress,
  type StreamState,
  type CycleResult,
  type CognitiveAgent,
} from './sys6-bridge/index.js';

// Agent Coordinator - Nested agency pattern
export {
  AgentCoordinator,
  type Agent,
  type AgentCapability,
  type AgentTemplate,
  type Task,
  type TaskResult as AgentTaskResult,
  type CoordinatorConfig,
} from './agents/index.js';

// Telemetry Monitor - Real-time monitoring
export {
  TelemetryMonitor,
  type TelemetryConfig,
  type TelemetrySnapshot,
  type Metric,
  type MetricDataPoint,
  type HealthStatus,
  type Alert,
} from './telemetry/index.js';

// Double Membrane Integration - Bio-inspired cognitive architecture
export {
  DoubleMembraneIntegration,
  createDoubleMembraneIntegration,
  type DoubleMembraneIntegrationConfig,
  type DoubleMembraneRequest,
  type DoubleMembraneResponse,
  type IntegrationStatus,
} from './double-membrane-integration.js';

// AAR (Agent-Arena-Relation) - Nested Membrane Architecture
export {
  AARSystem,
  createAARSystem,
  AgentMembrane,
  ArenaMembrane,
  RelationInterface,
  type AARState,
  type AARConfig,
  type AAREvent,
  type AAREventType,
  type MessageContext,
  type AARProcessingResult,
  type CoreIdentity,
  type AgentState,
  type ArenaState,
  type RelationState,
  type SessionFrame,
  type LoreEntry,
  type CharacterFacets,
  type NarrativePhases,
  type CognitiveFlow,
  type SocialMemory,
  type TransactionalMemory,
  type EmergentIdentity,
  type SelfReflectionState,
} from './aar/index.js';
