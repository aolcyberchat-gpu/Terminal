# CyOS v0.5.36 — Window lifecycle and focus improvements

## Scope

This release carries forward v0.5.35 and changes desktop window-manager behavior. It does not redesign the visual theme or titlebar controls.

## Changes

1. **Layout no longer changes window lifecycle.** Previously, `layout()` rebuilt the open-window map, forced Chat/Video/Playlist open, restored selected built-ins, and cleared all minimized state. It now changes geometry only. Open/closed/minimized state is retained for core and registered windows.
2. **Changing layouts no longer forces Chat focus.** `setMode()` now refreshes the new geometry without calling `focusWin("chat")`. This prevents a layout change from unexpectedly opening/focusing Chat.
3. **Desktop icons remain visible in Theater.** Removed the CSS rule that hid the icon layer in Theater mode.
4. **Window focus follows actual focus.** Synthetic and existing window elements receive `tabIndex=-1`; a document `focusin` handler detects focus entering a CyOS window and updates logical focus, z-order, status, and Window menus.
5. **Focus transfer after close/minimize.** When the active window is closed or minimized, focus is moved to the newly selected logical window's window surface rather than being left in a hidden window.
6. **Launcher tooltips match launcher behavior.** Core icon tooltips now say “Open or focus” rather than “Toggle”. Icons are launchers: they open a closed window or raise/focus an already-open one.

## Preserved behavior

- v0.5.35's native-button keyboard exemption remains in place.
- No changes to CyTube chat, video, playlist, command permissions, socket integration, or public registration API.
- No changes to the titlebar's Close / Minimize / Maximize controls in this release.
- The original `main` branch and v0.5.21 baseline are untouched.

## Verification status

Automated source checks confirm the intended edits are present and the old lifecycle-reset / forced-Chat-focus code is absent. This is **source verification only**. It has not yet been runtime-tested in a CyTube channel. In particular, verify that:
- switching Split → Theater → PiP → Split preserves each window's open/minimized state and does not unexpectedly focus Chat;
- desktop icons remain visible in Theater and clicking an icon opens or focuses its window;
- closing/minimizing the focused window moves focus to the next visible window;
- keyboard navigation and v0.5.35's button behavior still work.

## Files

- Script: `cytube-os-v0.5.36.js`
- Branch: `cyos-v0.5.36-window-lifecycle`
