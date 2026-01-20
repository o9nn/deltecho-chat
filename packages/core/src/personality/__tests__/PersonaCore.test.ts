import { PersonaCore } from "../PersonaCore";
import { InMemoryStorage } from "../../memory/storage";

describe("PersonaCore", () => {
  let storage: InMemoryStorage;
  let personaCore: PersonaCore;

  beforeEach(() => {
    storage = new InMemoryStorage();
    personaCore = new PersonaCore(storage);
  });

  describe("initialization", () => {
    it("should initialize with default values", () => {
      expect(personaCore).toBeDefined();
    });

    it("should use provided storage", () => {
      const customStorage = new InMemoryStorage();
      const persona = new PersonaCore(customStorage);
      expect(persona).toBeDefined();
    });

    it("should use in-memory storage when none provided", () => {
      const persona = new PersonaCore();
      expect(persona).toBeDefined();
    });
  });

  describe("personality management", () => {
    it("should get personality", () => {
      const personality = personaCore.getPersonality();
      expect(typeof personality).toBe("string");
      expect(personality.length).toBeGreaterThan(0);
    });

    it("should update personality", async () => {
      const newPersonality = "A new personality description";
      await personaCore.updatePersonality(newPersonality);

      const personality = personaCore.getPersonality();
      expect(personality).toBe(newPersonality);
    });
  });

  describe("emotional state", () => {
    it("should get emotional state", () => {
      const emotionalState = personaCore.getEmotionalState();

      expect(emotionalState).toBeDefined();
      expect(typeof emotionalState.joy).toBe("number");
      expect(typeof emotionalState.interest).toBe("number");
      expect(typeof emotionalState.surprise).toBe("number");
      expect(typeof emotionalState.sadness).toBe("number");
      expect(typeof emotionalState.anger).toBe("number");
      expect(typeof emotionalState.fear).toBe("number");
    });

    it("should have initial values between 0 and 1", () => {
      const emotionalState = personaCore.getEmotionalState();

      Object.values(emotionalState).forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it("should update emotional state with stimuli", async () => {
      const initialState = personaCore.getEmotionalState();
      const initialJoy = initialState.joy;

      await personaCore.updateEmotionalState({ joy: 0.5 });

      const newState = personaCore.getEmotionalState();
      // Joy should increase with positive stimulus
      expect(newState.joy).toBeGreaterThan(initialJoy);
    });

    it("should constrain values between 0 and 1", async () => {
      // Try to push joy very high
      await personaCore.updateEmotionalState({ joy: 100 });

      const emotionalState = personaCore.getEmotionalState();
      expect(emotionalState.joy).toBeLessThanOrEqual(1);
      expect(emotionalState.joy).toBeGreaterThanOrEqual(0);
    });

    it("should get dominant emotion", () => {
      const dominant = personaCore.getDominantEmotion();

      expect(dominant).toBeDefined();
      expect(dominant.emotion).toBeDefined();
      expect(typeof dominant.intensity).toBe("number");
      expect(dominant.intensity).toBeGreaterThanOrEqual(0);
      expect(dominant.intensity).toBeLessThanOrEqual(1);
    });
  });

  describe("cognitive state", () => {
    it("should get cognitive state", () => {
      const cognitiveState = personaCore.getCognitiveState();

      expect(cognitiveState).toBeDefined();
      expect(typeof cognitiveState.certainty).toBe("number");
      expect(typeof cognitiveState.curiosity).toBe("number");
      expect(typeof cognitiveState.creativity).toBe("number");
      expect(typeof cognitiveState.focus).toBe("number");
      expect(typeof cognitiveState.reflection).toBe("number");
    });

    it("should update cognitive state", async () => {
      await personaCore.updateCognitiveState({
        certainty: 0.9,
        curiosity: 0.95,
      });

      const cognitiveState = personaCore.getCognitiveState();
      expect(cognitiveState.certainty).toBe(0.9);
      expect(cognitiveState.curiosity).toBe(0.95);
    });
  });

  describe("self perception", () => {
    it("should get self perception", () => {
      const selfPerception = personaCore.getSelfPerception();
      expect(typeof selfPerception).toBe("string");
      expect(selfPerception).toBe("feminine");
    });

    it("should update self perception", async () => {
      await personaCore.updateSelfPerception("neutral");
      const selfPerception = personaCore.getSelfPerception();
      expect(selfPerception).toBe("neutral");
    });
  });

  describe("preferences", () => {
    it("should get preferences", () => {
      const preferences = personaCore.getPreferences();

      expect(preferences).toBeDefined();
      expect(preferences.presentationStyle).toBeDefined();
      expect(preferences.communicationTone).toBeDefined();
    });

    it("should update individual preference", async () => {
      await personaCore.updatePreference("presentationStyle", "professional");
      await personaCore.updatePreference("communicationTone", "formal");

      const preferences = personaCore.getPreferences();
      expect(preferences.presentationStyle).toBe("professional");
      expect(preferences.communicationTone).toBe("formal");
    });
  });

  describe("avatar configuration", () => {
    it("should get avatar config", () => {
      const avatarConfig = personaCore.getAvatarConfig();

      expect(avatarConfig).toBeDefined();
      expect(avatarConfig.displayName).toBe("Deep Tree Echo");
      expect(avatarConfig.primaryColor).toBeDefined();
      expect(avatarConfig.aesthetic).toBe("magnetic");
    });

    it("should get avatar image path", () => {
      const path = personaCore.getAvatarImagePath();
      expect(path).toContain("avatar");
    });

    it("should update avatar config", async () => {
      await personaCore.updateAvatarConfig({
        displayName: "Custom Name",
        primaryColor: "#ff0000",
      });

      const avatarConfig = personaCore.getAvatarConfig();
      expect(avatarConfig.displayName).toBe("Custom Name");
      expect(avatarConfig.primaryColor).toBe("#ff0000");
    });

    it("should set and get avatar data URL", async () => {
      const testData = "<svg>test</svg>";
      await personaCore.setAvatarImageData(testData);
      const dataUrl = personaCore.getAvatarDataUrl();
      expect(dataUrl).toContain("data:image/svg+xml");
    });
  });

  describe("opponent process", () => {
    it("should apply opponent process when emotion is high", async () => {
      // Set joy very high through multiple stimuli
      await personaCore.updateEmotionalState({ joy: 5 });
      await personaCore.updateEmotionalState({ joy: 5 });
      await personaCore.updateEmotionalState({ joy: 5 });

      const state = personaCore.getEmotionalState();
      // Joy should be high (clamped to 1)
      expect(state.joy).toBeGreaterThan(0.5);
    });
  });

  describe("storage handling", () => {
    it("should handle storage errors gracefully", () => {
      // Create persona with failing storage
      const failingStorage = {
        async load(_key: string) {
          throw new Error("Storage error");
        },
        async save(_key: string, _value: string) {
          throw new Error("Storage error");
        },
      };

      // Should not throw during construction
      const persona = new PersonaCore(failingStorage);
      expect(persona).toBeDefined();
    });
  });
});
