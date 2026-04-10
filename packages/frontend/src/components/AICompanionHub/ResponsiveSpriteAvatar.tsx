import React, { useMemo, useEffect } from "react";
import { EmotionalVector } from "./Live2DAvatar";

// Import images - in a real app these typically would be imported or referenced by URL
// We are using static paths
// Resolve sprite paths relative to the app's html-dist root.
// The build:static step copies ./static/* into html-dist/, so sprites
// land at html-dist/images/avatar/sprites/ (NOT /static/images/...).
const SPRITE_BASE = "images/avatar/sprites";
const SPRITE_PATHS = {
  happy_up: `${SPRITE_BASE}/sprite_happy_up.jpg`,
  neutral: `${SPRITE_BASE}/sprite_neutral.jpg`,
  ecstatic: `${SPRITE_BASE}/sprite_ecstatic.jpg`,
  speaking: `${SPRITE_BASE}/sprite_speaking.jpg`,
  surprised: `${SPRITE_BASE}/sprite_surprised.jpg`,
  singing: `${SPRITE_BASE}/sprite_singing.jpg`,
  annoyed: `${SPRITE_BASE}/sprite_annoyed.jpg`,
  content: `${SPRITE_BASE}/sprite_content.jpg`,
  thinking: `${SPRITE_BASE}/sprite_thinking.jpg`,
  bored: `${SPRITE_BASE}/sprite_bored.jpg`,
};

export interface ResponsiveSpriteAvatarProps {
  emotionalState?: EmotionalVector;
  isSpeaking?: boolean;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * A responsive avatar that switches between static sprites based on emotional state.
 * Provides an immediate "alive" feeling without full Live2D rigging.
 */
export const ResponsiveSpriteAvatar: React.FC<ResponsiveSpriteAvatarProps> = ({
  emotionalState,
  isSpeaking,
  className,
  width,
  height,
}) => {
  // Determine the best sprite based on state
  const currentSprite = useMemo(() => {
    // 1. High Priority: Speaking
    if (isSpeaking) {
      // Alternate between speaking and singing or open mouth variants if available?
      // For now, straight mapping.
      // If strictly speaking, use the 'speaking' sprite.
      // Maybe check emotion to see if 'singing' is better (e.g. high happiness)
      const happiness = Number(emotionalState?.happiness || 0);
      if (happiness > 0.7) return SPRITE_PATHS.singing;
      return SPRITE_PATHS.speaking;
    }

    // 2. Emotional Mapping
    if (!emotionalState) return SPRITE_PATHS.neutral;

    // Normalize emotions
    const happiness = Number(emotionalState.happiness || 0);
    const excitement = Number(emotionalState.excitement || 0);
    const surprise = Number(emotionalState.surprise || 0);
    const anger = Number(emotionalState.anger || 0);
    const _confusion = Number(emotionalState.confusion || 0);
    const boredom = Number(emotionalState.boredom || 0);
    const contentment = Number(emotionalState.contentment || 0);
    const thinking = Number(emotionalState.thinking || 0); // Hypothetical

    // Heuristics
    if (surprise > 0.6) return SPRITE_PATHS.surprised;
    if (anger > 0.5) return SPRITE_PATHS.annoyed;
    if (boredom > 0.6) return SPRITE_PATHS.bored;
    if (thinking > 0.6) return SPRITE_PATHS.thinking;

    // High Valence states
    if (happiness > 0.8 && excitement > 0.5) return SPRITE_PATHS.ecstatic;
    if (happiness > 0.5) return SPRITE_PATHS.happy_up;

    // Low Valence / Neutral states
    if (contentment > 0.5) return SPRITE_PATHS.content;

    // Default
    return SPRITE_PATHS.neutral;
  }, [emotionalState, isSpeaking]);

  // Preload all images on mount to prevent flashing
  useEffect(() => {
    Object.values(SPRITE_PATHS).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  return (
    <div
      className={`responsive-sprite-avatar ${className || ""}`}
      style={{
        width: width || "100%",
        height: height || "100%",
        overflow: "hidden",
        borderRadius: "50%", // Assuming circular avatar for now, or use CSS class
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1a1a2e",
      }}
    >
      <img
        src={currentSprite}
        alt="Avatar"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transition: "opacity 0.2s ease-in-out", // Smooth transition between sprites
        }}
      />

      {/* Overlay for speaking pulse effect if needed */}
      {isSpeaking && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            boxShadow: "0 0 20px 5px rgba(99, 102, 241, 0.3)",
            animation: "pulse 1s infinite",
          }}
        />
      )}

      <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }
            `}</style>
    </div>
  );
};
