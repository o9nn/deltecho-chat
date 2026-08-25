#!/usr/bin/env npx ts-node
/**
 * Deltecho Autonomous Bot
 *
 * A standalone DeltaChat bot that integrates with Claude AI to provide
 * autonomous assistance via encrypted email messaging.
 *
 * Features:
 * - 24/7 autonomous operation
 * - Per-chat conversation history
 * - Long-term recall from the existing filesystem RAG store
 * - Tool execution (bash commands)
 * - Safety limits (recursion depth, timeouts)
 * - End-to-end encryption via Autocrypt
 *
 * Environment Variables:
 * - ANTHROPIC_KEY: Claude API key (required)
 * - ADDR: Email address for the bot (required if not using CHATMAIL_QR)
 * - MAIL_PW: Email password (required if not using CHATMAIL_QR)
 * - CHATMAIL_QR: Chatmail QR code for account setup (alternative to ADDR/MAIL_PW)
 * - DELTECHO_AUTONOMY_STORAGE_PATH: existing filesystem RAG store to recall
 *   from and write turns to. The bot opens it read/write but never creates it;
 *   unset or unusable means this process runs without memory.
 * - DELTECHO_BOT_PERSONALITY: replaces the personality clause of the system
 *   prompt. Unset keeps the Deep Tree Echo identity.
 *
 * Usage:
 *   pnpm start:bot
 *   # or
 *   npx ts-node bin/deltecho-bot.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import { exec } from 'child_process'
import { promisify } from 'util'
import { startDeltaChat } from '@deltachat/stdio-rpc-server'
import { C } from '@deltachat/jsonrpc-client'
import {
  buildReplyContext,
  openBotMemory,
  resolveBotPersonality,
  type BotMemory,
} from '../packages/core/src/bot'

const execAsync = promisify(exec)

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey:
    process.env.ANTHROPIC_KEY ||
    (() => {
      console.error('ANTHROPIC_KEY required')
      process.exit(1)
    })(),
})

// Store conversation history per chat, for the current process only.
// Durable recall comes from the filesystem RAG store below.
const conversations = new Map<number, Anthropic.MessageParam[]>()

// Long-term memory. Null when no usable store was named at startup.
let botMemory: BotMemory | null = null

// Personality clause of the system prompt, resolved once at startup.
const personality = resolveBotPersonality(process.env.DELTECHO_BOT_PERSONALITY)

// Maximum recursion depth for tool use to prevent infinite loops
const MAX_TOOL_RECURSION = 5

// Command execution limits
const COMMAND_TIMEOUT_MS = 30000
const MAX_OUTPUT_BUFFER = 10485760 // 10MB

// Tool definitions
const tools: Anthropic.Tool[] = [
  {
    name: 'bash',
    description:
      'Execute bash commands. Use for file operations, git, builds, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description: 'The bash command to execute',
        },
      },
      required: ['command'],
    },
  },
]

async function executeCommand(command: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      maxBuffer: MAX_OUTPUT_BUFFER,
      timeout: COMMAND_TIMEOUT_MS,
    })
    return stdout + (stderr ? `\nSTDERR:\n${stderr}` : '')
  } catch (error: unknown) {
    const err = error as {
      message: string
      stdout?: string
      stderr?: string
    }
    return `Error: ${err.message}\n${err.stdout || ''}\n${err.stderr || ''}`
  }
}

async function callClaude(
  chatId: number,
  userMessage: string,
  systemPrompt: string,
  recursionDepth: number = 0
): Promise<string> {
  let conversation = conversations.get(chatId)
  if (!conversation) {
    conversation = []
    conversations.set(chatId, conversation)
  }

  if (userMessage) conversation.push({ role: 'user', content: userMessage })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: conversation,
    system: systemPrompt,
    tools,
  })

  conversation.push({ role: 'assistant', content: response.content })

  // Handle tool use with recursion limit
  for (const content of response.content) {
    if (content.type === 'tool_use' && content.name === 'bash') {
      if (recursionDepth >= MAX_TOOL_RECURSION) {
        console.warn(`[Chat ${chatId}] ⚠️  Max tool recursion depth reached`)
        return "I've executed multiple commands in sequence. Please let me know if you need anything else."
      }

      const { command } = content.input as { command: string }
      console.log(`[Chat ${chatId}] 🔧 Running: ${command}`)

      const output = await executeCommand(command)
      console.log(`[Chat ${chatId}] Output: ${output.substring(0, 200)}...`)

      conversation.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: content.id,
            content: output,
          },
        ],
      })

      return callClaude(chatId, '', systemPrompt, recursionDepth + 1)
    }
  }

  return response.content.find(content => content.type === 'text')?.text || ''
}

async function main() {
  console.log('🌳 Starting Deep Tree Echo Autonomous Bot...\n')

  // Open the existing filesystem RAG store, if one was named. A missing or
  // unusable store is a skip, not a failure, and creates nothing on disk.
  const opened = await openBotMemory()
  botMemory = opened.memory
  if (botMemory) {
    console.log(
      `🧠 Memory store open at ${opened.storagePath} ` +
        `(${botMemory.liveMemoryCount()} live memories)`
    )
  } else {
    console.log(`🧠 Memory disabled for this process (reason: ${opened.skipped})`)
  }

  const dc = await startDeltaChat('deltachat-data')
  console.log('Using deltachat-rpc-server at ' + dc.pathToServerBinary)

  // Log events
  dc.on('Info', (accountId, { msg }) =>
    console.info(accountId, '[core:info]', msg)
  )
  dc.on('Warning', (accountId, { msg }) =>
    console.warn(accountId, '[core:warn]', msg)
  )
  dc.on('Error', (accountId, { msg }) =>
    console.error(accountId, '[core:error]', msg)
  )

  // Get or create account
  let firstAccount = (await dc.rpc.getAllAccounts())[0]
  if (!firstAccount) {
    firstAccount = await dc.rpc.getAccountInfo(await dc.rpc.addAccount())
  }

  // Configure account if needed
  if (firstAccount.kind === 'Unconfigured') {
    console.info('Account not configured, trying to login now...')
    try {
      if (process.env.ADDR && process.env.MAIL_PW) {
        await dc.rpc.batchSetConfig(firstAccount.id, {
          addr: process.env.ADDR,
          mail_pw: process.env.MAIL_PW,
        })
      } else if (process.env.CHATMAIL_QR) {
        await dc.rpc.setConfigFromQr(firstAccount.id, process.env.CHATMAIL_QR)
      } else {
        throw new Error(
          'Credentials missing: Set ADDR and MAIL_PW, or use CHATMAIL_QR'
        )
      }
      await dc.rpc.batchSetConfig(firstAccount.id, {
        bot: '1',
        e2ee_enabled: '1',
      })
      await dc.rpc.configure(firstAccount.id)
    } catch (error) {
      console.error('Could not log in to account:', error)
      process.exit(1)
    }
  } else {
    await dc.rpc.startIo(firstAccount.id)
  }

  const botAccountId = firstAccount.id
  const emitter = dc.getContextEvents(botAccountId)

  // Handle incoming messages
  emitter.on('IncomingMsg', async ({ chatId, msgId }) => {
    try {
      const chat = await dc.rpc.getBasicChatInfo(botAccountId, chatId)

      // Only respond to direct messages (1:1 chats)
      if (chat.chatType === C.DC_CHAT_TYPE_SINGLE) {
        const message = await dc.rpc.getMessage(botAccountId, msgId)
        const messageText = message.text || ''

        if (messageText.trim()) {
          console.log(`\n📩 [Chat ${chatId}] Received: ${messageText}`)

          // Retrieve before generating. Counts only — retrieved memory text
          // must not reach the logs.
          const retrieved = botMemory?.retrieve(messageText, chatId)
          const context = buildReplyContext({
            personality,
            retrieved,
          })
          console.log(
            `[Chat ${chatId}] 🧠 Recalled ${context.memoryCount} memories` +
              (context.truncated ? ' (budget truncated)' : '')
          )

          // Get AI response
          const response = await callClaude(
            chatId,
            messageText,
            context.systemPrompt
          )

          // Send response back
          await dc.rpc.miscSendTextMessage(botAccountId, chatId, response)
          console.log(
            `\n📤 [Chat ${chatId}] Sent: ${response.substring(0, 100)}...\n`
          )

          // Persist the completed turn. Never dream/apply here — consolidation
          // is scheduled hygiene owned by the orchestrator.
          if (botMemory) {
            const stored = await botMemory.rememberTurn({
              chatId,
              messageId: msgId,
              userText: messageText,
              botText: response,
            })
            console.log(`[Chat ${chatId}] 🧠 Stored ${stored} memories`)
          }
        }
      }
    } catch (error) {
      console.error(`Error handling message in chat ${chatId}:`, error)
      try {
        await dc.rpc.miscSendTextMessage(
          botAccountId,
          chatId,
          'Sorry, I encountered an error processing your message. Please try again.'
        )
      } catch (sendError) {
        console.error('Failed to send error message:', sendError)
      }
    }
  })

  const botAddress = await dc.rpc.getConfig(botAccountId, 'addr')
  const verificationQRCode = (
    await dc.rpc.getChatSecurejoinQrCodeSvg(botAccountId, null)
  )[0]

  console.info(''.padEnd(60, '='))
  console.info('🌳 Deep Tree Echo Autonomous Bot is ready!')
  console.info(''.padEnd(60, '='))
  console.info('Email address:', botAddress)
  console.info('\nVerification QR Code (copy and scan in Delta Chat):')
  console.info('\n' + verificationQRCode)
  console.info(''.padEnd(60, '='))
  console.info('\n💡 Send a message to the bot to start chatting!')
  console.info(
    '   The bot will respond using Claude AI with bash capabilities.\n'
  )
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
