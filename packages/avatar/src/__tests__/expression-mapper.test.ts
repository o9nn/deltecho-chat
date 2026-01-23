/**
 * Expression Mapper Tests
 */

import {
  mapEmotionToExpression,
  getExpressionIntensity,
  ExpressionMapper,
} from "../expression-mapper";

describe("mapEmotionToExpression", () => {
  it("should return neutral for all-zero emotions", () => {
    const emotionalState = {
      joy: 0,
      interest: 0,
      surprise: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      disgust: 0,
      contempt: 0,
    };

    expect(mapEmotionToExpression(emotionalState)).toBe("neutral");
  });

  it("should return happy for high joy", () => {
    const emotionalState = {
      joy: 0.8,
      interest: 0.1,
      surprise: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      disgust: 0,
      contempt: 0,
    };

    expect(mapEmotionToExpression(emotionalState)).toBe("happy");
  });

  it("should return thinking for high interest without surprise", () => {
    const emotionalState = {
      joy: 0.1,
      interest: 0.7,
      surprise: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      disgust: 0,
      contempt: 0,
    };

    expect(mapEmotionToExpression(emotionalState)).toBe("thinking");
  });

  it("should return surprised for high surprise", () => {
    const emotionalState = {
      joy: 0,
      interest: 0.1,
      surprise: 0.8,
      sadness: 0,
      anger: 0,
      fear: 0,
      disgust: 0,
      contempt: 0,
    };

    expect(mapEmotionToExpression(emotionalState)).toBe("surprised");
  });

  it("should return curious for moderate interest and surprise", () => {
    const emotionalState = {
      joy: 0,
      interest: 0.5,
      surprise: 0.4,
      sadness: 0,
      anger: 0,
      fear: 0,
      disgust: 0,
      contempt: 0,
    };

    expect(mapEmotionToExpression(emotionalState)).toBe("curious");
  });

  it("should return concerned for fear and sadness", () => {
    const emotionalState = {
      joy: 0,
      interest: 0,
      surprise: 0,
      sadness: 0.5,
      anger: 0,
      fear: 0.5,
      disgust: 0,
      contempt: 0,
    };

    expect(mapEmotionToExpression(emotionalState)).toBe("concerned");
  });

  it("should handle empty emotional state", () => {
    expect(mapEmotionToExpression({})).toBe("neutral");
  });

  it("should clamp values above 1", () => {
    const emotionalState = {
      joy: 1.5, // Should be clamped to 1
      interest: 0,
      surprise: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      disgust: 0,
      contempt: 0,
    };

    expect(mapEmotionToExpression(emotionalState)).toBe("happy");
  });

  it("should clamp negative values to 0", () => {
    const emotionalState = {
      joy: -0.5, // Should be clamped to 0
      interest: 0,
      surprise: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      disgust: 0,
      contempt: 0,
    };

    expect(mapEmotionToExpression(emotionalState)).toBe("neutral");
  });
});

describe("getExpressionIntensity", () => {
  it("should return higher intensity for stronger emotions", () => {
    const highJoy = { joy: 0.9, interest: 0, surprise: 0 };
    const lowJoy = { joy: 0.3, interest: 0, surprise: 0 };

    const highIntensity = getExpressionIntensity("happy", highJoy);
    const lowIntensity = getExpressionIntensity("happy", lowJoy);

    expect(highIntensity).toBeGreaterThan(lowIntensity);
  });

  it("should return 0.5 for unknown expression", () => {
    const state = { joy: 0.5 };
    // neutral is not in EXPRESSION_MAPPINGS, should return default
    expect(getExpressionIntensity("neutral", state)).toBe(0.5);
  });
});

describe("ExpressionMapper class", () => {
  let mapper: ExpressionMapper;

  beforeEach(() => {
    mapper = new ExpressionMapper();
  });

  it("should start with neutral expression", () => {
    expect(mapper.getExpression()).toBe("neutral");
  });

  it("should update expression when emotional state changes", () => {
    const changed = mapper.update({ joy: 0.8 });

    expect(changed).toBe(true);
    expect(mapper.getExpression()).toBe("happy");
  });

  it("should return false when expression does not change", () => {
    mapper.update({ joy: 0.8 });
    const changed = mapper.update({ joy: 0.85 }); // Still happy

    expect(changed).toBe(false);
  });

  it("should track expression history", () => {
    mapper.update({ joy: 0.8 }); // neutral -> happy
    mapper.update({ surprise: 0.9 }); // happy -> surprised

    const history = mapper.getHistory();

    expect(history.length).toBe(2);
    expect(history[0].expression).toBe("neutral");
    expect(history[1].expression).toBe("happy");
  });

  it("should reset to neutral", () => {
    mapper.update({ joy: 0.8 });
    mapper.reset();

    expect(mapper.getExpression()).toBe("neutral");
    expect(mapper.getHistory()).toHaveLength(0);
  });
});
