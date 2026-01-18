import { ChatMessage, ContentPart } from './LLMService';

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
        role: 'user' | 'system' = 'user'
    ): ChatMessage {
        const content: ContentPart[] = [
            {
                type: 'text',
                text: text,
            },
        ];

        imageUrls.forEach((url) => {
            content.push({
                type: 'image_url',
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
        if (typeof message.content === 'string') return false;
        return message.content.some(part => part.type === 'image_url');
    }
}
