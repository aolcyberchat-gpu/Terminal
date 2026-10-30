# CyOS v0.5.39 — stale deferred Terminal focus

## Change
The deferred Terminal-input focus in `focusWin()` now checks that Terminal is still the logically focused, open, non-minimized window before moving browser focus into its input.

## Why
The titlebar's pointerdown handler focuses the window before its Close/Minimize click handler runs. For Terminal, `focusWin()` schedules input focus with a zero-delay timeout. The subsequent click can close or minimize Terminal before that timeout fires. Without a guard, the delayed callback can then focus an input inside a hidden window.

## Verification
- Source-based: only the deferred focus callback in `focusWin()` was changed; other prompt-related focus callbacks remain untouched.
- Source-based: callback exits if focus changed, Terminal closed, or Terminal minimized.
- Runtime: not yet tested. Click Terminal's Close and Minimize controls and verify focus stays with the remaining active window; also verify opening Terminal still focuses its input.
