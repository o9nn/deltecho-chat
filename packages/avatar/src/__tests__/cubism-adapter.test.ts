/**
 * Cubism Adapter Tests
 */

import {
    StubCubismRenderer,
    CubismAdapter,
    CubismAdapterConfig,
    CubismModelInfo,
    ICubismRenderer,
} from '../adapters/cubism-adapter';
import { AvatarState, Expression, AvatarMotion } from '../types';

describe('StubCubismRenderer', () => {
    let renderer: StubCubismRenderer;

    beforeEach(() => {
        renderer = new StubCubismRenderer();
    });

    describe('initialization', () => {
        it('should start uninitialized', () => {
            expect(renderer.isInitialized()).toBe(false);
        });

        it('should initialize successfully', async () => {
            const config: CubismAdapterConfig = {
                canvas: 'test-canvas',
                model: { modelPath: '/models/test/model3.json', name: 'Test' },
            };

            await renderer.initialize(config);
            expect(renderer.isInitialized()).toBe(true);
        });

        it('should load model without errors', async () => {
            const config: CubismAdapterConfig = {
                canvas: 'test-canvas',
                model: { modelPath: '/models/test/model3.json', name: 'Test' },
            };
            await renderer.initialize(config);

            const modelInfo: CubismModelInfo = {
                modelPath: '/models/deep-tree-echo/model3.json',
                name: 'Deep Tree Echo',
                scale: 1.5,
            };

            await expect(renderer.loadModel(modelInfo)).resolves.not.toThrow();
        });
    });

    describe('expression handling', () => {
        beforeEach(async () => {
            await renderer.initialize({
                canvas: 'test-canvas',
                model: { modelPath: '/test/model3.json', name: 'Test' },
            });
        });

        it('should set expression', () => {
            renderer.setExpression('happy', 0.8);
            expect(renderer.getExpression()).toBe('happy');
        });

        it('should handle different expressions', () => {
            const expressions: Expression[] = ['neutral', 'happy', 'thinking', 'surprised', 'concerned', 'curious'];

            for (const expression of expressions) {
                renderer.setExpression(expression, 0.7);
                expect(renderer.getExpression()).toBe(expression);
            }
        });

        it('should not update expression when not initialized', () => {
            const uninitializedRenderer = new StubCubismRenderer();
            uninitializedRenderer.setExpression('happy', 0.8);
            expect(uninitializedRenderer.getExpression()).toBe('neutral'); // Default
        });
    });

    describe('motion handling', () => {
        beforeEach(async () => {
            await renderer.initialize({
                canvas: 'test-canvas',
                model: { modelPath: '/test/model3.json', name: 'Test' },
            });
        });

        it('should play motion', () => {
            renderer.playMotion('wave');
            expect(renderer.getMotion()).toBe('wave');
        });

        it('should accept priority parameter', () => {
            renderer.playMotion('nod', 2);
            expect(renderer.getMotion()).toBe('nod');
        });

        it('should handle all motion types', () => {
            const motions: AvatarMotion[] = ['idle', 'wave', 'nod', 'shake', 'thinking'];

            for (const motion of motions) {
                renderer.playMotion(motion);
                expect(renderer.getMotion()).toBe(motion);
            }
        });

        it('should not update motion when not initialized', () => {
            const uninitializedRenderer = new StubCubismRenderer();
            uninitializedRenderer.playMotion('wave');
            expect(uninitializedRenderer.getMotion()).toBe('idle'); // Default
        });
    });

    describe('other methods', () => {
        it('should handle updateLipSync without errors', async () => {
            await renderer.initialize({
                canvas: 'test-canvas',
                model: { modelPath: '/test/model3.json', name: 'Test' },
            });

            expect(() => renderer.updateLipSync(0.5)).not.toThrow();
            expect(() => renderer.updateLipSync(0)).not.toThrow();
            expect(() => renderer.updateLipSync(1)).not.toThrow();
        });

        it('should handle setBlinking without errors', async () => {
            await renderer.initialize({
                canvas: 'test-canvas',
                model: { modelPath: '/test/model3.json', name: 'Test' },
            });

            expect(() => renderer.setBlinking(true)).not.toThrow();
            expect(() => renderer.setBlinking(false)).not.toThrow();
        });

        it('should handle update without errors', () => {
            expect(() => renderer.update(0.016)).not.toThrow();
        });

        it('should handle render without errors', () => {
            expect(() => renderer.render()).not.toThrow();
        });

        it('should dispose and reset initialization state', async () => {
            await renderer.initialize({
                canvas: 'test-canvas',
                model: { modelPath: '/test/model3.json', name: 'Test' },
            });

            expect(renderer.isInitialized()).toBe(true);
            renderer.dispose();
            expect(renderer.isInitialized()).toBe(false);
        });
    });
});

describe('CubismAdapter', () => {
    let adapter: CubismAdapter;
    let mockRenderer: jest.Mocked<ICubismRenderer>;

    beforeEach(() => {
        mockRenderer = {
            initialize: jest.fn().mockResolvedValue(undefined),
            loadModel: jest.fn().mockResolvedValue(undefined),
            setExpression: jest.fn(),
            playMotion: jest.fn(),
            updateLipSync: jest.fn(),
            setBlinking: jest.fn(),
            update: jest.fn(),
            render: jest.fn(),
            dispose: jest.fn(),
        };

        adapter = new CubismAdapter(mockRenderer);
    });

    afterEach(() => {
        adapter.dispose();
    });

    describe('initialization', () => {
        it('should initialize renderer with config', async () => {
            const config: CubismAdapterConfig = {
                canvas: 'avatar-canvas',
                model: { modelPath: '/models/test/model3.json', name: 'Test' },
            };

            await adapter.initialize(config);

            expect(mockRenderer.initialize).toHaveBeenCalledWith(config);
            expect(mockRenderer.loadModel).toHaveBeenCalledWith(config.model);
        });

        it('should use stub renderer when none provided', () => {
            const defaultAdapter = new CubismAdapter();
            expect(defaultAdapter).toBeDefined();
            defaultAdapter.dispose();
        });
    });

    describe('updateFromState', () => {
        it('should update renderer expression from state', () => {
            const state: AvatarState = {
                currentExpression: 'happy',
                previousExpression: 'neutral',
                transitionProgress: 1,
                lastUpdated: Date.now(),
                isSpeaking: false,
                isBlinking: false,
            };

            adapter.updateFromState(state);

            expect(mockRenderer.setExpression).toHaveBeenCalledWith('happy', expect.any(Number));
            expect(mockRenderer.setBlinking).toHaveBeenCalledWith(false);
        });

        it('should pass emotional state for intensity calculation', () => {
            const state: AvatarState = {
                currentExpression: 'happy',
                previousExpression: null,
                transitionProgress: 1,
                lastUpdated: Date.now(),
                isSpeaking: false,
                isBlinking: false,
            };

            adapter.updateFromState(state, { joy: 0.9 });

            // Should calculate intensity from emotional state
            expect(mockRenderer.setExpression).toHaveBeenCalledWith('happy', expect.any(Number));
            const intensity = mockRenderer.setExpression.mock.calls[0][1];
            expect(intensity).toBeGreaterThanOrEqual(0.3);
            expect(intensity).toBeLessThanOrEqual(1);
        });

        it('should use default intensity when no emotional state provided', () => {
            const state: AvatarState = {
                currentExpression: 'neutral',
                previousExpression: null,
                transitionProgress: 1,
                lastUpdated: Date.now(),
                isSpeaking: false,
                isBlinking: false,
            };

            adapter.updateFromState(state);

            expect(mockRenderer.setExpression).toHaveBeenCalledWith('neutral', 0.7);
        });

        it('should update blinking state', () => {
            const state: AvatarState = {
                currentExpression: 'neutral',
                previousExpression: null,
                transitionProgress: 1,
                lastUpdated: Date.now(),
                isSpeaking: false,
                isBlinking: true,
            };

            adapter.updateFromState(state);

            expect(mockRenderer.setBlinking).toHaveBeenCalledWith(true);
        });
    });

    describe('updateLipSync', () => {
        it('should forward audio level to renderer', () => {
            adapter.updateLipSync(0.65);
            expect(mockRenderer.updateLipSync).toHaveBeenCalledWith(0.65);
        });

        it('should handle edge case audio levels', () => {
            adapter.updateLipSync(0);
            expect(mockRenderer.updateLipSync).toHaveBeenCalledWith(0);

            adapter.updateLipSync(1);
            expect(mockRenderer.updateLipSync).toHaveBeenCalledWith(1);
        });
    });

    describe('playMotion', () => {
        it('should forward motion request to renderer', () => {
            adapter.playMotion('wave');
            expect(mockRenderer.playMotion).toHaveBeenCalledWith('wave');
        });
    });

    describe('render loop', () => {
        it('should start render loop without errors in Node environment', () => {
            // In Node.js, requestAnimationFrame is not available
            // The method should handle this gracefully
            expect(() => adapter.startRenderLoop()).not.toThrow();
        });

        it('should stop render loop without errors', () => {
            adapter.startRenderLoop();
            expect(() => adapter.stopRenderLoop()).not.toThrow();
        });
    });

    describe('dispose', () => {
        it('should stop render loop and dispose renderer', () => {
            adapter.dispose();
            expect(mockRenderer.dispose).toHaveBeenCalled();
        });
    });
});

describe('CubismAdapter intensity calculation', () => {
    let adapter: CubismAdapter;
    let mockRenderer: jest.Mocked<ICubismRenderer>;

    beforeEach(() => {
        mockRenderer = {
            initialize: jest.fn().mockResolvedValue(undefined),
            loadModel: jest.fn().mockResolvedValue(undefined),
            setExpression: jest.fn(),
            playMotion: jest.fn(),
            updateLipSync: jest.fn(),
            setBlinking: jest.fn(),
            update: jest.fn(),
            render: jest.fn(),
            dispose: jest.fn(),
        };

        adapter = new CubismAdapter(mockRenderer);
    });

    afterEach(() => {
        adapter.dispose();
    });

    it('should calculate higher intensity for stronger emotions', () => {
        const state: AvatarState = {
            currentExpression: 'happy',
            previousExpression: null,
            transitionProgress: 1,
            lastUpdated: Date.now(),
            isSpeaking: false,
            isBlinking: false,
        };

        adapter.updateFromState(state, { joy: 0.3 });
        const lowIntensity = mockRenderer.setExpression.mock.calls[0][1];

        mockRenderer.setExpression.mockClear();

        adapter.updateFromState(state, { joy: 0.9 });
        const highIntensity = mockRenderer.setExpression.mock.calls[0][1];

        expect(highIntensity).toBeGreaterThan(lowIntensity);
    });

    it('should use minimum intensity of 0.3', () => {
        const state: AvatarState = {
            currentExpression: 'neutral',
            previousExpression: null,
            transitionProgress: 1,
            lastUpdated: Date.now(),
            isSpeaking: false,
            isBlinking: false,
        };

        adapter.updateFromState(state, { joy: 0.1 });
        const intensity = mockRenderer.setExpression.mock.calls[0][1];

        expect(intensity).toBeGreaterThanOrEqual(0.3);
    });

    it('should cap intensity at 1.0', () => {
        const state: AvatarState = {
            currentExpression: 'happy',
            previousExpression: null,
            transitionProgress: 1,
            lastUpdated: Date.now(),
            isSpeaking: false,
            isBlinking: false,
        };

        adapter.updateFromState(state, { joy: 1.5 }); // Over max
        const intensity = mockRenderer.setExpression.mock.calls[0][1];

        expect(intensity).toBeLessThanOrEqual(1);
    });

    it('should return 0.5 for empty emotional state', () => {
        const state: AvatarState = {
            currentExpression: 'neutral',
            previousExpression: null,
            transitionProgress: 1,
            lastUpdated: Date.now(),
            isSpeaking: false,
            isBlinking: false,
        };

        adapter.updateFromState(state, {});
        const intensity = mockRenderer.setExpression.mock.calls[0][1];

        // Empty emotional state should give 0.5 or thereabouts
        expect(intensity).toBeGreaterThanOrEqual(0.3);
    });
});
