/* eslint-disable no-console */
import { createWebGPUEngine } from "./webgpu-engine";
import { WebGPUConfig } from "./types";

// Mock WebGPU environment for Node.js
if (typeof navigator === "undefined") {
  (global as any).navigator = {};
}

if (!global.navigator.gpu) {
  (global.navigator as any).gpu = {
    requestAdapter: async () => ({
      limits: {
        maxBufferSize: 1024 * 1024 * 1024,
        maxStorageBufferBindingSize: 1024 * 1024 * 1024,
      },
      requestDevice: async () => ({
        createBuffer: () => ({}),
        createShaderModule: () => ({}),
        createComputePipeline: () => ({}),
        destroy: () => {},
        lost: new Promise(() => {}),
      }),
    }),
  };
}

async function verify() {
  console.log("Starting WebGPU Verification...");

  // Config with debug mode
  const config: WebGPUConfig = {
    model: {
      id: "test-model",
      url: "simulated://test",
      type: "gemma2",
    },
    debug: true,
  };

  try {
    const engine = createWebGPUEngine(config);
    console.log("Engine created.");

    // Listen for events
    engine.addEventListener((event) => {
      console.log(`[Event] ${event.type}`, event);
    });

    // Load Model
    console.log("Loading model...");
    await engine.loadModel((_progress) => {
      // console.log(`Progress: ${progress.progress}%`);
    });
    console.log("Model loaded.");

    // Generate
    console.log("Generating text...");
    const result = await engine.generate({
      prompt: "Hello WebGPU",
      generationConfig: { maxTokens: 10 },
    });

    console.log("Generation Result:", result);

    if (
      result.finishReason === "completed" ||
      result.finishReason === "max_tokens"
    ) {
      console.log("SUCCESS: WebGPU Engine verification passed.");
      process.exit(0);
    } else {
      console.error("FAILURE: Generation did not complete successfully.");
      process.exit(1);
    }
  } catch (e) {
    console.error("FAILURE: Verification threw exception", e);
    process.exit(1);
  }
}

verify();
