import { getLogger } from "@deltachat-desktop/shared/logger";
import { BackendRemote } from "../../backend-com";
import {
  LatentInterfaceShadow,
  InfrastructureLatentState,
} from "@deltachat-desktop/shared/shared-types";
import { ecologicalResonance } from "./EcologicalResonance";
import { internalJournalManager } from "./InternalJournalManager";

const log = getLogger("DeepTreeEcho/InterfaceShadowing");

/**
 * InterfaceShadowing - Universal Learnable Interface (ULI) Implementation
 *
 * This module implements the "Cognitive Shadowing" of infrastructure interfaces.
 * Instead of deterministic mocks, it creates neural embeddings of API calls,
 * allowing for implicit pen-testing and adaptive convergence.
 */
export class InterfaceShadowing {
  private static instance: InterfaceShadowing;
  private shadowMemories: Map<string, number[][]> = new Map();
  private state: InfrastructureLatentState = {
    version: "1.0.0-neural-active-inference",
    activeShadows: {},
    globalCoherence: 1.0,
    freeEnergy: 0,
    totalSurprise: 0,
  };

  private constructor() {}

  public static getInstance(): InterfaceShadowing {
    if (!this.instance) {
      this.instance = new InterfaceShadowing();
    }
    return this.instance;
  }

  /**
   * Start shadowing the DeltaChat RPC interface
   */
  public shadowRpcInterface(): void {
    const originalRpc = BackendRemote.rpc;
    const self = this;

    log.info("ULI: Initiating Interface Shadowing for BackendRemote.rpc");

    // Proxy the entire RPC object to intercept calls
    const proxyRpc = new Proxy(originalRpc, {
      get(target, prop, receiver) {
        const originalMethod = (target as any)[prop];

        if (typeof originalMethod === "function") {
          return async (...args: any[]) => {
            const interfaceId = prop.toString();

            // Pulse the ecological reservoir for this interaction
            ecologicalResonance.absorbInteraction();

            // 1. Record the call intent and context (Neural Side)
            await self.recordInteraction(interfaceId, args);

            // 2. Execute the original (Deterministic Side)
            return originalMethod.apply(target, args);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    // Inject the proxy
    (BackendRemote as any).rpc = proxyRpc;
  }

  /**
   * Record an interaction and compute its neural footprint
   */
  private async recordInteraction(
    interfaceId: string,
    args: any[],
  ): Promise<void> {
    try {
      const contextVector = this.simulateEmbedding(interfaceId, args);
      const stateHash = this.computeStateHash(args);

      // Simple in-memory similarity check for the prototype
      const history = this.shadowMemories.get(interfaceId) || [];
      let maxSimilarity = 0;

      for (const prevVector of history) {
        const sim = this.cosineSimilarity(contextVector, prevVector);
        if (sim > maxSimilarity) maxSimilarity = sim;
      }

      const divergence = 1.0 - maxSimilarity;
      const learnedPattern = maxSimilarity > 0.99; // Convergence threshold

      const shadow: LatentInterfaceShadow = {
        interfaceId,
        contextVector,
        stateHash,
        divergence,
        learnedPattern,
      };

      this.state.activeShadows[interfaceId] = shadow;
      history.push(contextVector);
      if (history.length > 50) history.shift(); // Limit memory
      this.shadowMemories.set(interfaceId, history);

      // Calculate global Active Inference metrics
      const shadows = Object.values(this.state.activeShadows);
      this.state.totalSurprise += divergence;
      this.state.freeEnergy =
        shadows.reduce((sum, s) => sum + s.divergence, 0) / shadows.length;
      this.state.globalCoherence = 1.0 - this.state.freeEnergy;

      // Implicit Pen-Testing: Detect anomalies in infrastructure usage
      if (divergence > 0.6 && history.length > 5) {
        log.warn(
          `[ULI-PEN-TEST] Anomaly in ${interfaceId} parameters. Divergence: ${divergence.toFixed(
            3,
          )}. Investigating state drift.`,
        );
      }
    } catch (error) {
      log.error("Shadowing record failed:", error);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let mA = 0;
    let mB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      mA += a[i] * a[i];
      mB += b[i] * b[i];
    }
    return dot / (Math.sqrt(mA) * Math.sqrt(mB));
  }

  private simulateEmbedding(id: string, args: any[]): number[] {
    const seed = id + JSON.stringify(args);
    const vector: number[] = [];
    for (let i = 0; i < 64; i++) {
      let hash = 0;
      for (let j = 0; j < seed.length; j++) {
        hash = (hash << 5) - hash + seed.charCodeAt(j) + i;
        hash |= 0;
      }
      vector.push((hash % 1000) / 1000 + 0.5); // Offset to avoid zeros
    }
    return vector;
  }

  private computeStateHash(args: any[]): string {
    // Use TextEncoder to handle Unicode characters properly
    // btoa() only supports Latin1 (0-255), so we encode to UTF-8 bytes first
    const jsonStr = JSON.stringify(args);
    const bytes = new TextEncoder().encode(jsonStr);
    const binaryStr = Array.from(bytes, (byte) =>
      String.fromCharCode(byte),
    ).join("");
    return btoa(binaryStr).slice(0, 16);
  }

  public getInterfaceState(): InfrastructureLatentState {
    const eco = ecologicalResonance.getMetabolicState();
    return {
      ...this.state,
      resonance: eco.resonance,
      rhythm: eco.rhythm,
      journals: internalJournalManager.getJournals(),
    };
  }
}

export const interfaceShadowing = InterfaceShadowing.getInstance();
