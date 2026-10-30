# CyOS v0.5.40 — no stale focus when no windows remain visible

## Change
Closing or minimizing the currently focused window now selects the topmost remaining visible window. If none remains, CyOS clears `S.focus` instead of assigning the closed Chat window or the minimized window as a false focus target. The active element is blurred in that no-window case.

## Why
The prior fallback logic used `topVisible() || "chat"` for close and `topVisible() || n` for minimize. If every window was closed/minimized, the logical focus could point to a hidden window. That also caused `focusSurface()` to focus an off-screen window after the state transition.

## Verification
- Source-based: both close and minimize paths now use the same no-visible-window behavior.
- Source-based: focusSurface is called only when a visible fallback exists; otherwise the current active element is blurred.
- Runtime: not yet tested. Close all visible windows one by one, then minimize the last visible window in a separate run. Confirm the status reports no focused window and keyboard focus is not trapped in a hidden titlebar/input. Reopen a window from its desktop icon.
