/**
 * Deep Tree Echo - Voice Demo
 *
 * Interactive demonstration of the Voice Pipeline including
 * VAD, Speech Recognition, Text-to-Speech, and Lip-Sync
 */

import {
  VoiceActivityDetector,
  createVoiceActivityDetector,
  SpeechRecognitionService,
  SpeechSynthesisService,
  createSpeechSynthesisService,
  LipSyncGenerator,
  createLipSyncGenerator,
  EmotionDetector,
  createEmotionDetector,
  type _VADEvent,
  type _RecognitionResult,
  type SynthesisEvent,
  type LipSyncData,
  type Viseme,
} from "../src/index.js";

/**
 * Emotion icons mapping
 */
const EMOTION_ICONS: Record<string, string> = {
  neutral: "😐",
  joy: "😊",
  sadness: "😢",
  anger: "😠",
  fear: "😨",
  surprise: "😲",
  disgust: "🤢",
  happy: "😊",
};

/**
 * Viseme shapes for CSS (simplified for demo)
 */
const VISEME_SHAPES: Record<
  string,
  { width: number; height: number; borderRadius: string }
> = {
  sil: { width: 30, height: 5, borderRadius: "50%" },
  PP: { width: 15, height: 8, borderRadius: "50%" },
  FF: { width: 35, height: 12, borderRadius: "3px" },
  TH: { width: 30, height: 15, borderRadius: "50%" },
  DD: { width: 25, height: 18, borderRadius: "50%" },
  kk: { width: 30, height: 20, borderRadius: "50%" },
  CH: { width: 28, height: 18, borderRadius: "50%" },
  SS: { width: 25, height: 10, borderRadius: "50%" },
  nn: { width: 28, height: 15, borderRadius: "50%" },
  RR: { width: 32, height: 18, borderRadius: "50%" },
  aa: { width: 40, height: 35, borderRadius: "50%" },
  E: { width: 45, height: 25, borderRadius: "50%" },
  ih: { width: 35, height: 20, borderRadius: "50%" },
  oh: { width: 35, height: 30, borderRadius: "50%" },
  ou: { width: 25, height: 28, borderRadius: "50%" },
};

/**
 * Voice Demo Controller
 */
class VoiceDemoController {
  // Services
  private vad: VoiceActivityDetector | null = null;
  private stt: SpeechRecognitionService | null = null;
  private tts: SpeechSynthesisService;
  private lipSync: LipSyncGenerator;
  private emotionDetector: EmotionDetector;

  // Audio context
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;

  // State
  private isListening: boolean = false;
  private inputMode: "vad" | "ptt" = "vad";
  private transcriptionText: string = "";
  private visemeHistory: string[] = [];

  // DOM elements
  private elements: {
    micBtn: HTMLButtonElement;
    micText: HTMLElement;
    waveformCanvas: HTMLCanvasElement;
    vadIndicator: HTMLElement;
    vadText: HTMLElement;
    levelBar: HTMLElement;
    levelValue: HTMLElement;
    transcriptionContent: HTMLElement;
    transcriptionInterim: HTMLElement;
    emotionIcon: HTMLElement;
    emotionName: HTMLElement;
    emotionConfidence: HTMLElement;
    ttsText: HTMLTextAreaElement;
    emotionSelect: HTMLSelectElement;
    speakBtn: HTMLButtonElement;
    stopBtn: HTMLButtonElement;
    pitchSlider: HTMLInputElement;
    rateSlider: HTMLInputElement;
    volumeSlider: HTMLInputElement;
    pitchValue: HTMLElement;
    rateValue: HTMLElement;
    volumeValue: HTMLElement;
    visemeMouth: HTMLElement;
    visemeShape: HTMLElement;
    visemeName: HTMLElement;
    timelineBar: HTMLElement;
    timelineProgress: HTMLElement;
    visemeList: HTMLElement;
    micStatus: HTMLElement;
    micStatusDot: HTMLElement;
    vadStatus: HTMLElement;
    vadStatusDot: HTMLElement;
    sttStatus: HTMLElement;
    sttStatusDot: HTMLElement;
    ttsStatus: HTMLElement;
    ttsStatusDot: HTMLElement;
  };

  constructor() {
    this.tts = createSpeechSynthesisService();
    this.lipSync = createLipSyncGenerator();
    this.emotionDetector = createEmotionDetector();

    this.elements = this.getElements();

    this.setupEventListeners();
    this.setupTTSEvents();
  }

  /**
   * Get DOM elements
   */
  private getElements() {
    return {
      micBtn: document.getElementById("mic-btn") as HTMLButtonElement,
      micText: document.querySelector(".mic-text") as HTMLElement,
      waveformCanvas: document.getElementById(
        "waveform-canvas",
      ) as HTMLCanvasElement,
      vadIndicator: document.getElementById("vad-indicator") as HTMLElement,
      vadText: document.querySelector(".vad-text") as HTMLElement,
      levelBar: document.getElementById("level-bar") as HTMLElement,
      levelValue: document.getElementById("level-value") as HTMLElement,
      transcriptionContent: document.getElementById(
        "transcription-content",
      ) as HTMLElement,
      transcriptionInterim: document.getElementById(
        "transcription-interim",
      ) as HTMLElement,
      emotionIcon: document.getElementById("emotion-icon") as HTMLElement,
      emotionName: document.getElementById("emotion-name") as HTMLElement,
      emotionConfidence: document.getElementById(
        "emotion-confidence",
      ) as HTMLElement,
      ttsText: document.getElementById("tts-text") as HTMLTextAreaElement,
      emotionSelect: document.getElementById(
        "emotion-select",
      ) as HTMLSelectElement,
      speakBtn: document.getElementById("speak-btn") as HTMLButtonElement,
      stopBtn: document.getElementById("stop-btn") as HTMLButtonElement,
      pitchSlider: document.getElementById("pitch-slider") as HTMLInputElement,
      rateSlider: document.getElementById("rate-slider") as HTMLInputElement,
      volumeSlider: document.getElementById(
        "volume-slider",
      ) as HTMLInputElement,
      pitchValue: document.getElementById("pitch-value") as HTMLElement,
      rateValue: document.getElementById("rate-value") as HTMLElement,
      volumeValue: document.getElementById("volume-value") as HTMLElement,
      visemeMouth: document.getElementById("viseme-mouth") as HTMLElement,
      visemeShape: document.querySelector(".viseme-shape") as HTMLElement,
      visemeName: document.getElementById("viseme-name") as HTMLElement,
      timelineBar: document.getElementById("timeline-bar") as HTMLElement,
      timelineProgress: document.getElementById(
        "timeline-progress",
      ) as HTMLElement,
      visemeList: document.getElementById("viseme-list") as HTMLElement,
      micStatus: document.getElementById("mic-status") as HTMLElement,
      micStatusDot: document.getElementById("mic-status-dot") as HTMLElement,
      vadStatus: document.getElementById("vad-status") as HTMLElement,
      vadStatusDot: document.getElementById("vad-status-dot") as HTMLElement,
      sttStatus: document.getElementById("stt-status") as HTMLElement,
      sttStatusDot: document.getElementById("stt-status-dot") as HTMLElement,
      ttsStatus: document.getElementById("tts-status") as HTMLElement,
      ttsStatusDot: document.getElementById("tts-status-dot") as HTMLElement,
    };
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Microphone button
    this.elements.micBtn.addEventListener("click", () => {
      if (this.isListening) {
        this.stopListening();
      } else {
        this.startListening();
      }
    });

    // Input mode toggle
    document.querySelectorAll('input[name="input-mode"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        this.inputMode = (e.target as HTMLInputElement).value as "vad" | "ptt";
      });
    });

    // TTS controls
    this.elements.speakBtn.addEventListener("click", () => {
      this.speak();
    });

    this.elements.stopBtn.addEventListener("click", () => {
      this.tts.stop();
    });

    // Slider controls
    this.elements.pitchSlider.addEventListener("input", () => {
      this.elements.pitchValue.textContent = this.elements.pitchSlider.value;
    });

    this.elements.rateSlider.addEventListener("input", () => {
      this.elements.rateValue.textContent = this.elements.rateSlider.value;
    });

    this.elements.volumeSlider.addEventListener("input", () => {
      this.elements.volumeValue.textContent = this.elements.volumeSlider.value;
    });

    // Emotion bars for simulation
    ["joy", "sadness", "anger", "fear", "surprise"].forEach((emotion) => {
      const bar = document.getElementById(`${emotion}-bar`) as HTMLElement;
      const value = document.getElementById(`${emotion}-value`) as HTMLElement;
      if (bar && value) {
        // Simulated random emotions for demo
        setInterval(() => {
          if (this.isListening) {
            const randomValue = Math.floor(Math.random() * 30);
            bar.style.width = `${randomValue}%`;
            value.textContent = `${randomValue}%`;
          }
        }, 2000);
      }
    });
  }

  /**
   * Set up TTS events
   */
  private setupTTSEvents(): void {
    this.tts.on("start", () => {
      this.updateStatus("tts", "Speaking", "active");
      this.elements.speakBtn.disabled = true;
      this.elements.stopBtn.disabled = false;
    });

    this.tts.on("end", () => {
      this.updateStatus("tts", "Idle", "");
      this.elements.speakBtn.disabled = false;
      this.elements.stopBtn.disabled = true;
    });

    this.tts.on("boundary", (event: SynthesisEvent) => {
      // Update lip-sync visualization
      if (event.word) {
        const lipSyncData = this.lipSync.generateFromText(event.word);
        if (lipSyncData.visemes.length > 0) {
          this.updateViseme(lipSyncData.visemes[0]);
        }
      }
    });
  }

  /**
   * Start listening for voice input
   */
  private async startListening(): Promise<void> {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      this.audioContext = new AudioContext();

      // Set up analyser for visualization
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      const source = this.audioContext.createMediaStreamSource(
        this.mediaStream,
      );
      source.connect(this.analyser);

      // Initialize VAD
      this.vad = createVoiceActivityDetector({
        threshold: 0.3,
        silenceTimeout: 1000,
      });

      this.vad.on("speechStart", () => {
        this.elements.vadIndicator.classList.add("speaking");
        this.elements.vadText.textContent = "Speaking...";
        this.updateStatus("vad", "Speech Detected", "active");
      });

      this.vad.on("speechEnd", () => {
        this.elements.vadIndicator.classList.remove("speaking");
        this.elements.vadText.textContent = "Not speaking";
        this.updateStatus("vad", "Silence", "");
      });

      // Initialize STT (simulated for demo)
      this.setupSimulatedSTT();

      this.isListening = true;
      this.elements.micBtn.classList.add("active");
      this.elements.micText.textContent = "Stop Listening";
      this.updateStatus("mic", "Active", "active");

      // Start visualization
      this.startVisualization();
    } catch (error) {
      console.error("Error starting voice input:", error);
      this.updateStatus("mic", "Error", "error");
    }
  }

  /**
   * Stop listening
   */
  private stopListening(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }

    if (this.audioContext) {
      this.audioContext.close();
    }

    this.isListening = false;
    this.elements.micBtn.classList.remove("active");
    this.elements.micText.textContent = "Start Listening";
    this.elements.vadIndicator.classList.remove("speaking");
    this.elements.vadText.textContent = "Not speaking";
    this.updateStatus("mic", "Inactive", "");
    this.updateStatus("vad", "Waiting", "");
  }

  /**
   * Set up simulated speech recognition (for demo purposes)
   */
  private setupSimulatedSTT(): void {
    // Simulate recognition results periodically
    const phrases = [
      "Hello, how are you today?",
      "I am testing the voice demo",
      "This is Deep Tree Echo speaking",
      "Can you hear me clearly?",
      "The weather is nice today",
    ];

    let lastUpdate = 0;

    const simulateRecognition = () => {
      if (this.isListening) {
        const now = Date.now();
        if (
          now - lastUpdate > 5000 && // Every 5 seconds
          Math.random() > 0.7 // Random chance
        ) {
          const phrase = phrases[Math.floor(Math.random() * phrases.length)];
          this.handleRecognitionResult({
            text: phrase,
            confidence: 0.85 + Math.random() * 0.15,
            isFinal: true,
          });
          lastUpdate = now;
        }

        requestAnimationFrame(simulateRecognition);
      }
    };

    requestAnimationFrame(simulateRecognition);
  }

  /**
   * Handle speech recognition result
   */
  private handleRecognitionResult(result: {
    text: string;
    confidence: number;
    isFinal: boolean;
  }): void {
    if (result.isFinal) {
      this.transcriptionText +=
        (this.transcriptionText ? " " : "") + result.text;
      this.elements.transcriptionContent.innerHTML = this.transcriptionText;
      this.elements.transcriptionInterim.textContent = "";
      this.updateStatus("stt", "Recognized", "active");

      // Detect emotion from text
      const emotion = this.emotionDetector.detectFromText(result.text);
      this.updateEmotionDisplay(emotion.dominant, emotion.confidence);
    } else {
      this.elements.transcriptionInterim.textContent = result.text;
      this.updateStatus("stt", "Listening...", "processing");
    }
  }

  /**
   * Update emotion display
   */
  private updateEmotionDisplay(emotion: string, confidence: number): void {
    this.elements.emotionIcon.textContent = EMOTION_ICONS[emotion] || "😐";
    this.elements.emotionName.textContent =
      emotion.charAt(0).toUpperCase() + emotion.slice(1);
    this.elements.emotionConfidence.textContent = `${Math.round(
      confidence * 100,
    )}%`;
  }

  /**
   * Start audio visualization
   */
  private startVisualization(): void {
    if (!this.analyser) return;

    const canvas = this.elements.waveformCanvas;
    const ctx = canvas.getContext("2d")!;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.isListening) return;

      this.animationFrameId = requestAnimationFrame(draw);
      this.analyser!.getByteTimeDomainData(dataArray);

      // Clear canvas
      ctx.fillStyle = "#252540";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#00d9ff";
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Update level meter
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufferLength);
      const db = Math.max(-60, 20 * Math.log10(rms));
      const normalizedLevel = Math.max(
        0,
        Math.min(100, ((db + 60) / 60) * 100),
      );

      this.elements.levelBar.style.width = `${normalizedLevel}%`;
      this.elements.levelValue.textContent = `${db.toFixed(1)} dB`;

      // Update VAD based on level (simplified)
      if (rms > 0.1) {
        this.elements.vadIndicator.classList.add("speaking");
        this.elements.vadText.textContent = "Speaking...";
      } else {
        this.elements.vadIndicator.classList.remove("speaking");
        this.elements.vadText.textContent = "Not speaking";
      }
    };

    draw();
  }

  /**
   * Speak text using TTS
   */
  private speak(): void {
    const text = this.elements.ttsText.value;
    const emotion = this.elements.emotionSelect.value;
    const pitch = parseFloat(this.elements.pitchSlider.value);
    const rate = parseFloat(this.elements.rateSlider.value);
    const volume = parseFloat(this.elements.volumeSlider.value);

    // Generate lip-sync data
    const lipSyncData = this.lipSync.generateFromText(text);
    this.displayLipSyncTimeline(lipSyncData);

    // Start TTS
    this.tts.speak(text, {
      pitch,
      rate,
      volume,
      emotion,
    });

    // Animate visemes
    this.animateVisemes(lipSyncData);
  }

  /**
   * Display lip-sync timeline
   */
  private displayLipSyncTimeline(data: LipSyncData): void {
    this.elements.timelineBar.innerHTML = "";
    this.visemeHistory = [];

    const totalDuration = data.duration || 1;

    data.visemes.forEach((viseme) => {
      const startPercent = (viseme.startTime / totalDuration) * 100;
      const widthPercent =
        ((viseme.endTime - viseme.startTime) / totalDuration) * 100;

      const marker = document.createElement("div");
      marker.className = "phoneme-marker";
      marker.style.left = `${startPercent}%`;
      marker.style.width = `${Math.max(widthPercent, 3)}%`;
      marker.textContent = viseme.viseme;
      this.elements.timelineBar.appendChild(marker);
    });
  }

  /**
   * Animate visemes during speech
   */
  private animateVisemes(data: LipSyncData): void {
    const startTime = Date.now();
    const totalDuration = (data.duration || 1) * 1000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / totalDuration);

      this.elements.timelineProgress.style.width = `${progress * 100}%`;

      // Find current viseme
      const currentTime = elapsed / 1000;
      const currentViseme = data.visemes.find(
        (v) => currentTime >= v.startTime && currentTime < v.endTime,
      );

      if (currentViseme) {
        this.updateViseme(currentViseme);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.updateViseme({
          viseme: "sil",
          startTime: 0,
          endTime: 0,
          phoneme: "",
        });
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Update viseme display
   */
  private updateViseme(viseme: Viseme): void {
    const shape = VISEME_SHAPES[viseme.viseme] || VISEME_SHAPES["sil"];

    this.elements.visemeShape.style.width = `${shape.width}px`;
    this.elements.visemeShape.style.height = `${shape.height}px`;
    this.elements.visemeShape.style.borderRadius = shape.borderRadius;

    this.elements.visemeName.textContent = viseme.viseme;

    // Update history
    if (!this.visemeHistory.includes(viseme.viseme)) {
      this.visemeHistory.unshift(viseme.viseme);
      if (this.visemeHistory.length > 10) {
        this.visemeHistory.pop();
      }
      this.renderVisemeHistory();
    }
  }

  /**
   * Render viseme history
   */
  private renderVisemeHistory(): void {
    this.elements.visemeList.innerHTML = this.visemeHistory
      .map(
        (v, i) =>
          `<span class="viseme-item ${i === 0 ? "active" : ""}">${v}</span>`,
      )
      .join("");
  }

  /**
   * Update status indicator
   */
  private updateStatus(type: string, text: string, state: string): void {
    const statusEl = this.elements[
      `${type}Status` as keyof typeof this.elements
    ] as HTMLElement;
    const dotEl = this.elements[
      `${type}StatusDot` as keyof typeof this.elements
    ] as HTMLElement;

    if (statusEl) statusEl.textContent = text;
    if (dotEl) {
      dotEl.className = "status-dot";
      if (state) dotEl.classList.add(state);
    }
  }
}

// Initialize demo when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new VoiceDemoController();
});

// Export for module usage
export { VoiceDemoController };
