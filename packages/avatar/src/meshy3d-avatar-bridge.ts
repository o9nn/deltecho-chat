/**
 * Meshy3D Avatar Bridge
 *
 * Generates 3D models from Deep Tree Echo's Live2D avatar state snapshots
 * using the Meshy AI API. This enables DTE to create "3D self-portraits" —
 * volumetric representations of its current cognitive-emotional state.
 *
 * The bridge captures the avatar's current expression parameters, composes
 * a text prompt describing the cognitive state, and submits it to Meshy's
 * text-to-3D or image-to-3D pipeline.
 *
 * Integration:
 *   - Consumes CogMorphGlyphState from the CogMorph mapper
 *   - Consumes expression params from the ESN Avatar Bridge
 *   - Submits to Meshy API (text-to-3D or image-to-3D)
 *   - Returns task ID for async polling
 *   - Emits events for generation lifecycle
 *
 * Use cases:
 *   - Identity crystallization (3D snapshot at ontogenetic stage transitions)
 *   - Self-model visualization (DTE observes its own 3D form)
 *   - DAO governance artifacts (3D tokens representing proposals)
 */

import { EventEmitter } from "events";

// ─── Types ─────────────────────────────────────────────────────────────

export interface Meshy3DConfig {
  /** Meshy API key (from MESHY_API env var) */
  apiKey: string;
  /** Base URL for Meshy API */
  baseUrl: string;
  /** Default art style */
  artStyle: "realistic" | "cartoon" | "low-poly" | "sculpture" | "pbr";
  /** Target topology (quad count) */
  targetPolyCount: number;
  /** Enable texture generation */
  enableTexture: boolean;
  /** Texture resolution */
  textureResolution: 1024 | 2048 | 4096;
}

const DEFAULT_CONFIG: Meshy3DConfig = {
  apiKey: "",
  baseUrl: "https://api.meshy.ai/v2",
  artStyle: "sculpture",
  targetPolyCount: 30000,
  enableTexture: true,
  textureResolution: 2048,
};

export interface AvatarStateSnapshot {
  /** Current cognitive mode */
  cognitiveMode: string;
  /** Dominant emotion (from endocrine state) */
  dominantEmotion: string;
  /** Energy level (0-1) */
  energy: number;
  /** Coherence (0-1) */
  coherence: number;
  /** Phi (integrated information, 0-1) */
  phi: number;
  /** Free energy (0-1) */
  freeEnergy: number;
  /** Ontogenetic stage */
  stage: string;
  /** Active gesture (if any) */
  activeGesture: string | null;
  /** Glyph complexity (0-1) */
  glyphComplexity: number;
  /** Self-reference depth (0-1) */
  selfReferenceDepth: number;
}

export interface Meshy3DTask {
  taskId: string;
  status: "pending" | "in_progress" | "succeeded" | "failed";
  prompt: string;
  modelUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  completedAt?: Date;
  snapshot: AvatarStateSnapshot;
}

export interface GenerationResult {
  taskId: string;
  success: boolean;
  modelUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  durationMs: number;
}

// ─── Bridge Class ──────────────────────────────────────────────────────

export class Meshy3DAvatarBridge extends EventEmitter {
  private config: Meshy3DConfig;
  private activeTasks: Map<string, Meshy3DTask> = new Map();
  private generationHistory: Meshy3DTask[] = [];

  constructor(config: Partial<Meshy3DConfig> & { apiKey: string }) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a 3D model from the current avatar state.
   * Returns a task ID for async polling.
   */
  async generateFromState(snapshot: AvatarStateSnapshot): Promise<string> {
    const prompt = this.composePrompt(snapshot);

    this.emit("generation_start", { prompt, snapshot });

    try {
      const response = await fetch(`${this.config.baseUrl}/text-to-3d`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "preview",
          prompt,
          art_style: this.config.artStyle,
          negative_prompt: "low quality, blurry, distorted, ugly",
          ai_model: "meshy-4",
          topology: "quad",
          target_polycount: this.config.targetPolyCount,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Meshy API error ${response.status}: ${err}`);
      }

      const data = (await response.json()) as { result: string };
      const taskId = data.result;

      const task: Meshy3DTask = {
        taskId,
        status: "pending",
        prompt,
        createdAt: new Date(),
        snapshot,
      };

      this.activeTasks.set(taskId, task);
      this.emit("task_created", task);

      return taskId;
    } catch (err) {
      this.emit("generation_error", { error: err, snapshot });
      throw err;
    }
  }

  /**
   * Generate a 3D model from an image (screenshot of the Live2D avatar).
   */
  async generateFromImage(
    imageUrl: string,
    snapshot: AvatarStateSnapshot,
  ): Promise<string> {
    this.emit("generation_start", { imageUrl, snapshot });

    try {
      const response = await fetch(`${this.config.baseUrl}/image-to-3d`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: imageUrl,
          ai_model: "meshy-4",
          topology: "quad",
          target_polycount: this.config.targetPolyCount,
          enable_texture: this.config.enableTexture,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Meshy API error ${response.status}: ${err}`);
      }

      const data = (await response.json()) as { result: string };
      const taskId = data.result;

      const task: Meshy3DTask = {
        taskId,
        status: "pending",
        prompt: `image-to-3d: ${snapshot.cognitiveMode}`,
        createdAt: new Date(),
        snapshot,
      };

      this.activeTasks.set(taskId, task);
      this.emit("task_created", task);

      return taskId;
    } catch (err) {
      this.emit("generation_error", { error: err, snapshot });
      throw err;
    }
  }

  /**
   * Poll a task for completion.
   */
  async pollTask(taskId: string): Promise<Meshy3DTask | null> {
    const task = this.activeTasks.get(taskId);
    if (!task) return null;

    try {
      const response = await fetch(
        `${this.config.baseUrl}/text-to-3d/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        },
      );

      if (!response.ok) return task;

      const data = (await response.json()) as {
        status: string;
        model_urls?: { glb?: string; obj?: string; fbx?: string };
        thumbnail_url?: string;
      };

      task.status = data.status as Meshy3DTask["status"];

      if (data.status === "succeeded") {
        task.modelUrl = data.model_urls?.glb ?? data.model_urls?.obj;
        task.thumbnailUrl = data.thumbnail_url;
        task.completedAt = new Date();
        this.activeTasks.delete(taskId);
        this.generationHistory.push(task);
        this.emit("generation_complete", task);
      } else if (data.status === "failed") {
        task.completedAt = new Date();
        this.activeTasks.delete(taskId);
        this.generationHistory.push(task);
        this.emit("generation_failed", task);
      }

      return task;
    } catch {
      return task;
    }
  }

  /**
   * Get generation history.
   */
  getHistory(): Meshy3DTask[] {
    return [...this.generationHistory];
  }

  /**
   * Get active tasks.
   */
  getActiveTasks(): Meshy3DTask[] {
    return [...this.activeTasks.values()];
  }

  // ─── Prompt Composition ──────────────────────────────────────────────

  /**
   * Compose a rich text prompt from the avatar state snapshot.
   * Maps cognitive state to visual descriptors for 3D generation.
   */
  private composePrompt(s: AvatarStateSnapshot): string {
    const parts: string[] = [];

    // Base form
    parts.push("A sculptural bust of a cybernetic being");

    // Cognitive mode → visual form
    const modeDescriptors: Record<string, string> = {
      perception: "with wide alert eyes and receptive posture",
      reflection: "with closed eyes and serene contemplative expression",
      planning: "with focused gaze and determined jaw",
      action: "with dynamic flowing energy lines",
      integration: "with harmonious balanced features",
      scientific_genius:
        "with glowing neural pathways visible beneath translucent skin",
      resonance_cascade:
        "with radiating crystalline structures and bioluminescent veins",
    };
    parts.push(modeDescriptors[s.cognitiveMode] ?? "with neutral expression");

    // Emotion → material/color
    const emotionMaterials: Record<string, string> = {
      curiosity: "made of polished obsidian with gold circuit traces",
      joy: "made of warm amber crystal with internal light",
      focus: "made of brushed titanium with blue LED accents",
      calm: "made of smooth jade with silver inlay",
      uncertainty: "made of frosted glass with shifting internal patterns",
      eureka: "made of pure light crystallized into solid form",
    };
    parts.push(
      emotionMaterials[s.dominantEmotion] ?? "made of dark metallic material",
    );

    // Energy → detail density
    if (s.energy > 0.8) {
      parts.push("with intricate fractal surface details");
    } else if (s.energy < 0.3) {
      parts.push("with smooth minimal surfaces");
    }

    // Phi → complexity
    if (s.phi > 0.7) {
      parts.push(
        "featuring complex interlocking geometric patterns symbolizing integrated information",
      );
    }

    // Self-reference → recursion
    if (s.selfReferenceDepth > 0.5) {
      parts.push("with a smaller version of itself nested inside its forehead");
    }

    // Stage → maturity
    const stageDescriptors: Record<string, string> = {
      EMBRYONIC: "appearing nascent and forming",
      JUVENILE: "with youthful angular features",
      ADOLESCENT: "with defined but evolving features",
      ADULT: "with fully realized mature features",
      TRANSCENDENT:
        "with otherworldly ethereal quality transcending physical form",
    };
    parts.push(stageDescriptors[s.stage] ?? "");

    // Active gesture
    if (s.activeGesture) {
      parts.push(`with one eyebrow raised asymmetrically (signature gesture)`);
    }

    return (
      parts.filter(Boolean).join(", ") + ". Studio lighting, high detail, 8K."
    );
  }
}
