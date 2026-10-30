# CyOS v0.5.42 — reverse cycle fallback and legacy minimize guidance

## Changes
1. Window cycling now handles a missing/non-visible current focus explicitly. Forward cycling starts at the first visible window; reverse cycling starts at the last visible window. Previously, reverse cycling from no current visible window selected the second-to-last entry.
2. The retained compatibility `minWin()` API no longer tells users to restore from a chip that was removed in v0.5.41. Its notification now points to the desktop icon or window shortcut.

## Scope
No changes to titlebar controls, launcher behavior, layouts, window geometry, or command registration.

## Verification
- Source-based: cycle() has explicit handling for index -1 in both directions.
- Source-based: no remaining minimize notification tells users to use the removed chip.
- Runtime: not yet tested. With no current visible focused window, test Tab and Shift+Tab; Shift+Tab should focus the last visible window. If invoking the retained minimize API through an integration, confirm its restore guidance is accurate.
