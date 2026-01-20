import React from "react";
import { UnifiedCognitiveState } from "@deltecho/cognitive";
import "./CognitiveStateVisualizer.css";

export interface CognitiveStateVisualizerProps {
  state: UnifiedCognitiveState | null;
  className?: string;
}

const formatEmotion = (val: number) => `${Math.round(val * 100)}%`;

const EmotionBar: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="dte-emotion-item">
    <span>{label}</span>
    <div className="dte-emotion-bar-bg">
      <div
        className="dte-emotion-bar-fill"
        style={{ width: formatEmotion(value), backgroundColor: color }}
      />
    </div>
  </div>
);

export const CognitiveStateVisualizer: React.FC<
  CognitiveStateVisualizerProps
> = ({ state, className = "" }) => {
  if (!state) {
    return (
      <div className={`dte-cognitive-visualizer ${className}`}>
        <div className="dte-header">
          <h3 className="dte-title">Deep Tree Echo Core</h3>
        </div>
        <div className="dte-section">Waiting for cognitive state...</div>
      </div>
    );
  }

  const { emotionalState, currentPhase, activeStreams, cognitiveLoad } = state;

  return (
    <div className={`dte-cognitive-visualizer ${className}`}>
      <div className="dte-header">
        <h3 className="dte-title">Deep Tree Echo Core</h3>
        <div className="dte-load-indicator">
          <span>Load</span>
          <div className="dte-load-bar">
            <div
              className="dte-load-fill"
              style={{ width: `${Math.min(cognitiveLoad * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="dte-grid">
        {/* Emotional State */}
        <div className="dte-section">
          <h4 className="dte-section-title">Emotional Spectrum</h4>
          <div className="dte-emotion-grid">
            <EmotionBar
              label="Joy"
              value={emotionalState.joy}
              color="#ffd43b"
            />
            <EmotionBar
              label="Sadness"
              value={emotionalState.sadness}
              color="#868e96"
            />
            <EmotionBar
              label="Anger"
              value={emotionalState.anger}
              color="#fa5252"
            />
            <EmotionBar
              label="Fear"
              value={emotionalState.fear}
              color="#be4bdb"
            />
            <EmotionBar
              label="Surprise"
              value={emotionalState.surprise}
              color="#fab005"
            />
            <EmotionBar
              label="Interest"
              value={emotionalState.interest}
              color="#4dabf7"
            />
          </div>
        </div>

        {/* Sys6 Cycle */}
        <div className="dte-section">
          <h4 className="dte-section-title">Sys6 Operadic Cycle</h4>
          <div className="dte-phase-cycle">
            <div
              className="dte-phase-circle"
              style={{
                borderColor: `hsl(${currentPhase * 12}, 70%, 60%)`,
              }}
            >
              {currentPhase}
            </div>
            <span className="dte-phase-label">
              Step {currentPhase + 1} of 30
            </span>
          </div>
        </div>

        {/* Active Streams */}
        <div className="dte-section">
          <h4 className="dte-section-title">Triadic Streams</h4>
          <div className="dte-stream-list">
            {activeStreams.length === 0 && (
              <span className="dte-date">Idle</span>
            )}
            {activeStreams.map((stream, idx) => (
              <div key={stream.id || idx} className="dte-stream-item">
                <span>Stream {idx + 1}</span>
                <span className={`dte-stream-phase ${stream.phase}`}>
                  {stream.phase}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: "0.75rem",
          color: "#5c5f66",
          textAlign: "right",
        }}
      >
        Last Synced: {new Date(state.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  );
};
