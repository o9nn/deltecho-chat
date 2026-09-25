# Live2D Avatar Debugging Skill

Diagnose and fix Live2D Cubism avatar loading issues in the DeltaChat interface.

## When to use

Invoke this skill when:

- Live2D avatar is stuck on "Loading Avatar..."
- Avatar fails to load with error
- Avatar shows sprite fallback unexpectedly
- Motion playback not working
- Model not rendering correctly

## Key Files

| File                                                               | Purpose                  |
| ------------------------------------------------------------------ | ------------------------ |
| `packages/frontend/src/components/AICompanionHub/Live2DAvatar.tsx` | React component wrapper  |
| `packages/avatar/src/adapters/live2d-avatar.ts`                    | Avatar manager class     |
| `packages/avatar/src/adapters/pixi-live2d-renderer.ts`             | PixiJS Live2D renderer   |
| `packages/avatar/src/adapters/cubism-adapter.ts`                   | Cubism adapter interface |
| `packages/frontend/static/models/`                                 | Model files directory    |

## Diagnostic Checklist

### 1. Container Initialization Issues

**Symptoms:** Stuck on loading, timeout after 10 seconds

**Check:** Verify that `containerRef` div is rendered regardless of loading state. The container must exist for canvas attachment.

```tsx
// WRONG: Container only rendered after load
if (state.isLoading) return <LoadingSpinner />;
return <div ref={containerRef} />; // Never reached!

// CORRECT: Always render container, overlay states
return (
  <div className="container">
    <div
      ref={containerRef}
      style={{ visibility: state.isLoaded ? "visible" : "hidden" }}
    />
    {state.isLoading && <LoadingOverlay />}
  </div>
);
```

### 2. Model Path Issues

**Symptoms:** 404 errors, model not found

**Check:** Build output copies `static/` contents directly to `html-dist/`, so paths should NOT include `/static/` prefix.

```typescript
// WRONG
const modelPath = "/static/models/miara/miara_pro_t03.model3.json";

// CORRECT
const modelPath = "/models/miara/miara_pro_t03.model3.json";
```

**Verify paths:**

```bash
# Check model files exist
ls -la packages/frontend/static/models/

# Check model3.json references
cat packages/frontend/static/models/miara/miara_pro_t03.model3.json
```

### 3. Motion Group Compatibility

**Symptoms:** Motions not playing, console warnings about missing groups

**Check:** Model motion groups may use different naming conventions:

- Standard models: `"idle"`, `"tap_body"`, `"shake"`, `"flick_head"` (lowercase)
- Cubism Editor exports: `"Idle"`, `"Tap"`, `"Flic"` (capitalized, abbreviated)

**Solution:** Use fallback array for motion groups:

```typescript
const MOTION_MAP = {
  idle: { groups: ["Idle", "idle"], index: 0 },
  talking: { groups: ["Tap", "tap_body", "tap"], index: 0 },
  // Try each group name until one works
};
```

### 4. Timeout Configuration

**Current timeout:** 10 seconds (line ~140 in Live2DAvatar.tsx)

If models are large or network is slow, this may not be enough. Consider:

- Increasing timeout for slow connections
- Adding progress indicators
- Implementing retry logic (up to 3 retries)

### 5. Dynamic Import Failures

**Symptoms:** Silent failures, no error callbacks triggered

**Check:** Ensure `@deltecho/avatar` package is built:

```bash
cd packages/avatar && pnpm build
```

**Verify import works:**

```typescript
// Check if import resolves
const { Live2DAvatarManager } = await import("@deltecho/avatar");
console.log("Manager loaded:", Live2DAvatarManager);
```

## Common Fixes

### Fix: Circular Dependency (Container Not Available)

```typescript
// Always render container, use visibility for show/hide
<div
  ref={containerRef}
  style={{ visibility: state.isLoaded ? 'visible' : 'hidden' }}
/>
```

### Fix: Add Retry Functionality

```typescript
const [retryCount, setRetryCount] = useState(0)
const MAX_RETRIES = 3

// Include retryCount in useEffect deps to trigger re-init
useEffect(() => {
  initializeAvatar()
}, [modelUrl, retryCount])

// Retry button in error state
{state.error && retryCount < MAX_RETRIES && (
  <button onClick={() => setRetryCount(c => c + 1)}>
    Retry ({MAX_RETRIES - retryCount} left)
  </button>
)}
```

### Fix: Motion Group Fallbacks

```typescript
// In pixi-live2d-renderer.ts
playMotion(motion: AvatarMotion): void {
  const motionDef = this.motionMap[motion]

  // Try each group name until one works
  for (const group of motionDef.groups) {
    try {
      this.model.motion(group, motionDef.index)
      return // Success
    } catch {
      // Try next group
    }
  }
}
```

## Testing Changes

```bash
# Type check the packages
cd packages/avatar && pnpm check:types
cd packages/frontend && pnpm check:types

# Lint modified files
npx eslint packages/frontend/src/components/AICompanionHub/Live2DAvatar.tsx
npx eslint packages/avatar/src/adapters/pixi-live2d-renderer.ts

# Build to verify
pnpm build:core  # Builds @deltecho packages
```

## Related Documentation

- [Live2D Cubism SDK](https://docs.live2d.com/cubism-sdk-manual/top/)
- [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)
- [PixiJS Documentation](https://pixijs.com/guides)
- Project: `LIVE2D_AVATAR_INTEGRATION.md` (if exists)

## Debug Mode

Enable debug logging in development:

```typescript
// In Live2DAvatar.tsx initialization
await managerRef.current.initialize(containerRef.current, {
  ...props,
  debug: process.env.NODE_ENV === "development",
});
```

Console will show:

- `[Live2DAvatarManager] Model loaded successfully`
- `[PixiLive2DRenderer] Expression set: happy (happy) at 70%`
- `[PixiLive2DRenderer] Motion played: idle (Idle[0])`
