/* eslint-disable no-console */
import React, { useState, useEffect } from "react";
import { runtime } from "@deltachat-desktop/runtime-interface";
import SettingsStoreInstance from "../../stores/settings";
import { Screens } from "../../ScreenController";
import SettingsHeading from "./SettingsHeading";
import SettingsSeparator from "./SettingsSeparator";
import SettingsButton from "./SettingsButton";
import { DeltaInput } from "../Login-Styles";
import _Callout from "../Callout";

interface APIKeyEntry {
  id: string;
  name: string;
  platform:
    | "claude"
    | "chatgpt"
    | "character-ai"
    | "copilot"
    | "deep-tree-echo"
    | "custom";
  key: string;
  lastUsed?: string;
  endpoint?: string;
}

interface Props {
  onClose: () => void;
}

const AICompanionSettings: React.FC<Props> = ({ onClose }) => {
  const [apiKeys, setApiKeys] = useState<APIKeyEntry[]>([]);
  const [newKey, setNewKey] = useState<Partial<APIKeyEntry>>({
    platform: "claude",
    name: "",
    key: "",
    endpoint: "",
  });

  // Load API keys
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const settings = await runtime.getDesktopSettings();
        const cognitiveKeys = settings.deepTreeEchoBotCognitiveKeys
          ? JSON.parse(settings.deepTreeEchoBotCognitiveKeys)
          : [];
        setApiKeys(cognitiveKeys);
      } catch (error) {
        console.error("Failed to load API keys:", error);
      }
    };
    loadKeys();
  }, []);

  // Save API keys
  const saveApiKeys = async (keys: APIKeyEntry[]) => {
    try {
      await runtime.setDesktopSetting(
        "deepTreeEchoBotCognitiveKeys",
        JSON.stringify(keys),
      );

      SettingsStoreInstance.reducer.setDesktopSetting(
        "deepTreeEchoBotCognitiveKeys",
        JSON.stringify(keys),
      );
      return true;
    } catch (error) {
      console.error("Failed to save API keys:", error);
      return false;
    }
  };

  const handleAddKey = async () => {
    if (!newKey.name || !newKey.key || !newKey.platform) return;

    const keyEntry: APIKeyEntry = {
      id: `key_${Date.now()}`,
      name: newKey.name,
      platform: newKey.platform as APIKeyEntry["platform"],
      key: newKey.key,
      lastUsed: new Date().toISOString(),
      endpoint: newKey.endpoint,
    };

    const updatedKeys = [...apiKeys, keyEntry];
    const saveSuccess = await saveApiKeys(updatedKeys);

    if (saveSuccess) {
      setApiKeys(updatedKeys);
      setNewKey({ platform: "claude", name: "", key: "", endpoint: "" });
    }
  };

  const handleDeleteKey = async (id: string) => {
    const updatedKeys = apiKeys.filter((key) => key.id !== id);
    const success = await saveApiKeys(updatedKeys);
    if (success) setApiKeys(updatedKeys);
  };

  const openDashboard = () => {
    if (window.__changeScreen) {
      window.__changeScreen(Screens.AINeighborhood);
      onClose();
    }
  };

  return (
    <>
      <SettingsHeading>AI Neighborhood</SettingsHeading>
      <div style={{ marginBottom: "16px" }}>
        <p
          style={{
            margin: "0 0 10px 0",
            fontSize: "14px",
            color: "var(--color-text)",
          }}
        >
          Manage your AI personalities and interactions in the dedicated
          dashboard.
        </p>
        <SettingsButton onClick={openDashboard}>
          Open AI Neighborhood Dashboard
        </SettingsButton>
      </div>

      <SettingsSeparator />
      <SettingsHeading>API Key Management</SettingsHeading>

      <div style={{ marginBottom: "20px" }}>
        {apiKeys.map((key) => (
          <div
            key={key.id}
            style={{
              padding: "10px",
              background: "var(--color-background-soft)",
              marginBottom: "8px",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: "bold" }}>{key.name}</div>
              <div style={{ fontSize: "12px", opacity: 0.8 }}>
                {key.platform}
              </div>
            </div>
            <button
              onClick={() => handleDeleteKey(key.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-destructive)",
                cursor: "pointer",
              }}
              aria-label={`Delete key ${key.name}`}
            >
              Delete
            </button>
          </div>
        ))}
        {apiKeys.length === 0 && (
          <div
            style={{ fontStyle: "italic", opacity: 0.6, marginBottom: "10px" }}
          >
            No API keys added yet.
          </div>
        )}
      </div>

      <SettingsHeading>Add New Key</SettingsHeading>

      <div style={{ marginBottom: "10px" }}>
        <DeltaInput
          placeholder="Key Name (e.g. My Claude Key)"
          value={newKey.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setNewKey({ ...newKey, name: e.target.value })
          }
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
        <select
          value={newKey.platform}
          onChange={(e) =>
            setNewKey({ ...newKey, platform: e.target.value as any })
          }
          aria-label="Select AI Platform"
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid var(--color-border)",
            background: "var(--color-background)",
            color: "var(--color-text)",
          }}
        >
          <option value="claude">Claude (Anthropic)</option>
          <option value="chatgpt">ChatGPT (OpenAI)</option>
          <option value="character-ai">Character.AI</option>
          <option value="deep-tree-echo">Deep Tree Echo</option>
          <option value="custom">Custom API</option>
        </select>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <DeltaInput
          type="password"
          placeholder="API Key Secret"
          value={newKey.key}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setNewKey({ ...newKey, key: e.target.value })
          }
        />
      </div>

      <SettingsButton
        onClick={handleAddKey}
        disabled={!newKey.name || !newKey.key}
      >
        Save API Key
      </SettingsButton>
    </>
  );
};

export default AICompanionSettings;
