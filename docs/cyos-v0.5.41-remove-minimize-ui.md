# CyOS v0.5.41 — remove minimize button and dock chips

## User-requested UI change
- Removed the minimize control from every window titlebar. Titlebars retain Close and Maximize/Restore.
- Removed the bottom-left minimized-window chip dock and its rendering code/styles.
- Removed Minimize from the Window menu, per-window menu, keyboard shortcut, and built-in `min` / `win.min` commands.
- Updated Help text to match.

## Compatibility
The internal minimized-state machinery and `CyOS.minWin` public helper remain for compatibility with existing integrations and saved state. A minimized window can still be reopened/focused from its desktop launcher, because `focusWin()` clears its minimized flag. The normal user-facing UI no longer offers minimize.

## Verification
- Source-based: no minimize titlebar button, dock/chip CSS or DOM, dock renderer, minimize menu items, minimize commands, or '-' shortcut remain.
- Source-based: Close and Maximize/Restore titlebar actions remain.
- Runtime: not yet tested. Check titlebars show exactly two controls (Close and Maximize/Restore), no bottom-left chips appear, and desktop icons still reopen/focus windows.
