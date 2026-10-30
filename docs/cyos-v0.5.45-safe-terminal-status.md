# CyOS v0.5.45 — safe Terminal status rendering

## Change
- Replaced `ui.termStatus.innerHTML` with `textContent`.
- Updated the Terminal startup hint: it no longer refers to the removed menu-bar status flag and accurately describes the Terminal status strip.

## Why
The focused window name can come from a registered extension window ID. Interpolating it into `innerHTML` allowed metadata to be interpreted as markup. The status strip is plain status text, so it should be rendered as text.

## Verification
- Source-based: Terminal status no longer assigns dynamic status values to `innerHTML`.
- Source-based: status-strip help no longer references the removed menu-bar flag.
- Runtime: not yet tested. Open Terminal, confirm the status strip still shows version/focus/layout/playlist lock/window count, and check the startup hint is accurate.
