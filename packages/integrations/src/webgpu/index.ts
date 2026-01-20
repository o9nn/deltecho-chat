/**
 * @deltecho/integrations/webgpu
 *
 * WebGPU local inference exports
 */

export { WebGPUInferenceEngine, createWebGPUEngine } from "./webgpu-engine.js";
export type {
  WebGPUConfig,
  WebGPUModelConfig,
  ModelType,
  TokenizerConfig,
  WebGPUDeviceInfo,
  WebGPULimits,
  ModelLoadProgress,
  ModelLoadCallback,
  ChatMessage,
  GenerationConfig,
  InferenceRequest,
  InferenceResult,
  MemoryUsage,
  WebGPUEngineEvent,
  WebGPUEngineEventListener,
  PromptTemplate,
} from "./types.js";
export { DEFAULT_WEBGPU_CONFIG } from "./types.js";
