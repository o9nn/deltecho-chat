# Residual review findings — desktop DTE proactive messaging

Review of `cursor/desktop-proactive-messaging-3045` after U1–U6 and follow-up fixes.

## Applied

- Restart trigger/queue intervals after `cleanup()` / bot re-enable.
- Clear in-memory welcomed and session-handled sets on cleanup so a dropped queued welcome stays eligible.
- Await `loadProactiveSettings` before registering chat event handlers.
- Do not persist `[]` when contact-id collection fails.
- Await `handleEvent` on `ContactsChanged`.
- Catch persist failures from the welcomed-id writer.
- Extra tests: mailing-list skip, quiet-hours `checkTriggers`, `sendGated` future schedule, cleanup restart.

## Leftovers (follow-up)

- Contact ids are per-account; welcomed/session sets still key on numeric id only. Multi-account collisions can suppress a welcome.
- No dedicated `loadProactiveSettings` Jest file; AE5 is proven at `replaceTriggers`, not the Integration load path.
- Indicator quick-send is wired to `sendGated` but the MessageListAndComposer test stubs the indicator.
- In-memory send queue is still process-lifetime only (plan deferred).
- Agent `sendGated` mock tests do not cover `rate_limit`.
- `executeTool` still logs raw tool input; `get_proactive_status` does not include templates.

## Out of scope (plan deferred)

- Merge/disable legacy `chat/DeepTreeEchoBot.tsx` IncomingMsg path.
- Persist the send queue across restart.
- Agent cancel-queue / propose-trigger tools.
