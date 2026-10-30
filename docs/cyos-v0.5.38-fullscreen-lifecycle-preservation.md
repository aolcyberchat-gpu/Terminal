# CyOS v0.5.38 — fullscreen lifecycle preservation

## Change
The fullscreen-layout snapshot now stores only window rectangles. Returning from Theater/PiP to Split restores the prior geometry but no longer restores an old copy of the open/closed or minimized maps.

## Why
In v0.5.37, `setMode()` still saved `S.open` and `S.min` when entering Theater/PiP, then restored those snapshots when returning to Split. That could undo a user's window actions performed while in a fullscreen layout—for example, opening or closing Chat/Playlist while in Theater.

## Preserved behavior
- Theater/PiP geometry restoration remains.
- Window lifecycle state remains live and authoritative throughout layout changes.
- v0.5.37 Playlist visibility behavior remains.
- No command, permission, socket, chat, video, playlist, or public API behavior is intentionally changed.

## Verification
- Source-based: fullscreen snapshot now contains only `r: S.rects`.
- Source-based: return-to-Split restores only `S.rects`; no saved open/minimized maps are restored.
- Runtime: not yet tested. Test by entering Theater, changing a window's open/closed state, returning to Split, and verifying that change persists.
