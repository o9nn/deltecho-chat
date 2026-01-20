/**
 * Sentiment Analyzer Tests
 */

import {
  SentimentAnalyzer,
  createSentimentAnalyzer,
} from "../sentiment-analyzer";

describe("SentimentAnalyzer", () => {
  let analyzer: SentimentAnalyzer;

  beforeEach(() => {
    analyzer = new SentimentAnalyzer();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      expect(analyzer).toBeInstanceOf(SentimentAnalyzer);
    });

    it("should accept custom config", () => {
      const customAnalyzer = new SentimentAnalyzer({
        minConfidence: 0.5,
        detectEmotions: false,
      });
      expect(customAnalyzer).toBeInstanceOf(SentimentAnalyzer);
    });
  });

  describe("analyze", () => {
    it("should detect positive sentiment", () => {
      const result = analyzer.analyze("I am so happy and excited!");
      expect(result.polarity).toBeGreaterThan(0);
      expect(result.positive).toBeGreaterThan(0);
    });

    it("should detect negative sentiment", () => {
      const result = analyzer.analyze("This is terrible and awful");
      expect(result.polarity).toBeLessThan(0);
      expect(result.negative).toBeGreaterThan(0);
    });

    it("should detect neutral sentiment", () => {
      const result = analyzer.analyze("The weather is cloudy today");
      expect(Math.abs(result.polarity)).toBeLessThan(0.5);
    });

    it("should handle intensifiers", () => {
      const normal = analyzer.analyze("I am happy");
      const intense = analyzer.analyze("I am very happy");
      expect(intense.positive).toBeGreaterThan(normal.positive);
    });

    it("should handle negation", () => {
      const positive = analyzer.analyze("I am happy");
      const negated = analyzer.analyze("I am not happy");
      expect(negated.polarity).toBeLessThan(positive.polarity);
    });

    it("should detect emotions in text", () => {
      const result = analyzer.analyze("I am furious about this!");
      expect(result.emotions).toContain("anger");
    });

    it("should return confidence score", () => {
      const result = analyzer.analyze("I love this amazing product!");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should handle empty text", () => {
      const result = analyzer.analyze("");
      expect(result.polarity).toBe(0);
    });

    it("should track history", () => {
      analyzer.analyze("Happy message");
      analyzer.analyze("Sad message");
      expect(analyzer.getHistoryLength()).toBe(2);
    });
  });

  describe("extractEmotion", () => {
    it("should extract joy from happy messages", () => {
      const emotion = analyzer.extractEmotion("I am so happy and delighted!");
      expect(emotion.joy).toBeGreaterThan(0);
      expect(emotion.dominant).toBe("joy");
    });

    it("should extract sadness from sad messages", () => {
      const emotion = analyzer.extractEmotion("I feel so sad and lonely");
      expect(emotion.sadness).toBeGreaterThan(0);
    });

    it("should extract anger from angry messages", () => {
      const emotion = analyzer.extractEmotion("I am furious and outraged!");
      expect(emotion.anger).toBeGreaterThan(0);
    });

    it("should extract fear from fearful messages", () => {
      const emotion = analyzer.extractEmotion("I am scared and terrified");
      expect(emotion.fear).toBeGreaterThan(0);
    });

    it("should extract surprise from surprising messages", () => {
      const emotion = analyzer.extractEmotion("I am shocked and astonished!");
      expect(emotion.surprise).toBeGreaterThan(0);
    });

    it("should return neutral for neutral messages", () => {
      const emotion = analyzer.extractEmotion("The meeting is at 3pm");
      expect(emotion.dominant).toBe("neutral");
    });

    it("should calculate valence", () => {
      const positive = analyzer.extractEmotion("I am so happy!");
      expect(positive.valence).toBeGreaterThan(0);

      const negative = analyzer.extractEmotion("I am so sad");
      expect(negative.valence).toBeLessThan(0);
    });

    it("should calculate arousal", () => {
      const highArousal = analyzer.extractEmotion("I am furious!");
      const lowArousal = analyzer.extractEmotion("I feel sad");
      expect(highArousal.arousal).toBeGreaterThan(lowArousal.arousal);
    });

    it("should handle intensifiers in emotion extraction", () => {
      const normal = analyzer.extractEmotion("I am happy");
      const intense = analyzer.extractEmotion("I am extremely happy");
      expect(intense.joy).toBeGreaterThan(normal.joy);
    });
  });

  describe("getTrend", () => {
    it("should return stable for few messages", () => {
      analyzer.analyze("One message");
      const trend = analyzer.getTrend();
      expect(trend.direction).toBe("stable");
      expect(trend.strength).toBe(0);
    });

    it("should detect positive trend", () => {
      // Older negative messages
      analyzer.analyze("terrible");
      analyzer.analyze("awful");
      analyzer.analyze("bad");
      analyzer.analyze("poor");
      analyzer.analyze("mediocre");
      // Recent positive messages
      analyzer.analyze("good");
      analyzer.analyze("great");
      analyzer.analyze("excellent");
      analyzer.analyze("wonderful");
      analyzer.analyze("amazing");

      const trend = analyzer.getTrend();
      expect(trend.direction).toBe("positive");
    });
  });

  describe("getAverage", () => {
    it("should return zero for empty history", () => {
      const avg = analyzer.getAverage();
      expect(avg.polarity).toBe(0);
      expect(avg.confidence).toBe(0);
    });

    it("should calculate average polarity", () => {
      analyzer.analyze("happy");
      analyzer.analyze("sad");
      const avg = analyzer.getAverage();
      expect(typeof avg.polarity).toBe("number");
    });
  });

  describe("clearHistory", () => {
    it("should clear history", () => {
      analyzer.analyze("test 1");
      analyzer.analyze("test 2");
      expect(analyzer.getHistoryLength()).toBe(2);

      analyzer.clearHistory();
      expect(analyzer.getHistoryLength()).toBe(0);
    });
  });

  describe("factory function", () => {
    it("should create analyzer with createSentimentAnalyzer", () => {
      const a = createSentimentAnalyzer();
      expect(a).toBeInstanceOf(SentimentAnalyzer);
    });

    it("should accept config in factory", () => {
      const a = createSentimentAnalyzer({ detectEmotions: false });
      expect(a).toBeInstanceOf(SentimentAnalyzer);
    });
  });
});
