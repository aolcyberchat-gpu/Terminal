# CyOS v0.5.46 — fail-closed chat dispatch

## Change
`sendChat()` previously fell back to emitting `chatMsg` directly on the socket whenever the CyTube chat input or jQuery was unavailable.

That fallback bypassed the CyTube chat handler, despite the function's stated contract to use the native handler for slash-command processing, history and rate limits.

v0.5.46 removes the raw socket fallback. If the chat input or jQuery event API is unavailable, CyOS reports that the message was not sent and returns false. It does not attempt a direct socket emit.

## Verification
- Source-based: `sendChat()` contains no raw `emit("chatMsg", ...)` fallback.
- Source-based: native jQuery keydown path is retained.
- Source-based: original chat draft is restored in a `finally` block even if event dispatch throws.
- Runtime: not yet tested. Test a normal slash/chat command and verify it still reaches CyTube; this change should be invisible during normal CyTube operation.
