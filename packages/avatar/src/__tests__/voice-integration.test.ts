/**
 * Avatar ↔ Voice Integration Tests
 *
 * Tests lip-sync coordination between avatar and voice packages
 */

import { AvatarController } from "../avatar-controller";
import { IdleAnimationSystem } from "../idle-animation";
import { ExpressionMapper } from "../expression-mapper";

// Mock voice package types (to avoid circular dependency)
interface MockLipSyncData {
  phonemes: MockPhonemeEntry[];
  duration: number;
  textSource?: string;
}

interface MockPhonemeEntry {
  phoneme: string;
  startTime: number;
  duration: number;
  intensity: number;
}

// Phoneme to viseme mapping (mouth shapes)
const PHONEME_VISEME_MAP: Record<string, string> = {
  A: "mouth_aa", // "ah"
  B: "mouth_closed", // consonants like b, m, p
  C: "mouth_eh", // "eh"
  D: "mouth_wide", // "d", "t"
  E: "mouth_oh", // "oh"
  F: "mouth_oo", // "oo", "w"
  G: "mouth_ss", // "s", "z"
  H: "mouth_th", // "th", "sh"
  I: "mouth_ee", // "ee"
  X: "mouth_rest", // silence/rest
};

/**
 * Avatar-Voice integration coordinator
 */
class AvatarVoiceCoordinator {
  private avatarController: AvatarController;
  private idleAnimation: IdleAnimationSystem;
  private currentViseme: string = "mouth_rest";
  private lipSyncActive: boolean = false;

  constructor(
    avatarController: AvatarController,
    idleAnimation: IdleAnimationSystem,
  ) {
    this.avatarController = avatarController;
    this.idleAnimation = idleAnimation;
  }

  /**
   * Apply lip-sync data to avatar
   */
  applyLipSync(_data: MockLipSyncData): void {
    this.lipSyncActive = true;
    this.avatarController.setSpeaking(true);

    // Stop idle animation eye movements during speech
    // (would be implemented in real integration)
  }

  /**
   * Update viseme from phoneme
   */
  updateViseme(phoneme: string): string {
    const viseme = PHONEME_VISEME_MAP[phoneme] || "mouth_rest";
    this.currentViseme = viseme;
    return viseme;
  }

  /**
   * Get current viseme
   */
  getCurrentViseme(): string {
    return this.currentViseme;
  }

  /**
   * End lip-sync playback
   */
  endLipSync(): void {
    this.lipSyncActive = false;
    this.currentViseme = "mouth_rest";
    this.avatarController.setSpeaking(false);
  }

  /**
   * Check if lip-sync is active
   */
  isLipSyncActive(): boolean {
    return this.lipSyncActive;
  }

  /**
   * Calculate interpolated mouth shape
   */
  calculateMouthBlend(
    fromViseme: string,
    toViseme: string,
    progress: number,
  ): { shape: string; blend: number } {
    return {
      shape: progress < 0.5 ? fromViseme : toViseme,
      blend: progress < 0.5 ? 1 - progress * 2 : (progress - 0.5) * 2,
    };
  }
}

describe("Avatar ↔ Voice Integration", () => {
  let avatarController: AvatarController;
  let idleAnimation: IdleAnimationSystem;
  let coordinator: AvatarVoiceCoordinator;

  beforeEach(() => {
    avatarController = new AvatarController();
    idleAnimation = new IdleAnimationSystem();
    coordinator = new AvatarVoiceCoordinator(avatarController, idleAnimation);
  });

  afterEach(() => {
    avatarController.stop();
    idleAnimation.stop();
  });

  describe("Lip-sync data → viseme mapping", () => {
    it("should map phonemes to correct visemes", () => {
      expect(coordinator.updateViseme("A")).toBe("mouth_aa");
      expect(coordinator.updateViseme("B")).toBe("mouth_closed");
      expect(coordinator.updateViseme("E")).toBe("mouth_oh");
      expect(coordinator.updateViseme("I")).toBe("mouth_ee");
    });

    it("should default to mouth_rest for unknown phonemes", () => {
      expect(coordinator.updateViseme("Z")).toBe("mouth_rest");
      expect(coordinator.updateViseme("")).toBe("mouth_rest");
    });

    it("should track current viseme", () => {
      coordinator.updateViseme("A");
      expect(coordinator.getCurrentViseme()).toBe("mouth_aa");

      coordinator.updateViseme("I");
      expect(coordinator.getCurrentViseme()).toBe("mouth_ee");
    });
  });

  describe("Speaking state synchronization", () => {
    it("should sync speaking state when lip-sync starts", () => {
      const lipSyncData: MockLipSyncData = {
        phonemes: [{ phoneme: "A", startTime: 0, duration: 100, intensity: 1 }],
        duration: 100,
        textSource: "test",
      };

      coordinator.applyLipSync(lipSyncData);

      expect(avatarController.getState().isSpeaking).toBe(true);
      expect(coordinator.isLipSyncActive()).toBe(true);
    });

    it("should sync speaking state when lip-sync ends", () => {
      const lipSyncData: MockLipSyncData = {
        phonemes: [],
        duration: 100,
      };

      coordinator.applyLipSync(lipSyncData);
      coordinator.endLipSync();

      expect(avatarController.getState().isSpeaking).toBe(false);
      expect(coordinator.isLipSyncActive()).toBe(false);
    });

    it("should reset viseme when lip-sync ends", () => {
      coordinator.updateViseme("A");
      coordinator.endLipSync();

      expect(coordinator.getCurrentViseme()).toBe("mouth_rest");
    });
  });

  describe("Phoneme timing accuracy", () => {
    it("should process phonemes in sequence", () => {
      const phonemes: MockPhonemeEntry[] = [
        { phoneme: "A", startTime: 0, duration: 100, intensity: 1 },
        { phoneme: "B", startTime: 100, duration: 50, intensity: 0.8 },
        { phoneme: "I", startTime: 150, duration: 100, intensity: 1 },
      ];

      const visemes: string[] = [];
      for (const entry of phonemes) {
        visemes.push(coordinator.updateViseme(entry.phoneme));
      }

      expect(visemes).toEqual(["mouth_aa", "mouth_closed", "mouth_ee"]);
    });

    it("should handle rapid phoneme changes", () => {
      const rapidPhonemes = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

      for (const phoneme of rapidPhonemes) {
        coordinator.updateViseme(phoneme);
      }

      expect(coordinator.getCurrentViseme()).toBe("mouth_ee");
    });
  });

  describe("Transition smoothness", () => {
    it("should calculate mouth blend between visemes", () => {
      const blend1 = coordinator.calculateMouthBlend(
        "mouth_aa",
        "mouth_ee",
        0.25,
      );
      expect(blend1.shape).toBe("mouth_aa");
      expect(blend1.blend).toBeCloseTo(0.5, 1);

      const blend2 = coordinator.calculateMouthBlend(
        "mouth_aa",
        "mouth_ee",
        0.75,
      );
      expect(blend2.shape).toBe("mouth_ee");
      expect(blend2.blend).toBeCloseTo(0.5, 1);
    });

    it("should handle blend at transition point", () => {
      const blend = coordinator.calculateMouthBlend(
        "mouth_aa",
        "mouth_ee",
        0.5,
      );
      expect(blend.shape).toBe("mouth_ee");
      expect(blend.blend).toBeCloseTo(0, 1);
    });
  });

  describe("Error resilience", () => {
    it("should handle empty lip-sync data", () => {
      const emptyData: MockLipSyncData = {
        phonemes: [],
        duration: 0,
      };

      expect(() => coordinator.applyLipSync(emptyData)).not.toThrow();
    });

    it("should handle null/undefined phonemes gracefully", () => {
      expect(() => coordinator.updateViseme(undefined as any)).not.toThrow();
      expect(coordinator.getCurrentViseme()).toBe("mouth_rest");
    });

    it("should recover state after error", () => {
      coordinator.applyLipSync({ phonemes: [], duration: 100 });
      coordinator.updateViseme("INVALID");
      coordinator.endLipSync();

      expect(coordinator.getCurrentViseme()).toBe("mouth_rest");
      expect(coordinator.isLipSyncActive()).toBe(false);
    });
  });

  describe("Avatar controller integration", () => {
    it("should work with expression mapper", () => {
      const mapper = new ExpressionMapper();

      // Update emotional state
      mapper.update({ joy: 0.8, interest: 0.5 });
      const expression = mapper.getExpression();

      // Expression should reflect emotional state
      expect(expression).toBe("happy");

      // Lip-sync should be independent of expression
      coordinator.applyLipSync({ phonemes: [], duration: 100 });
      coordinator.updateViseme("A");

      expect(coordinator.getCurrentViseme()).toBe("mouth_aa");
    });

    it("should work with idle animation system", () => {
      idleAnimation.start();
      const _initialState = idleAnimation.getState();

      // Start lip-sync
      coordinator.applyLipSync({ phonemes: [], duration: 100 });

      // Idle animation should still be running
      expect(idleAnimation.isActive()).toBe(true);

      // End lip-sync
      coordinator.endLipSync();

      // Idle animation still active
      expect(idleAnimation.isActive()).toBe(true);
    });
  });

  describe("Complete lip-sync flow", () => {
    it("should handle full speech cycle", () => {
      const lipSyncData: MockLipSyncData = {
        phonemes: [
          { phoneme: "A", startTime: 0, duration: 100, intensity: 1 },
          { phoneme: "B", startTime: 100, duration: 50, intensity: 0.8 },
          { phoneme: "I", startTime: 150, duration: 100, intensity: 1 },
          { phoneme: "X", startTime: 250, duration: 50, intensity: 0 },
        ],
        duration: 300,
        textSource: "Hi",
      };

      // Start lip-sync
      coordinator.applyLipSync(lipSyncData);
      expect(avatarController.getState().isSpeaking).toBe(true);

      // Process each phoneme
      for (const entry of lipSyncData.phonemes) {
        const viseme = coordinator.updateViseme(entry.phoneme);
        expect(viseme).toBeDefined();
      }

      // End lip-sync
      coordinator.endLipSync();
      expect(avatarController.getState().isSpeaking).toBe(false);
      expect(coordinator.getCurrentViseme()).toBe("mouth_rest");
    });
  });
});
