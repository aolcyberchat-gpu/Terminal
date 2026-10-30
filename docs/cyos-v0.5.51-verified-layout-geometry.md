# CyOS v0.5.51 — Verified Layout and Geometry

**Base:** v0.5.50  
**Branch:** `cyos-v0.5.51-verified-layout-geometry`  
**Runtime test status:** JavaScript syntax-checked; browser test pending

## Changes

### Layout commands

Migrated `theater`, `pip`, `dock`, `split`, and `layout.set <name>` to structured Action Results. The command validates the requested layout, invokes the existing layout function, and checks the resulting `S.mode`.

The `dock` command may restore a saved pre-Theater/PiP layout as `custom`; the verifier accounts for that existing behavior rather than assuming every dock action ends in `split`.

### Window geometry commands

Migrated:
- `snap <side>`
- `max`
- `restore`
- Internal `win.snap`, `win.max`, and `win.restore` command paths

The actions verify the focused window and inspect its geometry/snap state after applying the existing operation. Invalid snap targets, missing focus, hidden/minimized windows, and mobile geometry requests report failure. Restore reports failure when the window is already at its normal size.

No geometry or layout algorithm was intentionally redesigned; this release adds validation and truthful reporting around existing operations.

## Test

Desktop:
1. Run `theater`; verify Theater activates and the result confirms it.
2. Run `pip`; verify PiP activates.
3. Run `dock`; verify the saved prior layout returns.
4. Run `split`; verify the default split layout returns.
5. With a visible focused window, run `snap l`, `snap r`, `snap tl`, `snap br`.
6. Run `max`, then `restore`; verify the original geometry returns.
7. Run `snap nonsense`; verify a clear failure.
8. Close the focused window and try `max`; it should not claim success.

Mobile:
1. Try `snap l`, `max`, and `restore`; verify they report desktop-only behavior.
2. Re-test `theater`, `pip`, `dock`, and `split` if those layouts are available in the mobile UI.

Re-test v0.5.49 focus and v0.5.50 show/hide. No changes were made to `main`.
