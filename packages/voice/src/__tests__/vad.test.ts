/**
 * Voice Activity Detection Tests
 */

import {
    VoiceActivityDetector,
    StubVoiceActivityDetector,
    createVAD,
    DEFAULT_VAD_CONFIG,
    VADEvent,
} from '../vad';

describe('VoiceActivityDetector', () => {
    let vad: VoiceActivityDetector;

    beforeEach(() => {
        vad = new VoiceActivityDetector();
    });

    afterEach(() => {
        vad.stop();
    });

    describe('in Node.js environment (no Web Audio API)', () => {
        it('should report not available', () => {
            expect(vad.isAvailable()).toBe(false);
        });

        it('should have correct initial state', () => {
            const state = vad.getState();
            expect(state.isSpeaking).toBe(false);
            expect(state.audioLevel).toBe(0);
            expect(state.isActive).toBe(false);
        });

        it('should emit error when trying to start', async () => {
            const listener = jest.fn();
            vad.onVADEvent(listener);

            await vad.start();

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'error',
                    error: 'Web Audio API not available',
                })
            );
        });
    });

    describe('configuration', () => {
        it('should use default config', () => {
            const config = vad.getConfig();
            expect(config.threshold).toBe(DEFAULT_VAD_CONFIG.threshold);
            expect(config.minSpeechDuration).toBe(DEFAULT_VAD_CONFIG.minSpeechDuration);
            expect(config.minSilenceDuration).toBe(DEFAULT_VAD_CONFIG.minSilenceDuration);
        });

        it('should accept custom config', () => {
            const customVAD = new VoiceActivityDetector({
                threshold: 0.05,
                minSpeechDuration: 100,
            });

            const config = customVAD.getConfig();
            expect(config.threshold).toBe(0.05);
            expect(config.minSpeechDuration).toBe(100);
            expect(config.minSilenceDuration).toBe(DEFAULT_VAD_CONFIG.minSilenceDuration);

            customVAD.stop();
        });

        it('should update config', () => {
            vad.setConfig({ threshold: 0.1 });
            expect(vad.getConfig().threshold).toBe(0.1);
        });
    });

    describe('state getters', () => {
        it('should return audio level', () => {
            expect(vad.getAudioLevel()).toBe(0);
        });

        it('should return speaking state', () => {
            expect(vad.isSpeaking()).toBe(false);
        });

        it('should return active state', () => {
            expect(vad.isActive()).toBe(false);
        });
    });

    describe('stop', () => {
        it('should not crash when stopping without starting', () => {
            expect(() => vad.stop()).not.toThrow();
        });

        it('should reset state on stop', () => {
            vad.stop();
            expect(vad.isActive()).toBe(false);
            expect(vad.isSpeaking()).toBe(false);
        });
    });

    describe('event handling', () => {
        it('should add and remove listeners', async () => {
            const listener = jest.fn();

            vad.onVADEvent(listener);
            await vad.start(); // Will emit error in Node.js
            expect(listener).toHaveBeenCalled();

            listener.mockClear();
            vad.offVADEvent(listener);
            await vad.start();
            expect(listener).not.toHaveBeenCalled();
        });
    });
});

describe('StubVoiceActivityDetector', () => {
    let stubVAD: StubVoiceActivityDetector;
    let eventListener: jest.Mock;

    beforeEach(() => {
        stubVAD = new StubVoiceActivityDetector();
        eventListener = jest.fn();
        stubVAD.onVADEvent(eventListener);
    });

    afterEach(() => {
        stubVAD.stop();
    });

    describe('initialization', () => {
        it('should report not available', () => {
            expect(stubVAD.isAvailable()).toBe(false);
        });

        it('should have correct initial state', () => {
            const state = stubVAD.getState();
            expect(state.isSpeaking).toBe(false);
            expect(state.audioLevel).toBe(0);
            expect(state.isActive).toBe(false);
        });
    });

    describe('start/stop', () => {
        it('should start successfully', async () => {
            await stubVAD.start();
            expect(stubVAD.isActive()).toBe(true);
        });

        it('should stop successfully', async () => {
            await stubVAD.start();
            stubVAD.stop();
            expect(stubVAD.isActive()).toBe(false);
        });
    });

    describe('simulation methods', () => {
        it('should simulate speech start', async () => {
            await stubVAD.start();
            stubVAD.simulateSpeechStart();

            expect(stubVAD.isSpeaking()).toBe(true);
            expect(eventListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'speech_start',
                })
            );
        });

        it('should simulate speech end', async () => {
            await stubVAD.start();
            stubVAD.simulateSpeechStart();
            stubVAD.simulateSpeechEnd();

            expect(stubVAD.isSpeaking()).toBe(false);
            expect(eventListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'speech_end',
                    duration: expect.any(Number),
                })
            );
        });

        it('should simulate audio level', async () => {
            await stubVAD.start();
            stubVAD.simulateAudioLevel(0.75);

            expect(stubVAD.getAudioLevel()).toBe(0.75);
            expect(eventListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'audio_level',
                    audioLevel: 0.75,
                })
            );
        });

        it('should handle speech duration calculation', async () => {
            await stubVAD.start();

            stubVAD.simulateSpeechStart();

            // Wait a bit to have measurable duration
            await new Promise((resolve) => setTimeout(resolve, 50));

            stubVAD.simulateSpeechEnd();

            const endEvent = eventListener.mock.calls.find(
                (call) => call[0].type === 'speech_end'
            );
            expect(endEvent).toBeDefined();
            expect(endEvent[0].duration).toBeGreaterThanOrEqual(0);
        });
    });

    describe('configuration', () => {
        it('should accept custom config', () => {
            const customStub = new StubVoiceActivityDetector({
                threshold: 0.1,
                minSpeechDuration: 300,
            });

            expect(customStub.getConfig().threshold).toBe(0.1);
            expect(customStub.getConfig().minSpeechDuration).toBe(300);
        });

        it('should update config', () => {
            stubVAD.setConfig({ threshold: 0.2 });
            expect(stubVAD.getConfig().threshold).toBe(0.2);
        });
    });

    describe('event handling', () => {
        it('should add and remove listeners', () => {
            const listener = jest.fn();

            stubVAD.onVADEvent(listener);
            stubVAD.simulateAudioLevel(0.5);
            expect(listener).toHaveBeenCalled();

            listener.mockClear();
            stubVAD.offVADEvent(listener);
            stubVAD.simulateAudioLevel(0.6);
            expect(listener).not.toHaveBeenCalled();
        });

        it('should include timestamp in events', () => {
            stubVAD.simulateSpeechStart();

            const event = eventListener.mock.calls[0][0] as VADEvent;
            expect(event.timestamp).toBeDefined();
            expect(typeof event.timestamp).toBe('number');
        });
    });
});

describe('createVAD factory', () => {
    it('should create VAD instance with default config', () => {
        const vad = createVAD();
        expect(vad).toBeInstanceOf(VoiceActivityDetector);
        expect(vad.getConfig().threshold).toBe(DEFAULT_VAD_CONFIG.threshold);
        vad.stop();
    });

    it('should create VAD instance with custom config', () => {
        const vad = createVAD({ threshold: 0.05 });
        expect(vad.getConfig().threshold).toBe(0.05);
        vad.stop();
    });
});

describe('DEFAULT_VAD_CONFIG', () => {
    it('should have sensible defaults', () => {
        expect(DEFAULT_VAD_CONFIG.threshold).toBeGreaterThan(0);
        expect(DEFAULT_VAD_CONFIG.threshold).toBeLessThan(1);
        expect(DEFAULT_VAD_CONFIG.minSpeechDuration).toBeGreaterThan(0);
        expect(DEFAULT_VAD_CONFIG.minSilenceDuration).toBeGreaterThan(0);
        expect(DEFAULT_VAD_CONFIG.fftSize).toBeGreaterThan(0);
        expect(DEFAULT_VAD_CONFIG.sampleRate).toBeGreaterThan(0);
    });

    it('should have FFT size as power of 2', () => {
        const fftSize = DEFAULT_VAD_CONFIG.fftSize;
        expect(Math.log2(fftSize) % 1).toBe(0);
    });
});
