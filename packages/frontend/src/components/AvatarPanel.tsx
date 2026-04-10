import React, { useState, useRef, useEffect, useCallback } from "react";
import { DeepTreeEchoAvatarDisplay } from "./DeepTreeEchoBot/DeepTreeEchoAvatarDisplay";
import { TalkToEchoFAB } from "./DeepTreeEchoBot/TalkToEchoFAB";

interface AvatarPanelProps {
  /** Whether the panel is visible */
  visible?: boolean;
  /** Account ID for relay */
  accountId?: number;
  /** Chat ID for relay */
  chatId?: number;
}

/**
 * AvatarPanel — the dedicated right panel housing the Live2D avatar.
 * It fills its container and renders the avatar in inline mode,
 * with the Talk-to-Echo input at the bottom.
 */
export const AvatarPanel: React.FC<AvatarPanelProps> = ({
  visible = true,
  accountId,
  chatId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 600 });

  // Observe container size and pass to avatar
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.floor(width),
          height: Math.floor(height - 80), // Reserve space for controls
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <div className="avatar-panel" ref={containerRef}>
      <div className="avatar-panel__header">
        <span className="avatar-panel__title">Deep Tree Echo</span>
        <span className="avatar-panel__status">Online</span>
      </div>
      <div className="avatar-panel__canvas">
        <DeepTreeEchoAvatarDisplay
          width={dimensions.width}
          height={dimensions.height}
          visible={true}
          position="inline"
          className="avatar-panel__avatar"
        />
      </div>
      <div className="avatar-panel__controls">
        <TalkToEchoFAB accountId={accountId} chatId={chatId} />
      </div>
    </div>
  );
};

export default AvatarPanel;
