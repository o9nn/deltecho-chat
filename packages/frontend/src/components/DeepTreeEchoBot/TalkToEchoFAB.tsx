/**
 * TalkToEchoFAB - Floating Action Button to Talk to Deep Tree Echo
 *
 * A small floating button that appears in the chat view, allowing users
 * to quickly send a message to Deep Tree Echo from any chat context.
 * Clicking it opens a small input overlay where the user can type a message.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { selectedAccountId } from "../../ScreenController";
import { talkToDTE } from "./DeepTreeEchoIntegration";

interface TalkToEchoFABProps {
  chatId: number;
  className?: string;
}

export const TalkToEchoFAB: React.FC<TalkToEchoFABProps> = ({
  chatId,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
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
      const accountId = selectedAccountId();
      const result = await talkToDTE(accountId, chatId, message.trim());
      if (result.success) {
        setLastResponse("Message sent to Deep Tree Echo");
      } else {
        setLastResponse(result.error || "Failed to send");
      }
      setMessage("");
      setIsOpen(false);
    } catch (error) {
      setLastResponse("Error communicating with Deep Tree Echo");
    } finally {
      setIsSending(false);
    }
  }, [message, chatId, isSending]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setMessage("");
      }
    },
    [handleSend],
  );

  return (
    <div className={`talk-to-echo-fab-container ${className}`} style={styles.container}>
      {/* Response toast */}
      {lastResponse && (
        <div style={styles.toast}>
          <span style={styles.toastIcon}>🌳</span>
          <span style={styles.toastText}>{lastResponse}</span>
        </div>
      )}

      {/* Input overlay */}
      {isOpen && (
        <div style={styles.inputOverlay}>
          <div style={styles.inputHeader}>
            <span style={styles.inputTitle}>🌳 Talk to Deep Tree Echo</span>
            <button
              style={styles.closeBtn}
              onClick={() => {
                setIsOpen(false);
                setMessage("");
              }}
              title="Close"
            >
              ×
            </button>
          </div>
          <div style={styles.inputRow}>
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message to Echo..."
              style={styles.input}
              disabled={isSending}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || isSending}
              style={{
                ...styles.sendBtn,
                opacity: !message.trim() || isSending ? 0.5 : 1,
              }}
              title="Send to Deep Tree Echo"
            >
              {isSending ? "..." : "→"}
            </button>
          </div>
          <div style={styles.hint}>
            Tip: You can also type <code style={styles.code}>/dte message</code>{" "}
            or <code style={styles.code}>/echo message</code> in any chat
          </div>
        </div>
      )}

      {/* FAB button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={styles.fab}
          title="Talk to Deep Tree Echo"
        >
          <span style={styles.fabIcon}>🌳</span>
        </button>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
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
    transition: "all 0.2s ease",
    pointerEvents: "auto",
  },
  fabIcon: {
    fontSize: 20,
    lineHeight: 1,
  },
  inputOverlay: {
    width: 320,
    background: "rgba(20, 20, 40, 0.95)",
    backdropFilter: "blur(12px)",
    borderRadius: 12,
    border: "1px solid rgba(99, 102, 241, 0.3)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
    overflow: "hidden",
    pointerEvents: "auto",
  },
  inputHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderBottom: "1px solid rgba(99, 102, 241, 0.2)",
    background: "rgba(99, 102, 241, 0.1)",
  },
  inputTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#c7d2fe",
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
  inputRow: {
    display: "flex",
    gap: 8,
    padding: "10px 12px",
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
    transition: "opacity 0.2s",
  },
  hint: {
    padding: "4px 12px 10px",
    fontSize: 11,
    color: "#64748b",
  },
  code: {
    background: "rgba(99, 102, 241, 0.15)",
    padding: "1px 4px",
    borderRadius: 3,
    fontSize: 11,
    color: "#a5b4fc",
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    background: "rgba(20, 20, 40, 0.9)",
    backdropFilter: "blur(8px)",
    borderRadius: 8,
    border: "1px solid rgba(99, 102, 241, 0.3)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    animation: "fadeIn 0.3s ease",
    pointerEvents: "auto",
  },
  toastIcon: {
    fontSize: 14,
  },
  toastText: {
    fontSize: 12,
    color: "#c7d2fe",
  },
};

export default TalkToEchoFAB;
