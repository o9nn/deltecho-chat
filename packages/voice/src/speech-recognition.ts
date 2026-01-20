/**
 * Speech Recognition Service for Deep Tree Echo
 *
 * Wraps the Web Speech API's SpeechRecognition interface with
 * event handling and configuration management.
 */

import { EventEmitter } from "events";
import {
  RecognitionConfig,
  DEFAULT_RECOGNITION_CONFIG,
  RecognitionEvent,
  RecognitionEventListener,
  RecognitionResult,
} from "./types";

// Re-export types for convenience
export {
  RecognitionEvent,
  RecognitionEventListener,
  RecognitionResult,
  RecognitionConfig,
};

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

/**
 * Check if running in browser with Web Speech API
 */
function getSpeechRecognition(): {
  new (): SpeechRecognition;
} | null {
  if (typeof window === "undefined") return null;

   
  const win = window as any;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: ((event: Event) => void) | null;
}

/**
 * SpeechRecognitionService provides speech-to-text capabilities
 */
export class SpeechRecognitionService extends EventEmitter {
  private config: RecognitionConfig;
  private recognition: SpeechRecognition | null = null;
  private isListeningInternal = false;

  constructor(config: Partial<RecognitionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_RECOGNITION_CONFIG, ...config };
    this.initRecognition();
  }

  /**
   * Initialize the speech recognition instance
   */
  private initRecognition(): void {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      return;
    }

    this.recognition = new SpeechRecognitionClass();
    this.applyConfig();
    this.setupEventHandlers();
  }

  /**
   * Apply configuration to recognition instance
   */
  private applyConfig(): void {
    if (!this.recognition) return;

    this.recognition.lang = this.config.lang;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
  }

  /**
   * Set up event handlers for recognition
   */
  private setupEventHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListeningInternal = true;
      this.emitEvent({ type: "start" });
    };

    this.recognition.onend = () => {
      this.isListeningInternal = false;
      this.emitEvent({ type: "end" });
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = this.processResults(event);
      this.emitEvent({ type: "result", results });
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.isListeningInternal = false;
      if (event.error === "no-speech") {
        this.emitEvent({ type: "no_speech" });
      } else {
        this.emitEvent({
          type: "error",
          error: event.error || "Unknown error",
        });
      }
    };

    this.recognition.onnomatch = () => {
      this.emitEvent({ type: "no_speech" });
    };
  }

  /**
   * Process recognition results into our format
   */
  private processResults(event: SpeechRecognitionEvent): RecognitionResult[] {
    const results: RecognitionResult[] = [];

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      for (let j = 0; j < result.length; j++) {
        const alternative = result[j];
        results.push({
          transcript: alternative.transcript,
          confidence: alternative.confidence,
          isFinal: result.isFinal,
        });
      }
    }

    return results;
  }

  /**
   * Check if recognition is available
   */
  isAvailable(): boolean {
    return this.recognition !== null;
  }

  /**
   * Check if currently listening
   */
  isListening(): boolean {
    return this.isListeningInternal;
  }

  /**
   * Start listening for speech
   */
  start(): void {
    if (!this.recognition) {
      this.emitEvent({
        type: "error",
        error: "Speech recognition not available",
      });
      return;
    }

    if (this.isListeningInternal) {
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      this.emitEvent({
        type: "error",
        error:
          error instanceof Error
            ? error.message
            : "Failed to start recognition",
      });
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (this.recognition && this.isListeningInternal) {
      this.recognition.stop();
    }
  }

  /**
   * Abort recognition immediately
   */
  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.isListeningInternal = false;
    }
  }

  /**
   * Update recognition configuration
   */
  setConfig(config: Partial<RecognitionConfig>): void {
    this.config = { ...this.config, ...config };
    this.applyConfig();
  }

  /**
   * Get current configuration
   */
  getConfig(): RecognitionConfig {
    return { ...this.config };
  }

  /**
   * Add event listener
   */
  onRecognitionEvent(listener: RecognitionEventListener): void {
    this.on("recognition_event", listener);
  }

  /**
   * Remove event listener
   */
  offRecognitionEvent(listener: RecognitionEventListener): void {
    this.off("recognition_event", listener);
  }

  /**
   * Emit recognition event
   */
  private emitEvent(event: RecognitionEvent): void {
    this.emit("recognition_event", event);
  }
}

/**
 * Create a speech recognition service with default configuration
 */
export function createSpeechRecognition(
  config?: Partial<RecognitionConfig>,
): SpeechRecognitionService {
  return new SpeechRecognitionService(config);
}
