/* eslint-disable no-console */
/**
 * @fileoverview Lifecycle Demo - Deep Tree Echo MCP Server
 *
 * This example demonstrates the developmental lifecycle system that
 * implements the inverted mirror pattern: [ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ]
 *
 * The lifecycle consists of 5 phases that run continuously:
 *
 * 1. PERCEPTION:  Ao → Ai  (World events reach agent)
 * 2. MODELING:    Ai → S   (Agent processes through self)
 * 3. REFLECTION:  S → Vi   (Self updates virtual agent)
 * 4. MIRRORING:   Vi ↔ Vo  (Self-model updates world-view - THE INVERTED MIRROR)
 * 5. ENACTION:    Vo → Ao  (World-view guides action)
 *
 * @example
 * ```bash
 * # Run this demo
 * npx ts-node examples/lifecycle-demo.ts
 * ```
 */

import {
  createNestedMCPServer,
  LifecyclePhase,
  type VirtualAgentModel,
  type VirtualArenaModel,
} from "../src/index.js";

/**
 * Demonstrates a single lifecycle cycle with detailed output
 */
async function demonstrateSingleCycle(): Promise<void> {
  console.log(
    "╔══════════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║        Deep Tree Echo - Developmental Lifecycle Demo            ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════════╝\n",
  );

  // Create and start the server
  const server = await createNestedMCPServer({
    instanceName: "LifecycleDemo",
    enableLifecycle: true,
    lifecycleIntervalMs: 0, // Manual control
    verbose: true,
  });
  await server.start();

  console.log(
    "📍 Server started. Running developmental lifecycle demonstration...\n",
  );

  // Show initial state
  console.log(
    "═══════════════════════════════════════════════════════════════════",
  );
  console.log(
    "                    INITIAL STATE                                  ",
  );
  console.log(
    "═══════════════════════════════════════════════════════════════════\n",
  );

  printVirtualAgentState(
    "Initial Vi (Virtual Agent)",
    server.getVirtualAgent(),
  );
  printVirtualArenaState(
    "Initial Vo (Virtual Arena)",
    server.getVirtualArena(),
  );

  // Execute each phase individually with explanation
  console.log(
    "\n═══════════════════════════════════════════════════════════════════",
  );
  console.log(
    "            PHASE 1: PERCEPTION (Ao → Ai)                         ",
  );
  console.log(
    "═══════════════════════════════════════════════════════════════════",
  );
  console.log("The actual world (Arena) sends events to the actual agent.");
  console.log("This represents sensory input and environmental awareness.\n");

  const perceptionResult = await server.executePhase(LifecyclePhase.PERCEPTION);
  console.log(
    `✓ Perception complete. Coherence: ${perceptionResult.coherenceAfter.toFixed(
      3,
    )}\n`,
  );

  console.log(
    "═══════════════════════════════════════════════════════════════════",
  );
  console.log(
    "            PHASE 2: MODELING (Ai → S)                            ",
  );
  console.log(
    "═══════════════════════════════════════════════════════════════════",
  );
  console.log(
    "The agent processes experience through the relational self (S).",
  );
  console.log(
    "This integrates perception with the agent's identity structure.\n",
  );

  const modelingResult = await server.executePhase(LifecyclePhase.MODELING);
  console.log(
    `✓ Modeling complete. Coherence: ${modelingResult.coherenceAfter.toFixed(
      3,
    )}\n`,
  );

  console.log(
    "═══════════════════════════════════════════════════════════════════",
  );
  console.log(
    "            PHASE 3: REFLECTION (S → Vi)                          ",
  );
  console.log(
    "═══════════════════════════════════════════════════════════════════",
  );
  console.log("The relational self updates the Virtual Agent model (Vi).");
  console.log("The agent's self-image is refined based on experience.\n");

  const reflectionResult = await server.executePhase(LifecyclePhase.REFLECTION);
  console.log(
    `✓ Reflection complete. Coherence: ${reflectionResult.coherenceAfter.toFixed(
      3,
    )}\n`,
  );

  console.log(
    "═══════════════════════════════════════════════════════════════════",
  );
  console.log(
    "      PHASE 4: MIRRORING (Vi ↔ Vo) - THE INVERTED MIRROR         ",
  );
  console.log(
    "═══════════════════════════════════════════════════════════════════",
  );
  console.log(
    "The self-model (Vi) updates the world-view (Vo) bidirectionally.",
  );
  console.log('This is the core "inverted mirror" - Vo lives INSIDE Vi!\n');
  console.log("Pattern: [ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ]");
  console.log("         ↑           ↑    ↑    ↑");
  console.log("         Actual      Self Virtual (Inverted)");
  console.log("");

  const mirroringResult = await server.executePhase(LifecyclePhase.MIRRORING);
  console.log(
    `✓ Mirroring complete. Coherence: ${mirroringResult.coherenceAfter.toFixed(
      3,
    )}\n`,
  );

  // Show mirroring effects
  printVirtualAgentState("Post-Mirror Vi", server.getVirtualAgent());
  printVirtualArenaState("Post-Mirror Vo", server.getVirtualArena());

  console.log(
    "═══════════════════════════════════════════════════════════════════",
  );
  console.log(
    "            PHASE 5: ENACTION (Vo → Ao)                           ",
  );
  console.log(
    "═══════════════════════════════════════════════════════════════════",
  );
  console.log("The world-view (Vo) guides action in the actual world (Ao).");
  console.log("Subjective perception shapes objective behavior.\n");

  const enactionResult = await server.executePhase(LifecyclePhase.ENACTION);
  console.log(
    `✓ Enaction complete. Coherence: ${enactionResult.coherenceAfter.toFixed(
      3,
    )}\n`,
  );

  // Show final state
  console.log(
    "═══════════════════════════════════════════════════════════════════",
  );
  console.log(
    "                    FINAL STATE SUMMARY                           ",
  );
  console.log(
    "═══════════════════════════════════════════════════════════════════\n",
  );

  const summary = server.getStateSummary();
  console.log(JSON.stringify(summary, null, 2));

  // Stop server
  await server.stop();
  console.log("\n✓ Server stopped. Demo complete.");
}

/**
 * Demonstrates multiple lifecycle cycles
 */
async function demonstrateMultipleCycles(): Promise<void> {
  console.log(
    "\n╔══════════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║         Multiple Lifecycle Cycles Demonstration                 ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════════╝\n",
  );

  const server = await createNestedMCPServer({
    instanceName: "MultiCycleDemo",
    enableLifecycle: true,
    lifecycleIntervalMs: 0,
  });
  await server.start();

  const numCycles = 3;
  console.log(`Running ${numCycles} complete developmental cycles...\n`);

  for (let i = 1; i <= numCycles; i++) {
    console.log(`\n━━━━━━━━━━━━━━━━━ CYCLE ${i} ━━━━━━━━━━━━━━━━━`);

    const results = await server.runLifecycleCycle();

    results.forEach((result) => {
      const phaseIcon = getPhaseIcon(result.phase);
      console.log(
        `${phaseIcon} ${result.phase.padEnd(12)} | ` +
          `Coherence: ${result.coherenceAfter.toFixed(3)}`,
      );
    });

    // Show key metrics after each cycle
    const va = server.getVirtualAgent();
    const vo = server.getVirtualArena();
    console.log(
      `\n   📊 Self-awareness accuracy: ${(
        va.selfAwareness.perceivedAccuracy * 100
      ).toFixed(1)}%`,
    );
    console.log(
      `   📊 World-view drift: ${vo.divergenceMetrics.estimatedDrift.toFixed(
        3,
      )}`,
    );
  }

  await server.stop();
  console.log("\n✓ Multi-cycle demo complete.");
}

/**
 * Demonstrates accessing virtual models through MCP resources
 */
async function demonstrateVirtualModelAccess(): Promise<void> {
  console.log(
    "\n╔══════════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║          Virtual Model Access via MCP Resources                 ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════════╝\n",
  );

  const server = await createNestedMCPServer({
    instanceName: "ResourceDemo",
    enableLifecycle: true,
  });
  await server.start();

  console.log("Accessing virtual models through MCP resource URIs:\n");

  // Access Vi through relation resource
  console.log("1. relation://virtual-agent (Vi - Virtual Agent Model):");
  const viResource = server.readResource("relation://virtual-agent");
  console.log(
    `   Self-story: "${(viResource as VirtualAgentModel).selfStory}"`,
  );
  console.log(
    `   Current goals: ${(viResource as VirtualAgentModel).currentGoals.join(
      ", ",
    )}\n`,
  );

  // Access Vo through relation resource
  console.log("2. relation://virtual-arena (Vo - Virtual Arena Model):");
  const voResource = server.readResource("relation://virtual-arena");
  console.log(
    `   World theory: "${(voResource as VirtualArenaModel).worldTheory}"`,
  );
  console.log(
    `   Uncertainties: ${(voResource as VirtualArenaModel).uncertainties
      .slice(0, 2)
      .join(", ")}\n`,
  );

  // Access self-reflection state
  console.log("3. relation://self-reflection (S - Relational Self):");
  const reflection = server.readResource("relation://self-reflection");
  console.log(`   ${JSON.stringify(reflection, null, 2).slice(0, 300)}...\n`);

  // Access coherence metrics
  console.log("4. relation://coherence (System Coherence):");
  const coherence = server.readResource("relation://coherence");
  console.log(`   ${JSON.stringify(coherence, null, 2)}\n`);

  await server.stop();
  console.log("✓ Resource access demo complete.");
}

/**
 * Helper to print Virtual Agent state
 */
function printVirtualAgentState(title: string, vi: VirtualAgentModel): void {
  console.log(`📌 ${title}:`);
  console.log(`   Self-story: "${vi.selfStory}"`);
  console.log(
    `   Perceived capabilities: ${vi.perceivedCapabilities
      .slice(0, 3)
      .join(", ")}`,
  );
  console.log(`   Role understanding: "${vi.roleUnderstanding}"`);
  console.log(
    `   Self-awareness accuracy: ${(
      vi.selfAwareness.perceivedAccuracy * 100
    ).toFixed(1)}%`,
  );
  console.log("");
}

/**
 * Helper to print Virtual Arena state
 */
function printVirtualArenaState(title: string, vo: VirtualArenaModel): void {
  console.log(`🌍 ${title}:`);
  console.log(
    `   Perceived context: "${vo.situationalAwareness.perceivedContext}"`,
  );
  console.log(`   World theory: "${vo.worldTheory}"`);
  console.log(
    `   Estimated coherence: ${vo.situationalAwareness.estimatedCoherence.toFixed(
      3,
    )}`,
  );
  console.log(
    `   Estimated drift: ${vo.divergenceMetrics.estimatedDrift.toFixed(3)}`,
  );
  console.log(
    `   Known misalignments: ${vo.divergenceMetrics.knownMisalignments.length}`,
  );
  console.log("");
}

/**
 * Get phase icon for display
 */
function getPhaseIcon(phase: string): string {
  const icons: Record<string, string> = {
    perception: "👁️ ",
    modeling: "🧠",
    reflection: "🪞",
    mirroring: "⚡",
    enaction: "🎭",
  };
  return icons[phase] || "▸ ";
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    // Run all demonstrations
    await demonstrateSingleCycle();
    await demonstrateMultipleCycles();
    await demonstrateVirtualModelAccess();

    console.log(
      "\n╔══════════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║                    ALL DEMOS COMPLETE                            ║",
    );
    console.log(
      "╚══════════════════════════════════════════════════════════════════╝\n",
    );
  } catch (error) {
    console.error("Demo failed:", error);
    process.exit(1);
  }
}

// Run the demo
main();
