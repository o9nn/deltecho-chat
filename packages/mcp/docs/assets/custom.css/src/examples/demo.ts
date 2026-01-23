/**
 * @fileoverview Deep Tree Echo MCP Server Demo
 *
 * This example demonstrates how to create and run the MCP server
 * programmatically.
 */

import {
  createNestedMCPServer,
  LifecyclePhase,
  runStdioServer,
} from "../index.js";

async function runDemo(): Promise<void> {
  console.log("=== Deep Tree Echo MCP Server Demo ===\n");

  // Create the server
  console.log("1. Creating NestedMCPServer...");
  const server = await createNestedMCPServer({
    instanceName: "DemoEcho",
    enableLifecycle: true,
    lifecycleIntervalMs: 0, // Manual cycles
    verbose: true,
  });

  // Start the server
  console.log("2. Starting server...");
  await server.start();
  console.log("   Server is running:", server.isRunning());

  // List all resources
  console.log("\n3. Available Resources:");
  const resources = server.listAllResources();
  resources.forEach((r) => {
    console.log(`   [${r.layer}] ${r.uri} - ${r.name}`);
  });

  // List all tools
  console.log("\n4. Available Tools:");
  const tools = server.listAllTools();
  tools.forEach((t) => {
    console.log(`   [${t.layer}] ${t.name} - ${t.description.slice(0, 50)}...`);
  });

  // List all prompts
  console.log("\n5. Available Prompts:");
  const prompts = server.listAllPrompts();
  prompts.forEach((p) => {
    console.log(`   [${p.layer}] ${p.name} - ${p.description.slice(0, 50)}...`);
  });

  // Read a resource
  console.log("\n6. Reading arena://phases...");
  const phases = server.readResource("arena://phases");
  console.log(
    "   Phases:",
    JSON.stringify(phases, null, 2).slice(0, 200) + "...",
  );

  // Get the virtual agent (inverted mirror)
  console.log("\n7. Virtual Agent (Vi) - Self Model:");
  const va = server.getVirtualAgent();
  console.log("   Self Story:", va.selfStory);
  console.log("   Perceived Capabilities:", va.perceivedCapabilities);

  // Get the virtual arena (innermost of inverted mirror)
  console.log("\n8. Virtual Arena (Vo) - World View:");
  const vo = server.getVirtualArena();
  console.log("   World Theory:", vo.worldTheory);
  console.log(
    "   Estimated Coherence:",
    vo.situationalAwareness.estimatedCoherence,
  );
  console.log("   Estimated Drift:", vo.divergenceMetrics.estimatedDrift);

  // Run a lifecycle cycle
  console.log("\n9. Running Developmental Lifecycle Cycle...");
  const cycleResults = await server.runLifecycleCycle();
  console.log("   Completed phases:");
  cycleResults.forEach((r) => {
    console.log(`   - ${r.phase}: coherence=${r.coherenceAfter.toFixed(2)}`);
  });

  // Execute a single phase
  console.log("\n10. Executing MIRRORING phase (Vi ↔ Vo)...");
  const mirrorResult = await server.executePhase(LifecyclePhase.MIRRORING);
  console.log("    Mirroring result:", mirrorResult);

  // Get state summary
  console.log("\n11. State Summary:");
  const summary = server.getStateSummary();
  console.log(JSON.stringify(summary, null, 2));

  // Get a prompt
  console.log("\n12. Getting inverted_mirror prompt:");
  const prompt = server.getPrompt("relation", "inverted_mirror");
  console.log(prompt.slice(0, 500) + "...\n");

  // Stop the server
  console.log("13. Stopping server...");
  await server.stop();
  console.log("    Server stopped:", !server.isRunning());

  console.log("\n=== Demo Complete ===");
}

// Run demo or stdio server based on args
const args = process.argv.slice(2);

if (args.includes("--stdio")) {
  // Run as stdio server
  console.error("[Demo] Running as stdio MCP server...");

  createNestedMCPServer({
    instanceName: "DemoEcho",
    enableLifecycle: true,
    lifecycleIntervalMs: 0,
  })
    .then((server) => runStdioServer(server, { verbose: true }))
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
} else {
  // Run demo
  runDemo().catch((err) => {
    console.error("Demo error:", err);
    process.exit(1);
  });
}
