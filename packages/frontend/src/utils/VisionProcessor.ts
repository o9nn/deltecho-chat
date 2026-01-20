import { ChatMessage, ContentPart } from "./LLMService";

export class VisionProcessor {
  /**
   * Converts a File object to a base64 data URL.
   */
  public static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Constructs a multi-modal ChatMessage with text and images.
   */
  public static constructVisionMessage(
    text: string,
    imageUrls: string[],
    role: "user" | "system" = "user",
  ): ChatMessage {
    const content: ContentPart[] = [
      {
        type: "text",
        text: text,
      },
    ];

    imageUrls.forEach((url) => {
      content.push({
        type: "image_url",
        image_url: {
          url: url,
        },
      });
    });

    return {
      role,
      content,
    };
  }

  /**
   * Validates if the message content structure is compatible with vision API.
   */
  public static isVisionMessage(message: ChatMessage): boolean {
    if (typeof message.content === "string") return false;
    return message.content.some((part) => part.type === "image_url");
  }

  /**
   * Extracts keyframes from a video URL.
   * @param videoUrl The URL of the video.
   * @param numFrames Number of frames to extract.
   * @returns Array of base64 data URLs.
   */
  public static async extractVideoFrames(
    videoUrl: string,
    numFrames: number = 3,
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = false;

      const frames: string[] = [];

      // Timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        reject(new Error("Video frame extraction timed out"));
      }, 10000);

      video.onloadedmetadata = async () => {
        try {
          const duration = video.duration || 1; // Default to 1 if duration unknown (stream)
          // Take frames at 25%, 50%, 75%
          const timestamps = Array.from(
            { length: numFrames },
            (_, i) => (duration * (i + 1)) / (numFrames + 1),
          );

          for (const time of timestamps) {
            await new Promise<void>((seekResolve) => {
              const onSeek = () => {
                video.removeEventListener("seeked", onSeek);
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  frames.push(canvas.toDataURL("image/jpeg", 0.7));
                }
                seekResolve();
              };
              video.currentTime = time;
              // Verify if seek triggers, if already at time? Usually fine.
              video.addEventListener("seeked", onSeek);
            });
          }
          clearTimeout(timeoutId);
          resolve(frames);
        } catch (e) {
          clearTimeout(timeoutId);
          reject(e);
        } finally {
          video.src = "";
        }
      };

      video.onerror = (e) => {
        clearTimeout(timeoutId);
        reject(
          new Error(
            `Failed to load video: ${(e as any).message || "unknown error"}`,
          ),
        );
      };
    });
  }
}
