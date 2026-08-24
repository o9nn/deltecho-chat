// Export cognitive modules
export * from "./cognitive";

// Export storage adapters
export * from "./adapters";

// Export integration modules
export * from "./integration";

// Export memory modules (browser-safe barrel + Node-only lever/fs)
export * from "./memory";
export * from "./memory/node";

// Export personality modules
export * from "./personality";

// Export security modules
export * from "./security";

// Export embodiment modules
export * from "./embodiment";

// Export active inference modules
export * from "./active-inference";

// Export utility modules
export * from "./utils/logger";

// Export configuration modules
export * from "./config";

// Export multimodal modules
export * from "./multimodal";

// Export consciousness modules
export * from "./consciousness";

// Export scientific genius modules
export * from "./scientific-genius";

// Level 5: Core Self (IdentityMesh, CoreSelfEngine, ReservoirBridge, LucyInferenceDriver)
export * from "./core-self/index.js";
export { TreePolytopeKernel } from "./core-self/TreePolytopeKernel.js";
