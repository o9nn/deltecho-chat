/**
 * ProactiveStatusIndicator - UI Component for Chat View Status Display
 *
 * This component shows the proactive messaging status in the chat view:
 * - Active triggers for the current chat
 * - Scheduled messages pending
 * - Quick actions for proactive features
 * - Real-time status updates
 */

import React, { useState, useEffect, useCallback as _useCallback } from "react";
import { getLogger } from "../../../../shared/logger";
import {
  proactiveMessaging,
  ProactiveTrigger,
  QueuedMessage,
} from "./ProactiveMessaging";
import { chatManager as _chatManager } from "./DeepTreeEchoChatManager";

const log = getLogger(
  "render/components/DeepTreeEchoBot/ProactiveStatusIndicator",
);

interface ProactiveStatusIndicatorProps {
  accountId: number;
  chatId: number;
  compact?: boolean;
  onOpenSettings?: () => void;
  onOpenTriggers?: () => void;
}

const ProactiveStatusIndicator: React.FC<ProactiveStatusIndicatorProps> = ({
  accountId,
  chatId,
  compact = false,
  onOpenSettings,
  onOpenTriggers,
}) => {
  const [isEnabled, setIsEnabled] = useState(
    proactiveMessaging.getConfig().enabled,
  );
  const [activeTriggers, setActiveTriggers] = useState<ProactiveTrigger[]>([]);
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [quickMessage, setQuickMessage] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);

  // Update status periodically
  useEffect(() => {
    const updateStatus = () => {
      const config = proactiveMessaging.getConfig();
      setIsEnabled(config.enabled);

      // Get triggers relevant to this chat
      const allTriggers = proactiveMessaging.getTriggers();
      const relevantTriggers = allTriggers.filter(
        (t) =>
          t.enabled &&
          (t.targetType === "all_chats" ||
            t.targetType === "unread_chats" ||
            (t.targetType === "specific_chat" && t.targetChatId === chatId)),
      );
      setActiveTriggers(relevantTriggers);

      // Get queued messages for this chat
      const allQueued = proactiveMessaging.getQueuedMessages();
      const chatQueued = allQueued.filter((m) => m.chatId === chatId);
      setQueuedMessages(chatQueued);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, [chatId]);

  // Handle quick send
  const handleQuickSend = async () => {
    if (!quickMessage.trim()) return;

    try {
      const success = await proactiveMessaging.sendNow(
        accountId,
        chatId,
        quickMessage,
      );
      if (success) {
        setQuickMessage("");
        log.info("Quick message sent successfully");
      }
    } catch (error) {
      log.error("Failed to send quick message:", error);
    }
  };

  // Handle schedule message
  const handleSchedule = () => {
    if (!quickMessage.trim() || !scheduleTime) return;

    try {
      const scheduledTime = new Date(scheduleTime).getTime();
      if (scheduledTime <= Date.now()) {
        alert("Please select a future time");
        return;
      }

      proactiveMessaging.scheduleOneTime(
        accountId,
        chatId,
        quickMessage,
        scheduledTime,
      );
      setQuickMessage("");
      setScheduleTime("");
      setShowScheduler(false);
      log.info("Message scheduled successfully");
    } catch (error) {
      log.error("Failed to schedule message:", error);
    }
  };

  // Handle cancel queued message
  const handleCancelQueued = (messageId: string) => {
    proactiveMessaging.cancelQueuedMessage(messageId);
    setQueuedMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  // Format time remaining
  const formatTimeRemaining = (scheduledTime: number): string => {
    const diff = scheduledTime - Date.now();
    if (diff < 0) return "Now";

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  if (!isEnabled) {
    return null;
  }

  if (compact) {
    // Compact mode - just show an indicator
    return (
      <div
        className="proactive-status-compact"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Proactive messaging active"
      >
        <style>{`
          .proactive-status-compact {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: var(--accent-color-bg, #e9456020);
            border-radius: 12px;
            cursor: pointer;
            font-size: 12px;
            color: var(--accent-color, #e94560);
          }

          .proactive-status-compact:hover {
            background: var(--accent-color-bg-hover, #e9456030);
          }

          .proactive-status-compact .pulse {
            width: 6px;
            height: 6px;
            background: var(--accent-color, #e94560);
            border-radius: 50%;
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
        <span className="pulse"></span>
        <span>🤖 {activeTriggers.length}</span>
        {queuedMessages.length > 0 && <span>📬 {queuedMessages.length}</span>}
      </div>
    );
  }

  return (
    <div className="proactive-status-indicator">
      <style>{`
        .proactive-status-indicator {
          background: var(--bg-color-secondary, #1a1a2e);
          border-radius: 8px;
          padding: 12px;
          margin: 8px;
          color: var(--text-color, #e0e0e0);
        }

        .proactive-status-indicator .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .proactive-status-indicator .header h4 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .proactive-status-indicator .header .pulse {
          width: 8px;
          height: 8px;
          background: var(--success-color, #4caf50);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .proactive-status-indicator .toggle-expand {
          background: none;
          border: none;
          color: var(--text-color-secondary, #888);
          cursor: pointer;
          font-size: 16px;
        }

        .proactive-status-indicator .stats-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }

        .proactive-status-indicator .stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }

        .proactive-status-indicator .stat-icon {
          font-size: 16px;
        }

        .proactive-status-indicator .stat-value {
          font-weight: 600;
          color: var(--accent-color, #e94560);
        }

        .proactive-status-indicator .quick-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .proactive-status-indicator .quick-btn {
          flex: 1;
          padding: 8px 12px;
          background: var(--bg-color-tertiary, #16213e);
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 6px;
          color: var(--text-color, #e0e0e0);
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .proactive-status-indicator .quick-btn:hover {
          background: var(--bg-color-hover, #1a1a3a);
          border-color: var(--accent-color, #e94560);
        }

        .proactive-status-indicator .expanded-content {
          border-top: 1px solid var(--border-color, #2a2a4a);
          padding-top: 12px;
          margin-top: 12px;
        }

        .proactive-status-indicator .section-title {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--text-color-secondary, #888);
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }

        .proactive-status-indicator .trigger-list {
          margin-bottom: 12px;
        }

        .proactive-status-indicator .trigger-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          background: var(--bg-color-tertiary, #16213e);
          border-radius: 4px;
          margin-bottom: 4px;
          font-size: 12px;
        }

        .proactive-status-indicator .trigger-name {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .proactive-status-indicator .trigger-type {
          font-size: 10px;
          padding: 2px 6px;
          background: var(--accent-color-secondary, #533483);
          border-radius: 3px;
        }

        .proactive-status-indicator .queued-list {
          margin-bottom: 12px;
        }

        .proactive-status-indicator .queued-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: var(--bg-color-tertiary, #16213e);
          border-radius: 4px;
          margin-bottom: 4px;
        }

        .proactive-status-indicator .queued-info {
          flex: 1;
          min-width: 0;
        }

        .proactive-status-indicator .queued-message {
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }

        .proactive-status-indicator .queued-time {
          font-size: 11px;
          color: var(--text-color-secondary, #888);
        }

        .proactive-status-indicator .cancel-btn {
          background: none;
          border: none;
          color: var(--danger-color, #f44336);
          cursor: pointer;
          padding: 4px 8px;
          font-size: 14px;
        }

        .proactive-status-indicator .cancel-btn:hover {
          color: var(--danger-color-hover, #ff5252);
        }

        .proactive-status-indicator .quick-send {
          margin-top: 12px;
        }

        .proactive-status-indicator .quick-send-row {
          display: flex;
          gap: 8px;
        }

        .proactive-status-indicator .quick-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 6px;
          background: var(--input-bg, #0f0f23);
          color: var(--text-color, #e0e0e0);
          font-size: 13px;
        }

        .proactive-status-indicator .quick-input:focus {
          outline: none;
          border-color: var(--accent-color, #e94560);
        }

        .proactive-status-indicator .send-btn {
          padding: 8px 16px;
          background: var(--accent-color, #e94560);
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-weight: 500;
        }

        .proactive-status-indicator .send-btn:hover {
          background: var(--accent-color-hover, #d13550);
        }

        .proactive-status-indicator .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .proactive-status-indicator .schedule-btn {
          padding: 8px;
          background: var(--bg-color-tertiary, #16213e);
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 6px;
          color: var(--text-color, #e0e0e0);
          cursor: pointer;
        }

        .proactive-status-indicator .schedule-btn:hover {
          border-color: var(--accent-color, #e94560);
        }

        .proactive-status-indicator .scheduler {
          margin-top: 8px;
          padding: 12px;
          background: var(--bg-color-tertiary, #16213e);
          border-radius: 6px;
        }

        .proactive-status-indicator .scheduler-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .proactive-status-indicator .datetime-input {
          flex: 1;
          padding: 8px;
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 4px;
          background: var(--input-bg, #0f0f23);
          color: var(--text-color, #e0e0e0);
        }

        .proactive-status-indicator .empty-state {
          text-align: center;
          padding: 12px;
          color: var(--text-color-secondary, #888);
          font-size: 12px;
        }
      `}</style>

      <div className="header">
        <h4>
          <span className="pulse"></span>
          Proactive Messaging
        </h4>
        <button
          className="toggle-expand"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "▲" : "▼"}
        </button>
      </div>

      <div className="stats-row">
        <div className="stat">
          <span className="stat-icon">🎯</span>
          <span className="stat-value">{activeTriggers.length}</span>
          <span>triggers</span>
        </div>
        <div className="stat">
          <span className="stat-icon">📬</span>
          <span className="stat-value">{queuedMessages.length}</span>
          <span>queued</span>
        </div>
      </div>

      <div className="quick-actions">
        <button className="quick-btn" onClick={onOpenSettings}>
          ⚙️ Settings
        </button>
        <button className="quick-btn" onClick={onOpenTriggers}>
          🎯 Triggers
        </button>
      </div>

      {isExpanded && (
        <div className="expanded-content">
          {/* Active Triggers */}
          <div className="section-title">Active Triggers for This Chat</div>
          <div className="trigger-list">
            {activeTriggers.length > 0 ? (
              activeTriggers.slice(0, 5).map((trigger) => (
                <div key={trigger.id} className="trigger-item">
                  <span className="trigger-name">
                    {trigger.type === "scheduled" && "📅"}
                    {trigger.type === "interval" && "🔄"}
                    {trigger.type === "event" && "⚡"}
                    {trigger.type === "condition" && "🎯"}
                    {trigger.type === "follow_up" && "💬"}
                    {trigger.type === "greeting" && "👋"}
                    {trigger.name}
                  </span>
                  <span className="trigger-type">{trigger.type}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                No active triggers for this chat
              </div>
            )}
          </div>

          {/* Queued Messages */}
          <div className="section-title">Scheduled Messages</div>
          <div className="queued-list">
            {queuedMessages.length > 0 ? (
              queuedMessages.map((msg) => (
                <div key={msg.id} className="queued-item">
                  <div className="queued-info">
                    <div className="queued-message">{msg.message}</div>
                    <div className="queued-time">
                      {msg.scheduledTime
                        ? `In ${formatTimeRemaining(msg.scheduledTime)}`
                        : "Pending"}
                    </div>
                  </div>
                  <button
                    className="cancel-btn"
                    onClick={() => handleCancelQueued(msg.id)}
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">No scheduled messages</div>
            )}
          </div>

          {/* Quick Send */}
          <div className="quick-send">
            <div className="section-title">Quick Send</div>
            <div className="quick-send-row">
              <input
                type="text"
                className="quick-input"
                placeholder="Type a message..."
                value={quickMessage}
                onChange={(e) => setQuickMessage(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && !showScheduler && handleQuickSend()
                }
              />
              <button
                className="schedule-btn"
                onClick={() => setShowScheduler(!showScheduler)}
                title="Schedule"
              >
                📅
              </button>
              <button
                className="send-btn"
                onClick={handleQuickSend}
                disabled={!quickMessage.trim()}
              >
                Send
              </button>
            </div>

            {showScheduler && (
              <div className="scheduler">
                <div className="scheduler-row">
                  <input
                    type="datetime-local"
                    className="datetime-input"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <button
                    className="send-btn"
                    onClick={handleSchedule}
                    disabled={!quickMessage.trim() || !scheduleTime}
                  >
                    Schedule
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProactiveStatusIndicator;
