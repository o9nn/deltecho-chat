/**
 * TalkToEchoFAB - Talk to Deep Tree Echo Input
 *
 * When used inside the AvatarPanel, renders as an inline input bar.
 * When used standalone (floating), renders as a FAB with expandable overlay.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { selectedAccountId } from "../../ScreenController";
import { talkToDTE } from "./DeepTreeEchoIntegration";

interface TalkToEchoFABProps {
  /** Chat ID for relay context */
  chatId?: number;
  /** Account ID override */
  accountId?: number;
  /** Additional CSS class name */
  className?: string;
  /** Render mode: 'inline' for panel, 'floating' for overlay */
  mode?: "inline" | "floating";
}

export const TalkToEchoFAB: React.FC<TalkToEchoFABProps> = ({
  chatId,
  accountId,
  className = "",
  mode = "inline",
}) => {
  const [isOpen, setIsOpen] = useState(mode === "inline");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Auto-hide response after 5 seconds
  useEffect(() => {
    if (lastResponse) {
      const timer = setTimeout(() => setLastResponse(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastResponse]);

  const handleSend = useCallback(async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      const acctId = accountId ?? selectedAccountId();
      const result = await talkToDTE(acctId, chatId ?? 0, message.trim());
      if (result.success) {
        setLastResponse("Message sent to Deep Tree Echo");
      } else {
        setLastResponse(result.error || "Failed to send");
      }
      setMessage("");
    } catch (_error) {
      setLastResponse("Error communicating with Deep Tree Echo");
    } finally {
      setIsSending(false);
    }
  }, [message, chatId, accountId, isSending]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === "Escape" && mode === "floating") {
        setIsOpen(false);
        setMessage("");
      }
    },
    [handleSend, mode],
  );

  // --- Inline mode (for AvatarPanel) ---
  if (mode === "inline") {
    return (
      <div className={`talk-to-echo-inline ${className}`}>
        {/* Response toast */}
        {lastResponse && (
          <div className="talk-to-echo-inline__toast">
            {lastResponse}
          </div>
        )}
        <div className="talk-to-echo-inline__input-row">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Talk to Echo..."
            className="talk-to-echo-inline__input"
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="talk-to-echo-inline__send"
            title="Send to Deep Tree Echo"
            style={{ opacity: !message.trim() || isSending ? 0.5 : 1 }}
          >
            {isSending ? "..." : "Send"}
          </button>
        </div>
        <div className="talk-to-echo-inline__hint">
          Tip: Type <code>/dte message</code> or <code>/echo message</code> in any chat
        </div>
      </div>
    );
  }

  // --- Floating mode (legacy FAB) ---
  return (
    <div className={`talk-to-echo-fab ${className}`} style={floatingStyles.container}>
      {lastResponse && (
        <div style={floatingStyles.toast}>
          <span>🌳</span>
          <span style={{ fontSize: 12, color: "#c7d2fe" }}>{lastResponse}</span>
        </div>
      )}
      {isOpen && (
        <div style={floatingStyles.inputOverlay}>
          <div style={floatingStyles.inputHeader}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#c7d2fe" }}>
              🌳 Talk to Deep Tree Echo
            </span>
            <button
              style={floatingStyles.closeBtn}
              onClick={() => { setIsOpen(false); setMessage(""); }}
              title="Close"
            >
              ×
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, padding: "10px 12px" }}>
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message to Echo..."
              style={floatingStyles.input}
              disabled={isSending}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || isSending}
              style={{
                ...floatingStyles.sendBtn,
                opacity: !message.trim() || isSending ? 0.5 : 1,
              }}
              title="Send"
            >
              {isSending ? "..." : "→"}
            </button>
          </div>
        </div>
      )}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={floatingStyles.fab}
          title="Talk to Deep Tree Echo"
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>🌳</span>
        </button>
      )}
    </div>
  );
};

const floatingStyles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    bottom: 180,
    right: 20,
    zIndex: 999,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
    pointerEvents: "auto",
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    border: "2px solid rgba(255,255,255,0.15)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)",
  },
  inputOverlay: {
    width: 320,
    background: "rgba(20, 20, 40, 0.95)",
    backdropFilter: "blur(12px)",
    borderRadius: 12,
    border: "1px solid rgba(99, 102, 241, 0.3)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
    overflow: "hidden",
  },
  inputHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderBottom: "1px solid rgba(99, 102, 241, 0.2)",
    background: "rgba(99, 102, 241, 0.1)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: 18,
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(99, 102, 241, 0.3)",
    background: "rgba(0, 0, 0, 0.3)",
    color: "#e2e8f0",
    fontSize: 13,
    outline: "none",
  },
  sendBtn: {
    padding: "8px 14px",
    borderRadius: 8,
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    border: "none",
    color: "white",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    background: "rgba(20, 20, 40, 0.9)",
    borderRadius: 8,
    border: "1px solid rgba(99, 102, 241, 0.3)",
  },
};

export default TalkToEchoFAB;
