// sanity.test.ts

describe('DeepTreeEchoBot Sanity Check', () => {
    it('should be able to import core bot components', async () => {
        const botModule = await import('./components/DeepTreeEchoBot/index.ts');
        expect(botModule).toBeDefined();
    });

    it('should have a defined chat context registration function', async () => {
        const { registerChatContext } = await import('./components/DeepTreeEchoBot/index.ts');
        expect(typeof registerChatContext).toBe('function');
    });

    it('should have a chat manager instance', async () => {
        const { chatManager } = await import('./components/DeepTreeEchoBot/index.ts');
        expect(chatManager).toBeDefined();
    });
});
