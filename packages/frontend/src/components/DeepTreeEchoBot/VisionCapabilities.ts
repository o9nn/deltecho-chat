import { getLogger } from "../../../../shared/logger";
import { LLMService, CognitiveFunctionType } from "./LLMService";

const log = getLogger("render/components/DeepTreeEchoBot/VisionCapabilities");

export interface VisionCapabilitiesOptions {
  enabled: boolean;
  modelPath?: string;
}

export interface ImageAnalysisResult {
  description: string;
  tags: string[];
  objects: Array<{
    label: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  error?: string;
}

/**
 * VisionCapabilities - Provides image analysis capabilities for the Deep Tree Echo Bot
 *
 * All image analysis is performed by the LLM with vision capabilities.
 * No simulated, fake, or demo responses are generated.
 */
export class VisionCapabilities {
  private options: VisionCapabilitiesOptions;
  private llmService: LLMService;

  constructor(options: VisionCapabilitiesOptions) {
    this.options = {
      ...options,
    };
    this.llmService = LLMService.getInstance();
  }

  /**
   * Initialize the vision capabilities
   */
  async initialize(): Promise<boolean> {
    if (!this.options.enabled) {
      log.info("Vision capabilities are disabled");
      return false;
    }

    // Vision requires LLM service to be configured with at least GENERAL function
    if (!this.llmService.isFunctionConfigured(CognitiveFunctionType.GENERAL)) {
      throw new Error(
        "VISION_UNAVAILABLE: Vision requires a configured LLM service with vision capabilities.",
      );
    }

    log.info("Vision capabilities initialized (using LLM vision)");
    return true;
  }

  /**
   * Analyze an image using the LLM's vision capabilities
   *
   * All analysis is performed by the model - no simulated or fake responses.
   */
  async analyzeImage(imageData: string | Blob): Promise<ImageAnalysisResult> {
    if (!this.options.enabled) {
      throw new Error("VISION_DISABLED: Vision capabilities are disabled.");
    }

    // Convert Blob to base64 if needed
    let imageBase64: string;
    if (imageData instanceof Blob) {
      imageBase64 = await this.blobToBase64(imageData);
    } else {
      imageBase64 = imageData;
    }

    log.info("Analyzing image with LLM vision capabilities");

    // Use LLMService.analyzeImage which properly sends the image as multimodal content
    // All output comes from the model - no simulated or fake responses
    const response = await this.llmService.analyzeImage(imageBase64);

    // Parse the LLM response
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          description: parsed.description || response,
          objects: parsed.objects || [],
          tags: parsed.tags || [],
        };
      }

      // If no JSON, use the raw response as description
      return {
        description: response,
        objects: [],
        tags: [],
      };
    } catch (_parseError) {
      // If parsing fails, use raw response
      log.warn("Could not parse structured response, using raw text");
      return {
        description: response,
        objects: [],
        tags: [],
      };
    }
  }

  /**
   * Convert Blob to base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix if present
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<VisionCapabilitiesOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }
}
