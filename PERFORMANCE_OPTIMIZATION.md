# DeltaChat RAGBot Studio - Performance Optimization Guide

## TensorFlow.js Performance Issues & Solutions

### The Problem

TensorFlow.js and the MobileNet model are being loaded automatically when the Deep Tree Echo Bot component mounts, consuming significant CPU and memory resources even when vision features aren't being used.

### Quick Fix - Disable Vision Features

Add this to your app initialization to completely disable TensorFlow.js loading:

```typescript
// In App.tsx or your main component
import { VisionCapabilities } from './components/chat/VisionCapabilities'

// Disable vision features for better performance
VisionCapabilities.disable()
```

### Performance Impact

- **Without optimization**: TensorFlow.js loads ~10MB+ of JavaScript and models
- **With lazy loading**: Only loads when `/vision` command is used
- **With disable flag**: No TensorFlow.js loaded at all

### Additional Optimizations

1. **Use WebGL Backend** (if needed):

```typescript
// Force WebGL backend for better GPU acceleration
await tf.setBackend('webgl')
```

2. **Limit Model Size**:

- Consider using MobileNet v2 0.5 (smaller model)
- Use quantized models when available

3. **Memory Management**:

```typescript
// Dispose tensors after use
tf.dispose(tensor)
// Or use tidy()
const result = tf.tidy(() => {
  // TensorFlow operations
})
```

4. **Worker Thread Option**:
   Consider moving TensorFlow.js to a Web Worker to avoid blocking the main thread:

```typescript
// vision.worker.ts
self.addEventListener('message', async e => {
  if (e.data.action === 'analyze') {
    const tf = await import('@tensorflow/tfjs')
    const mobilenet = await import('@tensorflow-models/mobilenet')
    // Process image in worker
  }
})
```

### Monitoring Performance

Use Chrome DevTools Performance tab to monitor:

- Check for long tasks caused by TensorFlow.js
- Monitor memory usage spikes
- Use Performance Observer API for real-time metrics

### When to Use Vision Features

Vision features are best for:

- AI companions that need to "see" and understand images
- Visual content moderation
- Image-based conversations

Consider disabling for:

- Text-only chatbots
- Performance-critical applications
- Low-end devices

### Future Improvements

We're working on:

- [ ] Configurable feature flags in settings
- [ ] Smaller, custom-trained models
- [ ] WASM backend option
- [ ] Progressive loading based on usage patterns
