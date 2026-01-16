/**
 * @deltecho/integrations - WebGPU Types
 * 
 * WebGPU-specific types for browser-native model inference
 */

import type { PlatformConfig } from '../types.js';

/**
 * WebGPU inference configuration
 */
export interface WebGPUConfig extends PlatformConfig {
    model: WebGPUModelConfig;
    maxContextLength?: number;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    repetitionPenalty?: number;
    streaming?: boolean;
    quantization?: 'none' | 'int8' | 'int4';
    cacheShaders?: boolean;
    batchSize?: number;
}

/**
 * Model configuration
 */
export interface WebGPUModelConfig {
    id: string;
    type: ModelType;
    variant?: string;
    url?: string;
    tokenizer?: TokenizerConfig;
}

/**
 * Supported model types
 */
export type ModelType =
    | 'llama' | 'llama2' | 'llama3'
    | 'mistral' | 'phi' | 'phi-2' | 'phi-3'
    | 'gemma' | 'gemma2' | 'qwen' | 'qwen2'
    | 'stablelm' | 'tinyllama' | 'custom';

/**
 * Tokenizer configuration
 */
export interface TokenizerConfig {
    vocabUrl?: string;
    specialTokens?: {
        bosToken?: string;
        eosToken?: string;
        padToken?: string;
        unkToken?: string;
    };
    addBosToken?: boolean;
    addEosToken?: boolean;
}

/**
 * WebGPU device information
 */
export interface WebGPUDeviceInfo {
    name: string;
    vendor: string;
    driver: string;
    backend: string;
    type: 'integrated' | 'discrete' | 'cpu' | 'unknown';
    features: string[];
    limits: WebGPULimits;
}

/**
 * WebGPU adapter limits
 */
export interface WebGPULimits {
    maxBufferSize: number;
    maxStorageBufferBindingSize: number;
    maxComputeWorkgroupsPerDimension: number;
    maxComputeInvocationsPerWorkgroup: number;
    maxComputeWorkgroupSizeX: number;
    maxComputeWorkgroupSizeY: number;
    maxComputeWorkgroupSizeZ: number;
    maxBindGroups: number;
    maxDynamicStorageBuffersPerPipelineLayout: number;
}

/**
 * Model loading progress
 */
export interface ModelLoadProgress {
    stage: 'downloading' | 'loading' | 'compiling' | 'ready';
    progress: number;
    bytesLoaded?: number;
    bytesTotal?: number;
    currentFile?: string;
    message?: string;
}

export type ModelLoadCallback = (progress: ModelLoadProgress) => void;

/**
 * Chat message format
 */
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Generation configuration
 */
export interface GenerationConfig {
    maxTokens: number;
    temperature: number;
    topP: number;
    topK: number;
    repetitionPenalty: number;
    doSample: boolean;
}

/**
 * Inference request
 */
export interface InferenceRequest {
    prompt: string;
    systemMessage?: string;
    chatHistory?: ChatMessage[];
    generationConfig?: Partial<GenerationConfig>;
    stopSequences?: string[];
    onToken?: (token: string) => void;
    abortSignal?: AbortSignal;
}

/**
 * Inference result
 */
export interface InferenceResult {
    text: string;
    outputTokens: number;
    inputTokens: number;
    generationTimeMs: number;
    tokensPerSecond: number;
    finishReason: 'completed' | 'max_tokens' | 'stop_sequence' | 'error' | 'aborted';
    tokenLogprobs?: Array<{ token: string; logprob: number }>;
}

/**
 * Memory usage information
 */
export interface MemoryUsage {
    gpuMemoryUsed: number;
    gpuMemoryAvailable: number;
    cpuMemoryUsed: number;
    kvCacheSize: number;
}

/**
 * WebGPU inference engine events
 */
export type WebGPUEngineEvent =
    | { type: 'model_loading'; progress: ModelLoadProgress }
    | { type: 'model_ready'; modelId: string }
    | { type: 'inference_start'; requestId: string }
    | { type: 'inference_token'; requestId: string; token: string }
    | { type: 'inference_complete'; requestId: string; result: InferenceResult }
    | { type: 'inference_error'; requestId: string; error: Error }
    | { type: 'memory_warning'; usage: MemoryUsage }
    | { type: 'device_lost'; reason: string };

export type WebGPUEngineEventListener = (event: WebGPUEngineEvent) => void;

/**
 * Prompt template for different model types
 */
export interface PromptTemplate {
    system?: string;
    user: string;
    assistant: string;
    separator?: string;
    endOfPrompt?: string;
}

/**
 * Default WebGPU configuration
 */
export const DEFAULT_WEBGPU_CONFIG: Partial<WebGPUConfig> = {
    debug: false,
    maxContextLength: 4096,
    maxTokens: 512,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    repetitionPenalty: 1.1,
    streaming: true,
    quantization: 'int4',
    cacheShaders: true,
    batchSize: 1,
};
