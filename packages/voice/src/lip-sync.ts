/**
 * Lip-Sync Generation for Deep Tree Echo Avatar
 *
 * Generates phoneme timing data from audio or text for avatar lip synchronization.
 * Uses audio analysis and text-to-phoneme mapping.
 */

import { EventEmitter } from "events";

/**
 * Phoneme types for lip-sync animation
 * Based on Preston Blair phonemes (simplified for avatar animation)
 */
export type Phoneme =
  | "A" // Open mouth (ah, a)
  | "B" // Closed (b, p, m)
  | "C" // Slightly open (e, eh)
  | "D" // Wide open (ai, ay)
  | "E" // Round (o, oh)
  | "F" // Long (oo, u)
  | "G" // Teeth (f, v)
  | "H" // Tongue (l, th)
  | "X" // Rest/Silence
  | "I"; // Ee sound (ee, i)

/**
 * Phoneme timing entry
 */
export interface PhonemeEntry {
  phoneme: Phoneme;
  startTime: number; // milliseconds
  duration: number; // milliseconds
  intensity: number; // 0-1, how pronounced the phoneme is
}

/**
 * Lip-sync data for a segment of audio/text
 */
export interface LipSyncData {
  phonemes: PhonemeEntry[];
  duration: number; // total duration in ms
  textSource?: string;
}

/**
 * Lip-sync event types
 */
export type LipSyncEventType =
  | "phoneme_start"
  | "phoneme_end"
  | "sync_complete"
  | "error";

/**
 * Lip-sync event
 */
export interface LipSyncEvent {
  type: LipSyncEventType;
  timestamp: number;
  phoneme?: PhonemeEntry;
  error?: string;
}

/**
 * Event listener type
 */
export type LipSyncEventListener = (event: LipSyncEvent) => void;

/**
 * Character to phoneme mapping (simplified English approximation)
 */
const CHAR_TO_PHONEME: Record<string, Phoneme> = {
  // Vowels
  a: "A",
  e: "C",
  i: "I",
  o: "E",
  u: "F",
  // Consonants - closed mouth
  b: "B",
  p: "B",
  m: "B",
  // Consonants - teeth
  f: "G",
  v: "G",
  // Consonants - tongue
  l: "H",
  t: "H",
  d: "H",
  n: "H",
  // Wide
  w: "E",
  y: "I",
  // Default for other consonants
  c: "H",
  g: "H",
  h: "A",
  j: "H",
  k: "H",
  q: "H",
  r: "C",
  s: "H",
  x: "H",
  z: "H",
};

/**
 * Common letter combinations to phoneme mapping
 */
const DIGRAPH_TO_PHONEME: Record<string, Phoneme> = {
  th: "H",
  sh: "H",
  ch: "H",
  ee: "I",
  oo: "F",
  ai: "D",
  ay: "D",
  ou: "E",
  ow: "E",
  ea: "I",
  ie: "I",
  oi: "D",
  oy: "D",
};

/**
 * Configuration for lip-sync generation
 */
export interface LipSyncConfig {
  /** Average phoneme duration in ms */
  averagePhoneDuration: number;
  /** Minimum phoneme duration in ms */
  minPhoneDuration: number;
  /** Maximum phoneme duration in ms */
  maxPhoneDuration: number;
  /** Words per minute for timing estimation */
  wordsPerMinute: number;
  /** Rest duration between words in ms */
  wordGapDuration: number;
}

/**
 * Default lip-sync configuration
 */
export const DEFAULT_LIPSYNC_CONFIG: LipSyncConfig = {
  averagePhoneDuration: 80,
  minPhoneDuration: 40,
  maxPhoneDuration: 200,
  wordsPerMinute: 150,
  wordGapDuration: 100,
};

/**
 * Lip-sync generator service
 */
export class LipSyncGenerator extends EventEmitter {
  private config: LipSyncConfig;
  private playbackIntervalId: ReturnType<typeof setInterval> | null = null;
  private currentData: LipSyncData | null = null;
  private currentIndex: number = 0;
  private playbackStartTime: number = 0;

  constructor(config: Partial<LipSyncConfig> = {}) {
    super();
    this.config = { ...DEFAULT_LIPSYNC_CONFIG, ...config };
  }

  /**
   * Generate lip-sync data from text
   */
  generateFromText(text: string): LipSyncData {
    const phonemes: PhonemeEntry[] = [];
    let currentTime = 0;

    // Clean and normalize text
    const normalizedText = text.toLowerCase().replace(/[^a-z\s]/g, "");
    const words = normalizedText.split(/\s+/).filter((w) => w.length > 0);

    for (const word of words) {
      const wordPhonemes = this.wordToPhonemes(word, currentTime);
      phonemes.push(...wordPhonemes);

      // Update time to end of word plus gap
      if (wordPhonemes.length > 0) {
        const lastPhoneme = wordPhonemes[wordPhonemes.length - 1];
        currentTime =
          lastPhoneme.startTime +
          lastPhoneme.duration +
          this.config.wordGapDuration;
      }
    }

    // Add final rest
    if (phonemes.length > 0) {
      phonemes.push({
        phoneme: "X",
        startTime: currentTime,
        duration: this.config.wordGapDuration,
        intensity: 0,
      });
      currentTime += this.config.wordGapDuration;
    }

    return {
      phonemes,
      duration: phonemes.length > 0 ? currentTime : 0,
      textSource: text,
    };
  }

  /**
   * Convert a word to phoneme entries
   */
  private wordToPhonemes(word: string, startTime: number): PhonemeEntry[] {
    const phonemes: PhonemeEntry[] = [];
    let currentTime = startTime;
    let i = 0;

    while (i < word.length) {
      let phoneme: Phoneme;
      let charConsumed = 1;

      // Check for digraphs first (2-letter combinations)
      if (i < word.length - 1) {
        const digraph = word.substring(i, i + 2);
        if (DIGRAPH_TO_PHONEME[digraph]) {
          phoneme = DIGRAPH_TO_PHONEME[digraph];
          charConsumed = 2;
        } else {
          phoneme = CHAR_TO_PHONEME[word[i]] || "X";
        }
      } else {
        phoneme = CHAR_TO_PHONEME[word[i]] || "X";
      }

      // Calculate duration based on phoneme type
      const duration = this.calculatePhoneDuration(phoneme);
      const intensity = this.calculateIntensity(phoneme);

      phonemes.push({
        phoneme,
        startTime: currentTime,
        duration,
        intensity,
      });

      currentTime += duration;
      i += charConsumed;
    }

    return phonemes;
  }

  /**
   * Calculate duration for a phoneme
   */
  private calculatePhoneDuration(phoneme: Phoneme): number {
    // Vowels tend to be longer
    const base = this.config.averagePhoneDuration;
    switch (phoneme) {
      case "A":
      case "D":
      case "E":
      case "F":
      case "I":
        // Vowels - slightly longer
        return base * 1.2;
      case "B":
        // Closed mouth - shorter
        return base * 0.6;
      case "X":
        // Rest
        return base * 0.5;
      default:
        return base;
    }
  }

  /**
   * Calculate intensity for a phoneme
   */
  private calculateIntensity(phoneme: Phoneme): number {
    switch (phoneme) {
      case "A":
      case "D":
        return 1.0; // Wide open
      case "E":
      case "F":
        return 0.8; // Round/long
      case "C":
      case "I":
        return 0.6; // Slightly open
      case "G":
      case "H":
        return 0.5; // Teeth/tongue
      case "B":
        return 0.3; // Closed
      case "X":
        return 0;
      default:
        return 0.5;
    }
  }

  /**
   * Generate lip-sync data from audio level stream
   * Uses RMS audio levels to estimate mouth openness
   */
  generateFromAudioLevel(
    audioLevel: number,
    duration: number = 100,
  ): PhonemeEntry {
    // Map audio level (0-1) to phoneme
    let phoneme: Phoneme;
    let intensity: number;

    if (audioLevel < 0.05) {
      phoneme = "X";
      intensity = 0;
    } else if (audioLevel < 0.2) {
      phoneme = "B";
      intensity = audioLevel / 0.2;
    } else if (audioLevel < 0.4) {
      phoneme = "C";
      intensity = (audioLevel - 0.2) / 0.2;
    } else if (audioLevel < 0.6) {
      phoneme = "E";
      intensity = (audioLevel - 0.4) / 0.2;
    } else if (audioLevel < 0.8) {
      phoneme = "D";
      intensity = (audioLevel - 0.6) / 0.2;
    } else {
      phoneme = "A";
      intensity = Math.min(1, (audioLevel - 0.8) / 0.2 + 0.8);
    }

    return {
      phoneme,
      startTime: 0,
      duration,
      intensity,
    };
  }

  /**
   * Start playback of lip-sync data
   */
  startPlayback(data: LipSyncData): void {
    this.stopPlayback();
    this.currentData = data;
    this.currentIndex = 0;
    this.playbackStartTime = Date.now();

    // Emit first phoneme start immediately
    if (data.phonemes.length > 0) {
      this.emitEvent("phoneme_start", { phoneme: data.phonemes[0] });
    }

    // Check phonemes at 30fps
    this.playbackIntervalId = setInterval(() => {
      this.updatePlayback();
    }, 33);
  }

  /**
   * Stop playback
   */
  stopPlayback(): void {
    if (this.playbackIntervalId) {
      clearInterval(this.playbackIntervalId);
      this.playbackIntervalId = null;
    }
    this.currentData = null;
    this.currentIndex = 0;
  }

  /**
   * Update playback state and emit events
   */
  private updatePlayback(): void {
    if (!this.currentData) return;

    const elapsed = Date.now() - this.playbackStartTime;
    const phonemes = this.currentData.phonemes;

    // Find current phoneme
    while (
      this.currentIndex < phonemes.length &&
      elapsed >=
        phonemes[this.currentIndex].startTime +
          phonemes[this.currentIndex].duration
    ) {
      // End current phoneme
      this.emitEvent("phoneme_end", { phoneme: phonemes[this.currentIndex] });
      this.currentIndex++;

      // Start next phoneme if available
      if (
        this.currentIndex < phonemes.length &&
        elapsed >= phonemes[this.currentIndex].startTime
      ) {
        this.emitEvent("phoneme_start", {
          phoneme: phonemes[this.currentIndex],
        });
      }
    }

    // Check if playback is complete
    if (elapsed >= this.currentData.duration) {
      this.emitEvent("sync_complete", {});
      this.stopPlayback();
    }
  }

  /**
   * Get current phoneme during playback
   */
  getCurrentPhoneme(): PhonemeEntry | null {
    if (
      !this.currentData ||
      this.currentIndex >= this.currentData.phonemes.length
    ) {
      return null;
    }
    return this.currentData.phonemes[this.currentIndex];
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<LipSyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LipSyncConfig {
    return { ...this.config };
  }

  /**
   * Add event listener
   */
  onLipSyncEvent(listener: LipSyncEventListener): void {
    this.on("lipsync_event", listener);
  }

  /**
   * Remove event listener
   */
  offLipSyncEvent(listener: LipSyncEventListener): void {
    this.off("lipsync_event", listener);
  }

  /**
   * Emit lip-sync event
   */
  private emitEvent(type: LipSyncEventType, data: Partial<LipSyncEvent>): void {
    const event: LipSyncEvent = {
      type,
      timestamp: Date.now(),
      ...data,
    };
    this.emit("lipsync_event", event);
  }
}

/**
 * Factory function to create LipSyncGenerator
 */
export function createLipSyncGenerator(
  config?: Partial<LipSyncConfig>,
): LipSyncGenerator {
  return new LipSyncGenerator(config);
}

/**
 * Map phoneme to mouth shape for avatar
 * Returns a value 0-1 representing mouth openness
 */
export function phonemeToMouthShape(entry: PhonemeEntry): {
  mouthOpen: number;
  mouthWide: number;
  lipRound: number;
} {
  const { phoneme, intensity } = entry;

  switch (phoneme) {
    case "A":
      return {
        mouthOpen: 1.0 * intensity,
        mouthWide: 0.5 * intensity,
        lipRound: 0,
      };
    case "B":
      return { mouthOpen: 0, mouthWide: 0, lipRound: 0 };
    case "C":
      return {
        mouthOpen: 0.4 * intensity,
        mouthWide: 0.6 * intensity,
        lipRound: 0,
      };
    case "D":
      return {
        mouthOpen: 0.8 * intensity,
        mouthWide: 1.0 * intensity,
        lipRound: 0,
      };
    case "E":
      return {
        mouthOpen: 0.6 * intensity,
        mouthWide: 0,
        lipRound: 0.8 * intensity,
      };
    case "F":
      return {
        mouthOpen: 0.3 * intensity,
        mouthWide: 0,
        lipRound: 1.0 * intensity,
      };
    case "G":
      return {
        mouthOpen: 0.2 * intensity,
        mouthWide: 0.3 * intensity,
        lipRound: 0,
      };
    case "H":
      return { mouthOpen: 0.3 * intensity, mouthWide: 0, lipRound: 0 };
    case "I":
      return {
        mouthOpen: 0.3 * intensity,
        mouthWide: 0.8 * intensity,
        lipRound: 0,
      };
    case "X":
    default:
      return { mouthOpen: 0, mouthWide: 0, lipRound: 0 };
  }
}
