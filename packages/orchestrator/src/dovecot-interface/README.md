# Deep Tree Echo - Dovecot Integration

This module provides integration between Deep Tree Echo and Dovecot mail server, enabling Deep Tree Echo to process emails directly from the mail infrastructure.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Email Flow                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [External Email] ──SMTP──▶ [Postfix/Dovecot]                       │
│                                    │                                 │
│                          ┌─────────┴─────────┐                      │
│                          ▼                   ▼                      │
│                    [Milter Socket]    [LMTP Socket]                 │
│                          │                   │                      │
│                          └─────────┬─────────┘                      │
│                                    ▼                                 │
│                         [Deep Tree Echo Orchestrator]               │
│                                    │                                 │
│                                    ▼                                 │
│                          [Email Processor]                          │
│                                    │                                 │
│                     ┌──────────────┼──────────────┐                 │
│                     ▼              ▼              ▼                 │
│              [LLMService]  [RAGMemoryStore] [PersonaCore]           │
│                     │              │              │                 │
│                     └──────────────┼──────────────┘                 │
│                                    ▼                                 │
│                          [Generate Response]                        │
│                                    │                                 │
│                                    ▼                                 │
│  [External Email] ◀──SMTP──  [DeltaChat/SMTP]                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

### MilterServer

Implements the Sendmail Milter protocol for intercepting emails in transit.

- **Purpose**: Filter and inspect emails before delivery
- **Socket**: Unix socket or TCP (default: `/var/run/deep-tree-echo/milter.sock`)
- **Capabilities**: Accept, reject, quarantine, modify headers

### LMTPServer

Implements the Local Mail Transfer Protocol for final delivery processing.

- **Purpose**: Process emails at delivery time
- **Socket**: Unix socket or TCP (default: `/var/run/deep-tree-echo/lmtp.sock`)
- **Capabilities**: Receive and store messages, trigger responses

### EmailProcessor

Converts emails into Deep Tree Echo's cognitive processing format.

- **Features**:
  - MIME parsing (text/plain, text/html, multipart)
  - Quote removal (trims previous email threads)
  - Sentiment analysis for emotional state updates
  - Fallback responses when LLM unavailable

## Configuration

### Dovecot Configuration

Add to `/etc/dovecot/conf.d/90-deep-tree-echo.conf`:

```conf
# Deep Tree Echo LMTP delivery
protocol lmtp {
  mail_plugins = $mail_plugins sieve
}

# Route mail for echo@ to Deep Tree Echo
plugin {
  sieve_before = /etc/dovecot/sieve/deep-tree-echo.sieve
}
```

### Postfix Milter Configuration

Add to `/etc/postfix/main.cf`:

```conf
# Deep Tree Echo Milter
smtpd_milters = unix:/var/run/deep-tree-echo/milter.sock
non_smtpd_milters = unix:/var/run/deep-tree-echo/milter.sock
milter_default_action = accept
```

### Orchestrator Configuration

```typescript
import { Orchestrator } from 'deep-tree-echo-orchestrator';

const orchestrator = new Orchestrator({
  enableDovecot: true,
  dovecot: {
    enableMilter: true,
    milterSocket: '/var/run/deep-tree-echo/milter.sock',
    enableLMTP: false,
    allowedDomains: ['example.com', 'mail.example.com'],
    botEmailAddress: 'echo@example.com',
  },
});

await orchestrator.start();
```

## Avatar Configuration

Deep Tree Echo includes a custom avatar for email and chat representation:

```typescript
import { PersonaCore } from 'deep-tree-echo-core';

const persona = new PersonaCore();

// Get current avatar config
const avatar = persona.getAvatarConfig();
console.log(avatar.imagePath); // 'assets/deep-tree-echo-avatar.svg'
console.log(avatar.displayName); // 'Deep Tree Echo'

// Update avatar aesthetic
await persona.updateAvatarConfig({
  aesthetic: 'cosmic',
  primaryColor: '#8b5cf6',
});
```

## Security Considerations

1. **Socket Permissions**: Ensure sockets are only accessible by authorized processes
2. **Domain Filtering**: Configure `allowedDomains` to prevent processing unwanted mail
3. **Rate Limiting**: Consider implementing rate limits for email processing
4. **Auto-Reply Prevention**: The processor automatically skips bounce/auto-reply messages

## Testing

```bash
# Send a test email
echo "Hello Deep Tree Echo!" | mail -s "Test Message" echo@localhost

# Check logs
journalctl -u deep-tree-echo-orchestrator -f
```
