/**
 * ProactiveMessagingSettings - UI Component for Proactive Messaging Configuration
 *
 * This component provides a user interface for configuring Deep Tree Echo's
 * proactive messaging capabilities, including:
 * - Enable/disable proactive messaging
 * - Rate limiting settings
 * - Quiet hours configuration
 * - Default behavior settings
 */

import React, { useState, useEffect, useCallback } from "react";
import { getLogger } from "../../../../shared/logger";
import { runtime } from "@deltachat-desktop/runtime-interface";
import {
  proactiveMessaging,
  ProactiveConfig,
  ProactiveTrigger,
  TriggerType as _TriggerType,
} from "./ProactiveMessaging";

const log = getLogger(
  "render/components/DeepTreeEchoBot/ProactiveMessagingSettings",
);

interface ProactiveMessagingSettingsProps {
  botEnabled: boolean;
  onNavigateToTriggers?: () => void;
}

const ProactiveMessagingSettings: React.FC<ProactiveMessagingSettingsProps> = ({
  botEnabled,
  onNavigateToTriggers,
}) => {
  const [config, setConfig] = useState<ProactiveConfig>(
    proactiveMessaging.getConfig(),
  );
  const [triggers, setTriggers] = useState<ProactiveTrigger[]>(
    proactiveMessaging.getTriggers(),
  );
  const [stats, setStats] = useState({
    queuedMessages: 0,
    sentToday: 0,
    sentThisHour: 0,
    activeTriggers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Update statistics - defined before useEffect that uses it
  const updateStats = useCallback(() => {
    const queuedMessages = proactiveMessaging.getQueuedMessages().length;
    const currentTriggers = proactiveMessaging.getTriggers();
    const activeTriggers = currentTriggers.filter((t) => t.enabled).length;

    // Get rate limit info
    const _configData = proactiveMessaging.getConfig();

    setStats({
      queuedMessages,
      sentToday: 0, // Would need to track this in ProactiveMessaging
      sentThisHour: 0,
      activeTriggers,
    });

    setTriggers(currentTriggers);
  }, []);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Get current config from proactive messaging system
        const currentConfig = proactiveMessaging.getConfig();
        setConfig(currentConfig);

        // Get triggers
        const currentTriggers = proactiveMessaging.getTriggers();
        setTriggers(currentTriggers);

        // Calculate stats
        updateStats();

        setIsLoading(false);
      } catch (error) {
        log.error("Failed to load proactive messaging settings:", error);
        setIsLoading(false);
      }
    };

    loadSettings();

    // Set up interval to update stats
    const statsInterval = setInterval(updateStats, 5000);
    return () => clearInterval(statsInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle config changes
  const handleConfigChange = async (key: keyof ProactiveConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);

    try {
      proactiveMessaging.updateConfig({ [key]: value });

      // Persist to desktop settings
      await runtime.setDesktopSetting(
        `deepTreeEchoBotProactive${
          key.charAt(0).toUpperCase() + key.slice(1)
        }` as any,
        value,
      );

      log.info(`Updated proactive config: ${key} = ${value}`);
    } catch (error) {
      log.error(`Failed to update proactive config ${key}:`, error);
    }
  };

  // Handle enabling/disabling proactive messaging
  const handleEnabledChange = (enabled: boolean) => {
    proactiveMessaging.setEnabled(enabled);
    handleConfigChange("enabled", enabled);
  };

  // Format time for display
  const formatHour = (hour: number): string => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="loading">Loading proactive messaging settings...</div>
    );
  }

  const isDisabled = !botEnabled || !config.enabled;

  return (
    <div className="proactive-messaging-settings">
      <style>{`
        .proactive-messaging-settings {
          padding: 16px;
          background: var(--bg-color-secondary, #1a1a2e);
          border-radius: 8px;
          color: var(--text-color, #e0e0e0);
        }

        .proactive-messaging-settings h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: var(--text-color-primary, #ffffff);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .proactive-messaging-settings h3 .icon {
          font-size: 24px;
        }

        .proactive-messaging-settings .section {
          margin-bottom: 24px;
          padding: 16px;
          background: var(--bg-color-tertiary, #16213e);
          border-radius: 8px;
        }

        .proactive-messaging-settings .section-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--text-color-secondary, #b0b0b0);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .proactive-messaging-settings .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .proactive-messaging-settings .stat-card {
          background: var(--bg-color-quaternary, #0f3460);
          padding: 12px;
          border-radius: 6px;
          text-align: center;
        }

        .proactive-messaging-settings .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: var(--accent-color, #e94560);
        }

        .proactive-messaging-settings .stat-label {
          font-size: 12px;
          color: var(--text-color-secondary, #b0b0b0);
          margin-top: 4px;
        }

        .proactive-messaging-settings .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
        }

        .proactive-messaging-settings .setting-row:last-child {
          border-bottom: none;
        }

        .proactive-messaging-settings .setting-info {
          flex: 1;
        }

        .proactive-messaging-settings .setting-label {
          font-weight: 500;
          margin-bottom: 4px;
        }

        .proactive-messaging-settings .setting-description {
          font-size: 12px;
          color: var(--text-color-secondary, #888);
        }

        .proactive-messaging-settings .toggle-switch {
          position: relative;
          width: 48px;
          height: 24px;
          background: var(--toggle-bg, #3a3a5a);
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.3s;
        }

        .proactive-messaging-settings .toggle-switch.active {
          background: var(--accent-color, #e94560);
        }

        .proactive-messaging-settings .toggle-switch.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .proactive-messaging-settings .toggle-switch input {
          display: none;
        }

        .proactive-messaging-settings .toggle-slider {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
        }

        .proactive-messaging-settings .toggle-switch.active .toggle-slider {
          transform: translateX(24px);
        }

        .proactive-messaging-settings .number-input {
          width: 80px;
          padding: 8px;
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 4px;
          background: var(--input-bg, #1a1a2e);
          color: var(--text-color, #e0e0e0);
          text-align: center;
        }

        .proactive-messaging-settings .number-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .proactive-messaging-settings .time-select {
          padding: 8px 12px;
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 4px;
          background: var(--input-bg, #1a1a2e);
          color: var(--text-color, #e0e0e0);
        }

        .proactive-messaging-settings .time-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .proactive-messaging-settings .time-range {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .proactive-messaging-settings .triggers-preview {
          margin-top: 16px;
        }

        .proactive-messaging-settings .trigger-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--bg-color-quaternary, #0f3460);
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .proactive-messaging-settings .trigger-name {
          font-weight: 500;
        }

        .proactive-messaging-settings .trigger-type {
          font-size: 11px;
          padding: 2px 6px;
          background: var(--accent-color-secondary, #533483);
          border-radius: 3px;
          text-transform: uppercase;
        }

        .proactive-messaging-settings .trigger-status {
          font-size: 12px;
          color: var(--text-color-secondary, #888);
        }

        .proactive-messaging-settings .trigger-status.enabled {
          color: var(--success-color, #4caf50);
        }

        .proactive-messaging-settings .trigger-status.disabled {
          color: var(--error-color, #f44336);
        }

        .proactive-messaging-settings .manage-triggers-btn {
          width: 100%;
          padding: 12px;
          background: var(--accent-color, #e94560);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .proactive-messaging-settings .manage-triggers-btn:hover {
          background: var(--accent-color-hover, #d13550);
        }

        .proactive-messaging-settings .manage-triggers-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .proactive-messaging-settings .warning-banner {
          background: var(--warning-bg, #ff980020);
          border: 1px solid var(--warning-color, #ff9800);
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .proactive-messaging-settings .warning-banner .icon {
          font-size: 20px;
        }

        .proactive-messaging-settings .warning-text {
          font-size: 13px;
        }
      `}</style>

      <h3>
        <span className="icon">🤖</span>
        Proactive Messaging
      </h3>

      {!botEnabled && (
        <div className="warning-banner">
          <span className="icon">⚠️</span>
          <span className="warning-text">
            Deep Tree Echo Bot must be enabled to use proactive messaging
            features.
          </span>
        </div>
      )}

      {/* Stats Overview */}
      <div className="section">
        <div className="section-title">Status Overview</div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.activeTriggers}</div>
            <div className="stat-label">Active Triggers</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.queuedMessages}</div>
            <div className="stat-label">Queued Messages</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{config.maxMessagesPerHour}</div>
            <div className="stat-label">Max/Hour</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{config.maxMessagesPerDay}</div>
            <div className="stat-label">Max/Day</div>
          </div>
        </div>
      </div>

      {/* Main Toggle */}
      <div className="section">
        <div className="section-title">General Settings</div>

        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Enable Proactive Messaging</div>
            <div className="setting-description">
              Allow Deep Tree Echo to initiate conversations and send scheduled
              messages
            </div>
          </div>
          <div
            className={`toggle-switch ${config.enabled ? "active" : ""} ${
              !botEnabled ? "disabled" : ""
            }`}
            onClick={() => botEnabled && handleEnabledChange(!config.enabled)}
          >
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={() => {}}
              disabled={!botEnabled}
            />
            <div className="toggle-slider"></div>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Respect Muted Chats</div>
            <div className="setting-description">
              Don't send proactive messages to muted chats
            </div>
          </div>
          <div
            className={`toggle-switch ${
              config.respectMutedChats ? "active" : ""
            } ${isDisabled ? "disabled" : ""}`}
            onClick={() =>
              !isDisabled &&
              handleConfigChange("respectMutedChats", !config.respectMutedChats)
            }
          >
            <input
              type="checkbox"
              checked={config.respectMutedChats}
              onChange={() => {}}
              disabled={isDisabled}
            />
            <div className="toggle-slider"></div>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Respect Archived Chats</div>
            <div className="setting-description">
              Don't send proactive messages to archived chats
            </div>
          </div>
          <div
            className={`toggle-switch ${
              config.respectArchivedChats ? "active" : ""
            } ${isDisabled ? "disabled" : ""}`}
            onClick={() =>
              !isDisabled &&
              handleConfigChange(
                "respectArchivedChats",
                !config.respectArchivedChats,
              )
            }
          >
            <input
              type="checkbox"
              checked={config.respectArchivedChats}
              onChange={() => {}}
              disabled={isDisabled}
            />
            <div className="toggle-slider"></div>
          </div>
        </div>
      </div>

      {/* Rate Limiting */}
      <div className="section">
        <div className="section-title">Rate Limiting</div>

        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Max Messages Per Hour</div>
            <div className="setting-description">
              Limit how many proactive messages can be sent per hour
            </div>
          </div>
          <input
            type="number"
            className="number-input"
            value={config.maxMessagesPerHour}
            onChange={(e) =>
              handleConfigChange(
                "maxMessagesPerHour",
                parseInt(e.target.value) || 10,
              )
            }
            min={1}
            max={100}
            disabled={isDisabled}
          />
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Max Messages Per Day</div>
            <div className="setting-description">
              Limit how many proactive messages can be sent per day
            </div>
          </div>
          <input
            type="number"
            className="number-input"
            value={config.maxMessagesPerDay}
            onChange={(e) =>
              handleConfigChange(
                "maxMessagesPerDay",
                parseInt(e.target.value) || 50,
              )
            }
            min={1}
            max={500}
            disabled={isDisabled}
          />
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="section">
        <div className="section-title">Quiet Hours</div>
        <div className="setting-description" style={{ marginBottom: "12px" }}>
          No proactive messages will be sent during quiet hours
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Quiet Period</div>
          </div>
          <div className="time-range">
            <select
              className="time-select"
              value={config.quietHoursStart}
              onChange={(e) =>
                handleConfigChange("quietHoursStart", parseInt(e.target.value))
              }
              disabled={isDisabled}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {formatHour(i)}
                </option>
              ))}
            </select>
            <span>to</span>
            <select
              className="time-select"
              value={config.quietHoursEnd}
              onChange={(e) =>
                handleConfigChange("quietHoursEnd", parseInt(e.target.value))
              }
              disabled={isDisabled}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {formatHour(i)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Triggers Preview */}
      <div className="section">
        <div className="section-title">
          Active Triggers ({triggers.filter((t) => t.enabled).length})
        </div>

        <div className="triggers-preview">
          {triggers.slice(0, 5).map((trigger) => (
            <div key={trigger.id} className="trigger-item">
              <div>
                <div className="trigger-name">{trigger.name}</div>
                <span className="trigger-type">{trigger.type}</span>
              </div>
              <span
                className={`trigger-status ${
                  trigger.enabled ? "enabled" : "disabled"
                }`}
              >
                {trigger.enabled ? "● Active" : "○ Inactive"}
              </span>
            </div>
          ))}

          {triggers.length > 5 && (
            <div
              className="setting-description"
              style={{ textAlign: "center", marginTop: "8px" }}
            >
              +{triggers.length - 5} more triggers
            </div>
          )}
        </div>

        <button
          type="button"
          className="manage-triggers-btn"
          onClick={onNavigateToTriggers}
          disabled={isDisabled}
          style={{ marginTop: "16px" }}
        >
          Manage Triggers
        </button>
      </div>
    </div>
  );
};

export default ProactiveMessagingSettings;
