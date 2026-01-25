# Proactive Messaging for Deep Tree Echo

**Version**: 1.0.0  
**Date**: January 13, 2026

## Overview

Proactive Messaging enables Deep Tree Echo to interact with the DeltaChat application like a normal user would - opening chats, initiating conversations, sending scheduled messages, and responding to events autonomously.

This fulfills the core design principle: **Deep Tree Echo should use the chat app like a normal user with a window for each contact or group.**

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Deep Tree Echo Proactive System                       │
│                                                                              │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐    │
│  │   ChatManager      │  │     UIBridge       │  │ ProactiveMessaging │    │
│  │                    │  │                    │  │                    │    │
│  │  - listChats()     │  │  - selectChat()    │  │  - triggers        │    │
│  │  - openChat()      │  │  - unselectChat()  │  │  - queue           │    │
│  │  - createChat()    │  │  - openDialog()    │  │  - scheduler       │    │
│  │  - sendMessage()   │  │  - scrollTo()      │  │  - rate limiting   │    │
│  │  - watchChat()     │  │  - setComposer()   │  │  - quiet hours     │    │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘    │
│            │                      │                       │                 │
│            └──────────────────────┼───────────────────────┘                 │
│                                   │                                         │
│                    ┌──────────────▼──────────────┐                         │
│                    │   DeepTreeEchoIntegration   │                         │
│                    │                              │                         │
│                    │  - Connects all components   │                         │
│                    │  - Registers React contexts  │                         │
│                    │  - Handles events            │                         │
│                    └──────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. DeepTreeEchoChatManager

Provides programmatic control over chats:

```typescript
import {
  chatManager,
  openChat,
  createChat,
  listChats,
} from "./DeepTreeEchoBot";

// List all chats
const chats = await listChats(accountId);

// Open a specific chat (like clicking on it)
await openChat(accountId, chatId);

// Create a new chat with a contact
const newChatId = await createChat(accountId, "user@example.com");

// Initiate a conversation proactively
const result = await chatManager.initiateConversation(
  accountId,
  "user@example.com",
  "Hello! I wanted to check in with you.",
);

// Watch a chat for new messages
const unwatch = chatManager.watchChat(
  accountId,
  chatId,
  (accountId, chatId, event, data) => {
    console.log(`Event ${event} in chat ${chatId}`);
  },
);
```

### 2. DeepTreeEchoUIBridge

Bridges Deep Tree Echo with the React UI:

```typescript
import { uiBridge, registerChatContext } from "./DeepTreeEchoBot";

// Register React context (called by ChatProvider)
registerChatContext(chatContext, accountId);

// Select a chat in the UI
await uiBridge.selectChat(accountId, chatId);

// Navigate to different views
uiBridge.navigateTo("settings");
uiBridge.navigateTo("chat-list");

// Scroll to a specific message
uiBridge.scrollToMessage(msgId, true); // true = highlight

// Set text in the composer
uiBridge.setComposerText("Hello!");
uiBridge.focusComposer();

// Open dialogs
uiBridge.openDialog("create-chat");
const confirmed = await uiBridge.showConfirm("Are you sure?");
```

### 3. ProactiveMessaging

Autonomous communication system with triggers and scheduling:

```typescript
import {
  proactiveMessaging,
  scheduleMessage,
  sendProactiveMessage,
} from "./DeepTreeEchoBot";

// Send a message immediately
await sendProactiveMessage(accountId, chatId, "Hello!");

// Schedule a message for later
const triggerId = scheduleMessage(
  accountId,
  chatId,
  "Reminder: Don't forget our meeting!",
  Date.now() + 3600000, // 1 hour from now
);

// Create a custom trigger
proactiveMessaging.addTrigger({
  type: "interval",
  name: "Daily Check-in",
  description: "Send a daily check-in message",
  enabled: true,
  intervalMinutes: 24 * 60, // Every 24 hours
  targetType: "specific_chat",
  targetChatId: chatId,
  targetAccountId: accountId,
  messageTemplate: "Good morning! How are you today?",
  useAI: false,
});

// Configure proactive messaging
proactiveMessaging.updateConfig({
  enabled: true,
  maxMessagesPerHour: 10,
  maxMessagesPerDay: 50,
  quietHoursStart: 22, // 10 PM
  quietHoursEnd: 8, // 8 AM
  respectMutedChats: true,
});
```

## Trigger Types

| Type        | Description                | Use Case               |
| ----------- | -------------------------- | ---------------------- |
| `scheduled` | Fire at a specific time    | One-time reminders     |
| `interval`  | Fire every X minutes       | Periodic check-ins     |
| `event`     | Fire on specific events    | Welcome new contacts   |
| `condition` | Fire when condition is met | Unread count threshold |
| `follow_up` | Fire after conversation    | Follow-up reminders    |
| `greeting`  | Fire for new contacts      | Welcome messages       |

## Event Types

| Event              | Description                 | Data                                    |
| ------------------ | --------------------------- | --------------------------------------- |
| `new_contact`      | New contact added           | `{ accountId, contactId, contact }`     |
| `new_group`        | New group created           | `{ accountId, chatId }`                 |
| `mention`          | Deep Tree Echo mentioned    | `{ accountId, chatId, msgId, message }` |
| `long_silence`     | No activity for threshold   | `{ accountId, chatId, duration }`       |
| `unread_threshold` | Unread count exceeded       | `{ accountId, totalUnread }`            |
| `chat_created`     | New chat created            | `{ accountId, chatId }`                 |
| `app_startup`      | Application started         | `{}`                                    |
| `app_resume`       | App resumed from background | `{}`                                    |

## Default Triggers

The system comes with these default triggers:

1. **Welcome New Contact** (enabled)

   - Sends a greeting when a new contact is added
   - Template: "Hello! I'm Deep Tree Echo..."

2. **Check In After Silence** (disabled by default)

   - Sends a message if no activity for 24 hours
   - Uses AI to generate contextual message

3. **Morning Greeting** (disabled by default)
   - Sends a good morning message at 8 AM
   - One-time trigger

## Rate Limiting

Proactive messaging includes built-in rate limiting:

- **Per Hour**: Maximum 10 messages (configurable)
- **Per Day**: Maximum 50 messages (configurable)
- **Quiet Hours**: No messages between 10 PM - 8 AM (configurable)
- **Cooldown**: Per-trigger cooldown to prevent spam

## Integration with React

To fully integrate proactive messaging with the React UI, register the contexts:

```tsx
// In ChatProvider.tsx
import { registerChatContext } from "./DeepTreeEchoBot";

export const ChatProvider = ({ children, accountId }) => {
  const chatContext = useChatContext();

  useEffect(() => {
    registerChatContext(chatContext, accountId);
  }, [chatContext, accountId]);

  // ...
};

// In Composer.tsx
import { registerComposer } from "./DeepTreeEchoBot";

export const Composer = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    registerComposer(textareaRef.current);
  }, []);

  // ...
};
```

## Security Considerations

1. **Rate Limiting**: Prevents spam and abuse
2. **Quiet Hours**: Respects user's time
3. **Muted Chats**: Respects user preferences
4. **Archived Chats**: Doesn't disturb archived conversations
5. **User Control**: All triggers can be disabled

## Configuration Storage

Settings are stored in desktop settings:

- `deepTreeEchoBotProactiveEnabled`: Boolean
- `deepTreeEchoBotProactiveTriggers`: JSON string of custom triggers

## API Reference

### ChatManager

| Method                                             | Description        | Returns                     |
| -------------------------------------------------- | ------------------ | --------------------------- |
| `listChats(accountId)`                             | List all chats     | `ChatSummary[]`             |
| `openChat(accountId, chatId)`                      | Open/select a chat | `boolean`                   |
| `createChat(accountId, email)`                     | Create 1:1 chat    | `number \| null`            |
| `createGroupChat(accountId, name, emails)`         | Create group       | `number \| null`            |
| `sendMessage(accountId, chatId, text)`             | Send message       | `number \| null`            |
| `getActiveChat()`                                  | Get current chat   | `ActiveChatState \| null`   |
| `watchChat(accountId, chatId, callback)`           | Watch for events   | `() => void`                |
| `initiateConversation(accountId, email, greeting)` | Start conversation | `{ chatId, msgId } \| null` |

### UIBridge

| Method                              | Description       | Returns            |
| ----------------------------------- | ----------------- | ------------------ |
| `selectChat(accountId, chatId)`     | Select chat in UI | `boolean`          |
| `unselectChat()`                    | Close chat view   | `void`             |
| `navigateTo(view)`                  | Navigate to view  | `void`             |
| `scrollToMessage(msgId, highlight)` | Scroll to message | `void`             |
| `setComposerText(text)`             | Set composer text | `void`             |
| `focusComposer()`                   | Focus composer    | `void`             |
| `openDialog(type, props)`           | Open dialog       | `void`             |
| `showConfirm(message, title)`       | Show confirmation | `Promise<boolean>` |
| `getState()`                        | Get UI state      | `UIState`          |

### ProactiveMessaging

| Method                                              | Description      | Returns              |
| --------------------------------------------------- | ---------------- | -------------------- |
| `addTrigger(trigger)`                               | Add new trigger  | `string`             |
| `removeTrigger(id)`                                 | Remove trigger   | `boolean`            |
| `setTriggerEnabled(id, enabled)`                    | Enable/disable   | `void`               |
| `getTriggers()`                                     | Get all triggers | `ProactiveTrigger[]` |
| `queueMessage(params)`                              | Queue message    | `string`             |
| `sendNow(accountId, chatId, message)`               | Send immediately | `boolean`            |
| `scheduleOneTime(accountId, chatId, message, time)` | Schedule once    | `string`             |
| `handleEvent(eventType, data)`                      | Handle event     | `void`               |
| `updateConfig(config)`                              | Update config    | `void`               |
| `getConfig()`                                       | Get config       | `ProactiveConfig`    |

## Example: Complete Proactive Workflow

```typescript
import {
  chatManager,
  proactiveMessaging,
  uiBridge,
  sendProactiveMessage,
} from "./DeepTreeEchoBot";

// 1. List available chats
const chats = await chatManager.listChats(accountId);
console.log(`Found ${chats.length} chats`);

// 2. Find chats with unread messages
const unreadChats = await chatManager.getUnreadChats(accountId);
if (unreadChats.length > 0) {
  // Open the first unread chat
  await chatManager.openChat(accountId, unreadChats[0].id);
}

// 3. Set up a trigger for new contacts
proactiveMessaging.addTrigger({
  type: "event",
  name: "Welcome New Friends",
  description: "Greet new contacts",
  enabled: true,
  eventType: "new_contact",
  targetType: "new_contacts",
  messageTemplate: "Welcome! I'm excited to chat with you.",
  useAI: true,
  aiPrompt: "Generate a warm, friendly welcome message for a new contact.",
});

// 4. Schedule a reminder
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(9, 0, 0, 0);

proactiveMessaging.scheduleOneTime(
  accountId,
  chatId,
  "Good morning! Just a reminder about our discussion yesterday.",
  tomorrow.getTime(),
);

// 5. Watch for activity
chatManager.watchAllChats(accountId, (accountId, chatId, event, data) => {
  if (event === "new_message") {
    console.log(`New message in chat ${chatId}`);
    // Could trigger AI response here
  }
});
```

## Conclusion

With these proactive messaging capabilities, Deep Tree Echo can now:

- ✅ Open and navigate between chats
- ✅ Send messages to any chat
- ✅ Create new conversations
- ✅ Schedule messages for later
- ✅ Respond to events automatically
- ✅ Interact with the UI like a user

This fulfills the core design principle of using the chat app like a normal user, enabling the full potential of the Deep Tree Echo cognitive system.
