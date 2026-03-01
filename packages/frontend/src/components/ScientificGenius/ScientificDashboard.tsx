import React, { useState } from "react";
import { KnowledgeGraph } from "./KnowledgeGraph";
import { getLogger } from "@deltachat-desktop/shared/logger";
import { getAgentToolExecutor } from "../DeepTreeEchoBot/AgentToolExecutor";
import "./ScientificGenius.css";

const _log = getLogger(
  "frontend/components/ScientificGenius/ScientificDashboard",
);

export const ScientificDashboard: React.FC = () => {
  const [input, setInput] = useState("");

  // Manual input for testing
  // Syntax: A -> B (creates InheritanceLink)
  const handleInput = async (e: React.FormEvent) => {
    e.preventDefault();
    const executor = getAgentToolExecutor();
    if (!executor) return;

    if (input.includes("->")) {
      const [source, target] = input.split("->").map((s: string) => s.trim());
      if (source && target) {
        // Manually trigger the tool
        await executor.executeTool(
          {
            id: `manual-store-${Date.now()}`,
            name: "store_knowledge",
            input: {
              type: "InheritanceLink",
              outgoing: [source, target],
              confidence: 1.0,
            },
          },
          0,
        ); // Account ID 0 for system
      }
    } else {
      await executor.executeTool(
        {
          id: `manual-store-${Date.now()}`,
          name: "store_knowledge",
          input: {
            type: "ConceptNode",
            name: input.trim(),
            confidence: 1.0,
          },
        },
        0,
      );
    }
    setInput("");
  };

  return (
    <div className="scientific-dashboard">
      <div className="dashboard-header">
        <h2>🧠 Scientific Cortex</h2>
        <p>Visualizing the AtomSpace Knowledge Graph</p>
      </div>

      <div className="graph-view">
        <KnowledgeGraph />
      </div>

      <div className="dashboard-footer">
        <form onSubmit={handleInput} className="omnibar-form">
          <input
            type="text"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInput(e.target.value)
            }
            placeholder="Omnibar: Enter 'Entity' or 'Entity A -> Entity B' to teach..."
            className="omnibar-input"
          />
          <button type="submit" className="omnibar-button">
            Inject Knowledge
          </button>
        </form>
      </div>
    </div>
  );
};
