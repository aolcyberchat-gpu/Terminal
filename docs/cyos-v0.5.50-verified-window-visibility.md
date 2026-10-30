# CyOS v0.5.50 — Verified Window Visibility

**Base:** v0.5.49  
**Branch:** `cyos-v0.5.50-verified-window-visibility`  
**Runtime test status:** Syntax-checked; browser test pending

## Changes

- Migrated `show <window>` and alias `open <window>` to structured Action Results.
- Migrated `hide <window>` to structured Action Results.
- Both actions validate the target and inspect resulting state before reporting success.
- Desktop show/open verifies the window is open and not minimized. Mobile verifies the requested window is the active tab.
- Desktop hide verifies the window is neither open nor minimized.
- Mobile hide now reports that hiding is unsupported. Previously, the underlying close operation was a no-op on mobile, but the command could still print a misleading "Hid" message.

## Test

Desktop:
1. Run `hide video`; verify Video closes and the result confirms it.
2. Run `show video`; verify Video opens and the result confirms it.
3. Run `open video`; verify the alias behaves identically.
4. Run `hide notawindow` and `show notawindow`; both should report failure.
5. Test hiding the currently focused window and confirm focus moves to another visible window.

Mobile:
1. Run `show video` and verify Video becomes the active tab.
2. Run `hide video`; verify CyOS explains that mobile windows are tabs and cannot be hidden.

Re-test `focus` and palette invocation. No changes were made to `main`.
