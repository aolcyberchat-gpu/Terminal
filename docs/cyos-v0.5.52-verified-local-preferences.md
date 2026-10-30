# CyOS v0.5.52 — Verified Local Window Controls and Preferences

**Base:** v0.5.51  
**Branch:** `cyos-v0.5.52-verified-local-preferences`  
**Runtime test status:** JavaScript syntax-checked; browser test pending

## Changes

Migrated the following local actions to structured Action Results:

- `chat`, `video`, `list`/`pl`/`playlist`, `console`/`log`, and `terminal`/`term`/`shell` now report the resulting window state. These retain their prior toggle/open semantics.
- `top [window]` reports whether the selected window is always-on-top or back to normal stacking.
- `menumode focus|open` validates the argument and reports the selected menu-bar mode.
- `users` and `nav` toggle their respective settings and report the resulting value.
- `sysmsg [on|off]` now validates explicit values and reports the resulting queue-message setting.
- `theme [mac|term]` validates explicit values and verifies both state and applied theme class.

The dedicated `help` command continues to call its existing `showHelp()` function; it was intentionally left out of this migration to preserve its special behavior.

No CyTube server/socket commands were changed in this release.

## Test

1. Run `chat`; verify Chat opens and receives focus.
2. Run `video` twice; verify it toggles open/closed on desktop. On mobile, verify it selects the Video tab.
3. Run `list`, `console`, and `terminal`; verify each reports the state that actually results.
4. Run `top video` twice; verify the messages alternate between always-on-top and normal stacking.
5. Run `menumode focus`, then `menumode open`.
6. Run `users` and `nav` twice each; verify the reported state alternates.
7. Run `sysmsg on`, `sysmsg off`, and `sysmsg invalid`.
8. Run `theme mac`, `theme term`, and `theme invalid`.
9. Run `help` to confirm the existing Help behavior is unchanged.
10. Re-test focus/show/hide, layout, snap, max, and restore.

No changes were made to `main`.
