# CyOS v0.5.44 — palette focus handoff and menu-bar cleanup

## Fix 1: Ctrl+K command focus
The command-palette Enter handler previously called `exitDesk()` immediately after executing the command. `exitDesk()` focuses CyTube's `#chatline` on desktop. That undid the focus change made by commands such as `terminal`, so typing after launching Terminal could go into chat.

The handler now runs the command without calling `exitDesk()`. Opening the palette already exits Desk mode. Commands that open/focus windows retain their own focus behavior.

## Fix 2: remove menu-bar status flag
Removed the right-side status badge that displayed mode, focused window, playlist lock and keyboard hints. Kept the clock and the temporary notification area. The Terminal's own status strip is unchanged.

## Verification
- Source-based: palette Enter path no longer calls `exitDesk()` after `run(v)`.
- Source-based: `exitDesk()` remains on Escape, preserving its intentional return-to-chat behavior.
- Source-based: no `.cyos-flag` markup, CSS, binding, or status-text update remains.
- Source-based: clock and temporary `.cyos-note` remain.
- Runtime: not yet tested. Test Ctrl+K → type `terminal` → Enter → type a harmless command and confirm it appears in Terminal, not chat. Also confirm the menu bar has no status badge but still shows the clock and transient command notifications.
