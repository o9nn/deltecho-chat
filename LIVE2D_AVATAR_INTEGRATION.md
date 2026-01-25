# Live2D Avatar Integration

This document describes the integration of Live2D avatars with the Deep Tree Echo bot.

## Overview

The Deep Tree Echo avatar system provides a visual representation of the AI companion that responds to:

- **Cognitive state** - Emotional valence and arousal from the cognitive bridge
- **Processing state** - Listening, thinking, responding, idle, or error states
- **Lip sync** - Audio level for mouth animation during responses

## Components

### 1. DeepTreeEchoAvatarDisplay

**File:** `packages/frontend/src/components/DeepTreeEchoBot/DeepTreeEchoAvatarDisplay.tsx`

Main React component that renders the Live2D avatar.

**Features:**

- Integrates with @deltecho/avatar's Live2DAvatarManager
- Maps cognitive/emotional states to avatar expressions
- Supports both floating and inline display modes
- Handles fallback to sprite avatar on Live2D failure
- Responsive design for different screen sizes

**Expression Mapping:**

- `neutral` - Default state
- `happy` - High positive valence, low arousal
- `playful` - High positive valence, medium arousal
- `surprised` - High positive valence, high arousal
- `thinking` - Processing state
- `curious` - Neutral valence, high arousal
- `concerned` - Negative valence
- `contemplative` - Low arousal, reflective
- `focused` - Responding state

### 2. DeepTreeEchoAvatarContext

**File:** `packages/frontend/src/components/DeepTreeEchoBot/DeepTreeEchoAvatarContext.tsx`

React Context provider for global avatar state management.

**Features:**

- Centralized avatar state (processing state, speaking, audio level)
- Configuration persistence via localStorage
- Hooks for accessing and controlling avatar state
- Integration with AvatarStateManager for external control

**Exported Hooks:**

- `useDeepTreeEchoAvatar()` - Required context (throws if not in provider)
- `useDeepTreeEchoAvatarOptional()` - Optional context (returns null if not available)

### 3. AvatarStateManager

**File:** `packages/frontend/src/components/DeepTreeEchoBot/AvatarStateManager.ts`

Module for controlling avatar state from bot integration and other components.

**State Functions:**

- `setAvatarIdle()` - Reset to idle state
- `setAvatarListening()` - User typing or message received
- `setAvatarThinking()` - Bot processing message
- `setAvatarResponding()` - Bot generating/sending response
- `setAvatarError()` - Error occurred
- `stopLipSync()` - Stop lip sync animation

**Features:**

- Simulated lip sync with random audio levels
- Automatic cleanup and timeouts
- Singleton pattern for global access

### 4. DeepTreeEchoAvatarDisplay.scss

**File:** `packages/frontend/src/components/DeepTreeEchoBot/DeepTreeEchoAvatarDisplay.scss`

Styling for avatar display component.

**Features:**

- Floating avatar with fixed positioning (bottom-right)
- Inline avatar for embedded display
- Status indicator with animated badge
- Responsive design for mobile devices
- Dark theme support
- Smooth transitions and hover effects

## Integration Points

### MessageListAndComposer.tsx

Added floating avatar display to chat interface:

```tsx
{
  isAvatarEnabled && <DeepTreeEchoAvatarDisplay position="floating" />;
}
```

Avatar is shown when:

- `deepTreeEchoBotEnabled` setting is true
- `deepTreeEchoBotAvatarEnabled` setting is not explicitly false

### DeepTreeEchoBot.ts

Integrated avatar state updates in message processing flow:

1. **Message Received** → `setAvatarListening()`
2. **Processing** → `setAvatarThinking()`
3. **Generating Response** → `setAvatarResponding()` (with lip sync)
4. **Complete** → `setAvatarIdle()`
5. **Error** → `setAvatarError()` → timeout → `setAvatarIdle()`

## Configuration

### Settings

The avatar can be controlled via DeltaChat desktop settings:

- `deepTreeEchoBotEnabled` - Enable/disable the bot (required for avatar)
- `deepTreeEchoBotAvatarEnabled` - Enable/disable the avatar display
- Avatar config saved to localStorage: `deepTreeEchoAvatarConfig`

### Default Configuration

```typescript
{
  visible: true,
  position: 'floating',
  width: 300,
  height: 300,
  model: 'miara', // Default Live2D model
}
```

## Cognitive State Integration

The avatar integrates with Deep Tree Echo's cognitive architecture:

1. **CognitiveBridge** provides `UnifiedCognitiveState` with:
   - `emotionalValence` (-1 to 1, negative to positive)
   - `emotionalArousal` (0 to 1, calm to excited)
   - `salienceScore` (0 to 1, attention/importance)

2. **State Mapping** converts cognitive state to:
   - Avatar expressions (neutral, happy, thinking, etc.)
   - Emotional vectors for fine-tuned animation
   - Motion triggers (nodding, tilting head, etc.)

3. **Processing States** map to expressions:
   - `IDLE` → neutral expression
   - `LISTENING` → tilting head motion
   - `THINKING` → thinking expression + thinking motion
   - `RESPONDING` → focused expression + nodding motion + lip sync
   - `ERROR` → concerned expression

## Usage

### Basic Usage

The avatar appears automatically when enabled in settings. No additional code is required in chat components.

### Programmatic Control

```typescript
import {
  setAvatarThinking,
  setAvatarResponding,
  setAvatarIdle,
} from "./components/DeepTreeEchoBot/AvatarStateManager";

// Control avatar from any component
setAvatarThinking();
// ... process something ...
setAvatarResponding();
// ... after response ...
setAvatarIdle();
```

### Using Context

```typescript
import { useDeepTreeEchoAvatar } from "./components/DeepTreeEchoBot";

function MyComponent() {
  const { state, controller, setProcessingState, updateConfig } =
    useDeepTreeEchoAvatar();

  // Access avatar state or control directly
  const { processingState, isSpeaking, config } = state;

  // Update configuration
  updateConfig({ visible: false });

  // Control processing state
  setProcessingState(AvatarProcessingState.THINKING);

  // Use avatar controller for advanced control
  controller?.playMotion("wave");
  controller?.setExpression("happy", 0.8);
}
```

## Testing

### Manual Testing

1. Enable Deep Tree Echo Bot in settings
2. Send a message to trigger bot response
3. Observe avatar state changes:
   - Listening when message received
   - Thinking during processing
   - Responding with lip sync during response
   - Idle when complete

### Fallback Behavior

If Live2D fails to load:

- Avatar automatically falls back to sprite-based avatar
- Error overlay shown briefly
- All state transitions still work
- No impact on bot functionality

## Performance Considerations

1. **Live2D Rendering:** GPU-accelerated via PixiJS
2. **State Updates:** Throttled to 500ms intervals
3. **Memory:** Avatar state kept minimal, models loaded on demand
4. **Cleanup:** Automatic disposal on unmount

## Future Enhancements

- [ ] Voice-driven lip sync (real audio analysis)
- [ ] Custom avatar models per user preference
- [ ] Avatar gesture library for richer expressions
- [ ] Avatar camera follow (eyes track mouse)
- [ ] Multiple avatar positioning options (corners, sidebar)
- [ ] Avatar customization UI
- [ ] Advanced emotional state visualizations
- [ ] Integration with voice synthesis for better lip sync
- [ ] Avatar idle animations (breathing, blinking, looking around)
- [ ] Avatar interaction triggers (click to talk, hover effects)

## Troubleshooting

### Avatar Not Showing

- Check that `deepTreeEchoBotEnabled` is true
- Check that `deepTreeEchoBotAvatarEnabled` is not false
- Check browser console for Live2D loading errors
- Verify @deltecho/avatar package is installed

### Avatar Frozen/Not Animating

- Check that CognitiveBridge is initialized
- Check that AvatarStateManager registration occurred
- Verify message processing is triggering state updates

### Performance Issues

- Reduce avatar size in config
- Use sprite mode instead of Live2D
- Check GPU acceleration is enabled in browser

## Related Documentation

- [Deep Tree Echo Documentation](./RAGBOT_ROADMAP.md)
- [Chat Integration Analysis](./CHAT_INTEGRATION_ANALYSIS.md)
- [Avatar Package Documentation](./packages/avatar/README.md)
