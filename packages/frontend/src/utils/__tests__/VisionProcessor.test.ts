import { VisionProcessor } from "../VisionProcessor";
import { ChatMessage } from "../LLMService";

describe("VisionProcessor", () => {
  test("constructVisionMessage creates correct structure", () => {
    const text = "What is in this image?";
    const imageUrls = ["http://example.com/image.jpg"];

    const message = VisionProcessor.constructVisionMessage(text, imageUrls);

    expect(message.role).toBe("user");
    expect(Array.isArray(message.content)).toBe(true);

    if (Array.isArray(message.content)) {
      expect(message.content).toHaveLength(2);
      expect(message.content[0].type).toBe("text");
      expect(message.content[0].text).toBe(text);
      expect(message.content[1].type).toBe("image_url");
      expect(message.content[1].image_url?.url).toBe(imageUrls[0]);
    }
  });

  test("isVisionMessage correctly identifies vision messages", () => {
    const textMsg: ChatMessage = { role: "user", content: "hello" };
    const visionMsg = VisionProcessor.constructVisionMessage("look", [
      "img.jpg",
    ]);

    expect(VisionProcessor.isVisionMessage(textMsg)).toBe(false);
    expect(VisionProcessor.isVisionMessage(visionMsg)).toBe(true);
  });
});
