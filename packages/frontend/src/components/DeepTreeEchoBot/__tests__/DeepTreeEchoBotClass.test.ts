import { DeepTreeEchoBot } from '../DeepTreeEchoBot';
import { LLMService } from '../LLMService';
import { VisionProcessor } from '../../../utils/VisionProcessor';
import { BackendRemote } from '../../../backend-com';

// Mock AvatarStateManager
jest.mock('../AvatarStateManager', () => ({
    setAvatarListening: jest.fn(),
    setAvatarThinking: jest.fn(),
    setAvatarResponding: jest.fn(),
    setAvatarIdle: jest.fn(),
    setAvatarError: jest.fn(),
    stopLipSync: jest.fn()
}));

// Mock dependencies
jest.mock('../LLMService');
jest.mock('../../../utils/VisionProcessor');
jest.mock('../../../backend-com', () => ({
    BackendRemote: {
        rpc: {
            miscSendTextMessage: jest.fn()
        }
    }
}));
jest.mock('../PersonaCore', () => ({
    PersonaCore: {
        getInstance: jest.fn().mockReturnValue({
            getInstance: jest.fn()
        })
    }
}));
jest.mock('../RAGMemoryStore', () => ({
    RAGMemoryStore: {
        getInstance: jest.fn().mockReturnValue({
            setEnabled: jest.fn(),
            storeMemory: jest.fn()
        })
    }
}));
jest.mock('../SelfReflection', () => ({
    SelfReflection: {
        getInstance: jest.fn().mockReturnValue({
            getInstance: jest.fn()
        })
    }
}));
jest.mock('../AgentToolExecutor', () => ({
    AgentToolExecutor: {
        getInstance: jest.fn().mockReturnValue({
            executeTool: jest.fn()
        })
    }
}));
jest.mock('../AgenticLLMService', () => ({
    AgenticLLMService: {
        getInstance: jest.fn().mockReturnValue({
            configure: jest.fn(),
            processMessageAgentic: jest.fn()
        })
    }
}));

describe('DeepTreeEchoBot Class', () => {
    let bot: DeepTreeEchoBot;
    let mockLLMService: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup LLMService mock instance
        mockLLMService = {
            setConfig: jest.fn(),
            setFunctionConfig: jest.fn(),
            generateResponse: jest.fn().mockResolvedValue('Mock Response'),
            isConfigured: jest.fn().mockReturnValue(true),
            activeFunctions: []
        };
        (LLMService.getInstance as jest.Mock).mockReturnValue(mockLLMService);

        // Setup VisionProcessor mock
        (VisionProcessor.constructVisionMessage as jest.Mock).mockImplementation((text, images) => ({
            role: 'user',
            content: [
                { type: 'text', text },
                ...images.map((url: string) => ({ type: 'image_url', image_url: { url } }))
            ]
        }));
    });

    it('should process message with images using VisionProcessor', async () => {
        const options: any = {
            enabled: true,
            visionEnabled: true,
            memoryEnabled: false,
            webAutomationEnabled: false,
            embodimentEnabled: false,
            useParallelProcessing: false
        };
        bot = new DeepTreeEchoBot(options);

        const message = {
            text: 'Look at this',
            images: ['http://example.com/image.jpg']
        };

        // Call processMessage with 4 args: accountId, chatId, msgId, message
        await bot.processMessage(1, 100, 200, message);

        // Verify VisionProcessor usage
        expect(VisionProcessor.constructVisionMessage).toHaveBeenCalledWith('Look at this', ['http://example.com/image.jpg']);

        // Verify LLMService call
        expect(mockLLMService.generateResponse).toHaveBeenCalled();
        const args = mockLLMService.generateResponse.mock.calls[0][0];
        // args should be the messages array
        expect(Array.isArray(args)).toBe(true);
        const userMsg = args.find((m: any) => m.role === 'user');
        expect(userMsg.content).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'text', text: 'Look at this' }),
            expect.objectContaining({ type: 'image_url', image_url: { url: 'http://example.com/image.jpg' } })
        ]));
    });

    it('should trigger analyzeAndStoreVisualMemory when memory and vision enabled', async () => {
        const options: any = {
            enabled: true,
            visionEnabled: true,
            memoryEnabled: true, // Must be true
            webAutomationEnabled: false,
            embodimentEnabled: false,
            useParallelProcessing: false
        };
        bot = new DeepTreeEchoBot(options);

        // Spy on private method if possible, or verify side effects
        // Since analyzeAndStoreVisualMemory is private, we verify side effects:
        // 1. LLMService called with analysis prompt
        // 2. MemoryStore called with metadata

        const message = {
            text: 'Analyze this',
            images: ['http://example.com/image.jpg']
        };

        // We need to wait for the async operation inside processMessage which is not awaited
        // Hack: processMessage awaits generateAndSendResponse, but generateAndSendResponse does NOT await analyzeAndStoreVisualMemory
        // So we need to wait a tick
        await bot.processMessage(1, 100, 200, message);

        // Wait for async promises to settle
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify LLMService was called TWICE: 
        // 1. For the main response
        // 2. For the visual analysis
        console.log('generateResponse calls:', mockLLMService.generateResponse.mock.calls.length);
        expect(mockLLMService.generateResponse).toHaveBeenCalledTimes(2);

        // Find the call that used the analysis prompt
        const calls = mockLLMService.generateResponse.mock.calls;
        const analysisCall = calls.find((call: any) => {
            const msgs = call[0];
            return msgs.some((m: any) => m.content[0].text.includes('Analyze these images and provide a detailed'));
        });

        expect(analysisCall).toBeDefined();

        // Verify MemoryStore was called with metadata
        // We need to access the mock instance of RAGMemoryStore
        // The mock factory returns an object with storeMemory
        // BUT we need to get the specific instance used by the bot
        // In the bot constructor: this.memoryStore = RAGMemoryStore.getInstance()
        // And we mocked getInstance to return an object.

        // Let's get the mock instance from the class
        const memoryStoreMock = (require('../RAGMemoryStore').RAGMemoryStore.getInstance)();

        expect(memoryStoreMock.storeMemory).toHaveBeenCalled();

        const memoryCalls = memoryStoreMock.storeMemory.mock.calls;
        const visualMemory = memoryCalls.find((call: any) => call[0].metadata?.type === 'visual_analysis');

        expect(visualMemory).toBeDefined();
        expect(visualMemory[0].metadata.image_urls).toEqual(['http://example.com/image.jpg']);
    });

    it('should fallback to text-only if vision disabled', async () => {
        const options: any = {
            enabled: true,
            visionEnabled: false,
            memoryEnabled: false,
            webAutomationEnabled: false,
            embodimentEnabled: false
        };
        bot = new DeepTreeEchoBot(options);

        const message = {
            text: 'Look at this',
            images: ['http://example.com/image.jpg']
        };

        await bot.processMessage(1, 100, 200, message);

        expect(VisionProcessor.constructVisionMessage).not.toHaveBeenCalled();
        // LLMService should be called with standard string or text content
        // Based on logic: `userMessage = { role: 'user', content: messageText }`
    });
});
