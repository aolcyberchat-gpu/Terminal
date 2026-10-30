# CyOS v0.5.37 — layout state preservation

## Change
Theater and PiP layout no longer set `S.open.playlist = false`.

This corrects an inconsistency in v0.5.36: the layout function was documented as geometry-only, but still forcibly closed Playlist in both Theater and PiP. Switching layouts now changes window geometry without overriding the user's Playlist open/closed state.

## Preserved behavior
- Existing open/closed/minimized state remains owned by the window manager.
- Desktop icons remain launchers: open or focus, never toggle.
- v0.5.36 focus-surface and focus-transfer behavior is unchanged.
- No command, permission, socket, chat, video, playlist, or public API behavior is intentionally changed.

## Verification
- Source-based: confirmed exactly two forced Playlist-close assignments existed in layout and both were removed.
- Source-based: version/header updated to 0.5.37; no other occurrences of the forced assignment remain in layout.
- Runtime: not yet tested. Please test opening Playlist, switching to Theater and PiP, and returning to Split; verify Playlist remains open until explicitly closed.
