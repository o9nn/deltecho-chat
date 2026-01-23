import React, { useEffect, useState } from "react";
import { interfaceShadowing } from "./InterfaceShadowing";
import { internalJournalManager } from "./InternalJournalManager";
import {
  InfrastructureLatentState,
  JournalType,
} from "@deltachat-desktop/shared/shared-types";
import styles from "./DivergenceMonitor.module.scss";

/**
 * DivergenceMonitor - Active Inference & Ecological Resonance Dashboard
 *
 * Features:
 * - Free Energy & Surprise monitoring
 * - ESN Reservoir visualization
 * - Internal Journal streams (Learning, Project, Diary, Dream)
 */
export const DivergenceMonitor: React.FC = () => {
  const [state, setState] = useState<InfrastructureLatentState | null>(null);
  const [activeJournal, setActiveJournal] = useState<JournalType>("dream");

  useEffect(() => {
    const interval = setInterval(() => {
      setState({ ...interfaceShadowing.getInterfaceState() });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (!state) return null;

  return (
    <div className={styles.monitorContainer}>
      <div className={styles.header}>
        <div className={styles.title}>Infrastructure Latent Space</div>
        <div className={styles.version}>{state.version}</div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Free Energy (Surprise)</div>
          <div
            className={`${styles.statValue} ${getEnergyClass(
              state.freeEnergy,
            )}`}
          >
            {(state.freeEnergy * 100).toFixed(1)}%
          </div>
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressBar} ${getEnergyClass(
                state.freeEnergy,
              )}`}
              style={{ width: `${state.freeEnergy * 100}%` }}
            />
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Global Coherence</div>
          <div className={styles.statValue}>
            {(state.globalCoherence * 100).toFixed(1)}%
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{
                width: `${state.globalCoherence * 100}%`,
                backgroundColor: "var(--color-primary)",
              }}
            />
          </div>
        </div>
      </div>

      {state.resonance && state.rhythm && (
        <div className={styles.resonanceSection}>
          <div className={styles.listHeader}>
            Ecological Resonance (ESN Reservoir)
          </div>
          <div className={styles.resonanceGrid}>
            <div className={styles.subStat}>
              <div className={styles.subLabel}>Metabolic Rate (Pacing)</div>
              <div className={styles.subValue}>
                {(1 / state.resonance.rateLimitFactor).toFixed(2)}x
              </div>
            </div>
            <div className={styles.subStat}>
              <div className={styles.subLabel}>Circadian Phase</div>
              <div className={styles.subValue}>
                {state.rhythm.phaseOffset > 0 ? "DIURNAL" : "NOCTURNAL"}
              </div>
            </div>
          </div>

          <div className={styles.reservoirVisual}>
            {state.resonance.reservoirState.map((val, i) => (
              <div
                key={i}
                className={styles.neuron}
                style={{
                  opacity: 0.3 + Math.abs(val) * 0.7,
                  transform: `scale(${0.8 + val * 0.4})`,
                  backgroundColor: val > 0 ? "#4caf50" : "#f44336",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {state.journals && (
        <div className={styles.journalContainer}>
          <div className={styles.journalHeader}>
            <div className={styles.listHeader}>
              Internal Journals (Cognitive Streams)
            </div>
            <button
              type="button" className={styles.triggerButton}
              onClick={() => {
                internalJournalManager.addEntry(
                  "diary",
                  "Manual Introspection Pulse: User requested a real-time cognitive snapshot.",
                  ["manual-trigger", "introspection"],
                );
              }}
            >
              Trigger Introspection
            </button>
          </div>
          <div className={styles.journalTabs}>
            {(["dream", "learning", "diary", "project"] as JournalType[]).map(
              (type) => (
                <button
                  type="button" key={type}
                  className={`${styles.journalTab} ${
                    activeJournal === type ? styles.active : ""
                  }`}
                  onClick={() => setActiveJournal(type)}
                >
                  {type.toUpperCase()}
                </button>
              ),
            )}
          </div>
          <div className={styles.journalContent}>
            {state.journals[activeJournal].entries.length === 0 ? (
              <div className={styles.emptyJournal}>
                No entries in this stream yet. Resonance integrating...
              </div>
            ) : (
              state.journals[activeJournal].entries
                .slice(0, 15)
                .map((entry, i) => (
                  <div key={i} className={styles.journalEntry}>
                    <div className={styles.entryHeader}>
                      <span className={styles.entryTime}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      <div className={styles.entryTags}>
                        {entry.tags.map((tag) => (
                          <span key={tag} className={styles.tag}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.entryBody}>{entry.content}</div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      <div className={styles.activeShadowsList} style={{ marginTop: "20px" }}>
        <div className={styles.listHeader}>
          Infrastructure Interface Shadows
        </div>
        {Object.entries(state.activeShadows).map(([id, shadow]) => (
          <div key={id} className={styles.shadowItem}>
            <div className={styles.shadowInfo}>
              <span className={styles.shadowId}>{id}</span>
              <span className={styles.shadowHash}>#{shadow.stateHash}</span>
            </div>
            <div className={styles.shadowMetrics}>
              <div className={styles.divergenceBar}>
                <div
                  className={`${styles.divergenceFill} ${getEnergyClass(
                    shadow.divergence,
                  )}`}
                  style={{ width: `${shadow.divergence * 100}%` }}
                />
              </div>
              {shadow.learnedPattern && (
                <span className={styles.convergedBadge}>CONVERGED</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function getEnergyClass(energy: number): string {
  if (energy < 0.2) return styles.healthStable;
  if (energy < 0.5) return styles.healthSurprised;
  return styles.healthHighEnergy;
}

export default DivergenceMonitor;
