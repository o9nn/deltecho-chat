# DeltaChat RAGBot Studio - Run Instructions

## Prerequisites

- Node.js v20 or higher
- pnpm 9.6.0 or higher
- Git

## Installation Steps

1. **Clone and Setup**

```bash
# Clone the repository
git clone <your-repo-url>
cd deltachat-desktop

# Install dependencies
pnpm install

# Install additional dependencies for AI features
pnpm add lucide-react events
pnpm add -D @types/events
```

2. **Configuration**

- Copy `.env.example` to `.env` (if exists)
- Add your API keys for AI services:
  ```
  OPENAI_API_KEY=your_key_here
  ANTHROPIC_API_KEY=your_key_here
  ```

3. **Running the Application**

```bash
# Development mode (Electron)
pnpm dev

# Build for production
pnpm build:electron

# Run tests
pnpm test
```

## Testing the AI Neighborhood

1. **Enable AI Features**

   - Go to Settings → Experimental Features
   - Enable "AI Companion Mode"
   - Configure at least one AI API key

2. **Access AI Neighborhood**

   - Look for the "AI Neighborhood" button in the main interface
   - Click to enter the AI companion ecosystem
   - Select Deep Tree Echo to test the recursive AI

3. **Test Features**
   - Send messages to Deep Tree Echo
   - Watch the activity feed update
   - Explore the memory palace visualization
   - Try different AI personalities (as they become available)

## Troubleshooting

### Common Issues

1. **"Module not found" errors**

   - Run `pnpm install` again
   - Check that all dependencies are listed in package.json

2. **API Connection Issues**

   - Verify API keys are correct
   - Check network connectivity
   - Ensure API endpoints are accessible

3. **UI Not Displaying Correctly**

   - Clear browser cache
   - Rebuild the project: `pnpm clean && pnpm build`
   - Check console for errors

4. **Performance Issues / High CPU Usage**
   - TensorFlow.js may be consuming significant resources
   - This loads automatically with Deep Tree Echo Bot
   - See PERFORMANCE_OPTIMIZATION.md for detailed solutions
   - Quick fix: Add `VisionCapabilities.disable()` to your initialization

### Development Tips

- Use `pnpm dev` for hot-reloading during development
- Check the console for detailed error messages
- The AI responses are currently simulated for Deep Tree Echo
- Real API integrations coming soon for other AI companions

## Next Steps

1. Configure your preferred AI service API keys
2. Explore the codebase in `packages/frontend/src/components/AICompanionHub/`
3. Contribute new AI companion connectors
4. Help build the OpenCog AtomSpace integration

## Contributing

See CONTRIBUTING.md for guidelines on:

- Adding new AI companions
- Improving the UI/UX
- Implementing new features
- Writing tests

Happy exploring the AI Neighborhood! 🏘️✨
