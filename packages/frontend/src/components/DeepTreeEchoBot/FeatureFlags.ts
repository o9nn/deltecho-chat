/**
 * FeatureFlags - Toggle System for Heavy Components
 *
 * Provides a centralized way to enable/disable resource-intensive features
 * like TensorFlow.js, vision capabilities, and proactive messaging.
 */

import { getLogger } from "../../../../shared/logger";
import { runtime } from "@deltachat-desktop/runtime-interface";

const log = getLogger("render/components/DeepTreeEchoBot/FeatureFlags");

/**
 * Available feature flags
 */
export enum FeatureFlag {
  /** TensorFlow.js for ML capabilities */
  TENSORFLOW = "tensorflow",
  /** Vision/image analysis capabilities */
  VISION = "vision",
  /** Proactive messaging system */
  PROACTIVE_MESSAGING = "proactive_messaging",
  /** Advanced memory consolidation */
  MEMORY_CONSOLIDATION = "memory_consolidation",
  /** Web automation (Playwright) */
  WEB_AUTOMATION = "web_automation",
  /** Embodiment/proprioceptive features */
  EMBODIMENT = "embodiment",
}

/**
 * Feature flag configuration with metadata
 */
interface FeatureFlagConfig {
  id: FeatureFlag;
  name: string;
  description: string;
  defaultEnabled: boolean;
  performanceImpact: "low" | "medium" | "high";
  experimental: boolean;
}

/**
 * All available feature flags with their configurations
 */
export const FEATURE_FLAG_CONFIGS: Record<FeatureFlag, FeatureFlagConfig> = {
  [FeatureFlag.TENSORFLOW]: {
    id: FeatureFlag.TENSORFLOW,
    name: "TensorFlow.js",
    description:
      "Enable machine learning capabilities. May increase memory usage.",
    defaultEnabled: false,
    performanceImpact: "high",
    experimental: false,
  },
  [FeatureFlag.VISION]: {
    id: FeatureFlag.VISION,
    name: "Vision Capabilities",
    description:
      "Enable image analysis and understanding. Requires TensorFlow.js.",
    defaultEnabled: false,
    performanceImpact: "high",
    experimental: false,
  },
  [FeatureFlag.PROACTIVE_MESSAGING]: {
    id: FeatureFlag.PROACTIVE_MESSAGING,
    name: "Proactive Messaging",
    description:
      "Allow AI to initiate conversations based on triggers and schedules.",
    defaultEnabled: true,
    performanceImpact: "low",
    experimental: false,
  },
  [FeatureFlag.MEMORY_CONSOLIDATION]: {
    id: FeatureFlag.MEMORY_CONSOLIDATION,
    name: "Memory Consolidation",
    description:
      "Background process for organizing and strengthening AI memories.",
    defaultEnabled: true,
    performanceImpact: "medium",
    experimental: false,
  },
  [FeatureFlag.WEB_AUTOMATION]: {
    id: FeatureFlag.WEB_AUTOMATION,
    name: "Web Automation",
    description: "Enable browser automation capabilities via Playwright.",
    defaultEnabled: false,
    performanceImpact: "medium",
    experimental: true,
  },
  [FeatureFlag.EMBODIMENT]: {
    id: FeatureFlag.EMBODIMENT,
    name: "Embodiment System",
    description:
      "Enable proprioceptive and embodiment features for richer AI experience.",
    defaultEnabled: false,
    performanceImpact: "low",
    experimental: true,
  },
};

/**
 * FeatureFlags - Singleton manager for feature toggles
 */
export class FeatureFlags {
  private static instance: FeatureFlags | null = null;
  private flags: Map<FeatureFlag, boolean> = new Map();
  private listeners: Set<(flag: FeatureFlag, enabled: boolean) => void> =
    new Set();
  private initialized = false;

  private constructor() {}

  static getInstance(): FeatureFlags {
    if (!FeatureFlags.instance) {
      FeatureFlags.instance = new FeatureFlags();
    }
    return FeatureFlags.instance;
  }

  /**
   * Initialize feature flags from persisted settings
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const settings = await runtime.getDesktopSettings();

      // Load each flag from settings or use default
      for (const [flagId, config] of Object.entries(FEATURE_FLAG_CONFIGS)) {
        const flag = flagId as FeatureFlag;
        const settingKey = `featureFlag_${flag}` as keyof typeof settings;
        const storedValue = settings[settingKey];

        const enabled =
          typeof storedValue === "boolean"
            ? storedValue
            : config.defaultEnabled;

        this.flags.set(flag, enabled);
      }

      this.initialized = true;
      log.info("Feature flags initialized:", Object.fromEntries(this.flags));
    } catch (error) {
      log.error("Failed to initialize feature flags:", error);
      // Fall back to defaults
      for (const [flagId, config] of Object.entries(FEATURE_FLAG_CONFIGS)) {
        this.flags.set(flagId as FeatureFlag, config.defaultEnabled);
      }
      this.initialized = true;
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flag: FeatureFlag): boolean {
    if (!this.initialized) {
      log.warn("Feature flags not initialized, returning default for:", flag);
      return FEATURE_FLAG_CONFIGS[flag]?.defaultEnabled ?? false;
    }
    return this.flags.get(flag) ?? false;
  }

  /**
   * Enable or disable a feature flag
   */
  async setEnabled(flag: FeatureFlag, enabled: boolean): Promise<void> {
    const oldValue = this.flags.get(flag);
    this.flags.set(flag, enabled);

    // Persist to settings
    try {
      const settingKey = `featureFlag_${flag}`;
      await runtime.setDesktopSetting(settingKey as any, enabled);
      log.info(`Feature flag ${flag} set to ${enabled}`);
    } catch (error) {
      log.error(`Failed to persist feature flag ${flag}:`, error);
      // Revert on failure
      if (oldValue !== undefined) {
        this.flags.set(flag, oldValue);
      }
      throw error;
    }

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(flag, enabled);
      } catch (e) {
        log.error("Feature flag listener error:", e);
      }
    });
  }

  /**
   * Get all flag states
   */
  getAllFlags(): Record<FeatureFlag, boolean> {
    const result: Partial<Record<FeatureFlag, boolean>> = {};
    for (const flag of Object.values(FeatureFlag)) {
      result[flag] = this.isEnabled(flag);
    }
    return result as Record<FeatureFlag, boolean>;
  }

  /**
   * Add a listener for flag changes
   */
  addListener(
    listener: (flag: FeatureFlag, enabled: boolean) => void,
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Check if a feature with dependencies is available
   */
  isAvailable(flag: FeatureFlag): boolean {
    // Vision requires TensorFlow
    if (flag === FeatureFlag.VISION) {
      return (
        this.isEnabled(FeatureFlag.TENSORFLOW) &&
        this.isEnabled(FeatureFlag.VISION)
      );
    }
    return this.isEnabled(flag);
  }

  /**
   * Get the configuration for a flag
   */
  getConfig(flag: FeatureFlag): FeatureFlagConfig {
    return FEATURE_FLAG_CONFIGS[flag];
  }

  /**
   * Get all flag configurations
   */
  getAllConfigs(): FeatureFlagConfig[] {
    return Object.values(FEATURE_FLAG_CONFIGS);
  }
}

// Export singleton instance
export const featureFlags = FeatureFlags.getInstance();

/**
 * Hook-style function for checking feature availability
 * (Can be used in non-React contexts)
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags.isEnabled(flag);
}
