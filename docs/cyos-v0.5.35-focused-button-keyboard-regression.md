# CyOS v0.5.35 — focused-button keyboard regression

## Change

Based on the v0.5.21 baseline, v0.5.35 makes one functional change in the document-level keyboard handler:

```js
const typing = !!t && (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName || "") || t.isContentEditable);
```

Previously, native `BUTTON` elements were not included in the keyboard-handler exemption. When CyOS desk mode was active and a button had keyboard focus, Enter reached `deskKey()` in the document capture listener. The desk handler consumed Enter (and called `preventDefault()` / `stopPropagation()`), which could prevent the browser's native focused-button activation.

The new guard returns before desk shortcuts for focused native buttons, allowing normal Enter and Space activation. The existing CyOS menu keyboard handling remains earlier in the event path, so the menu's own explicit keyboard behavior is retained.

## Why this is the first targeted fix

The v0.5.21 handler already exempted INPUT, TEXTAREA, SELECT, and contenteditable targets. The controlled tests found that appending a native button to a registered window reproduced the failure, while a plain div did not. This patch addresses the specific missing native-button case without changing window lifecycle, focus management, mount timing, or layout behavior.

## Evidence and confidence

- **Source fact:** the v0.5.21 document key handler is registered in capture phase.
- **Source fact:** when desk mode is active, Enter is handled by `deskKey()`; the handler calls `preventDefault()` for recognized keys.
- **Source fact:** the prior typing-target predicate did not include BUTTON.
- **User test evidence:** v0.5.27 (status div, textarea, Save/Clear buttons) failed; v0.5.28 (plain div) worked; v0.5.34 (plain button) failed.
- **Diagnosis:** a focused native button's Enter/Space activation being intercepted is a strong, directly testable explanation. It is not yet a confirmed runtime diagnosis because the test reports do not establish that the button had focus at the exact moment Enter was pressed.

## Test plan

Run the same CyOS channel and interaction sequence with this build:

1. Open a registered test window containing a native `<button type="button">`.
2. Enter CyOS desk mode.
3. Give the button keyboard focus (Tab to it, or click it and then use the keyboard).
4. Press Enter. Confirm the button's click action fires exactly once.
5. Repeat with Space. Confirm native button activation works.
6. With focus on the desktop rather than a button, verify Enter still exits desk mode / performs the existing playlist action.
7. Verify Enter in the Terminal input still submits a command.
8. Verify the CyOS menu's Enter/Space behavior still opens/activates menu items.

Record whether the button had focus when testing. If the original failure persists with a focused button, capture the focused element and key event target; this patch is then insufficient and the investigation should continue from v0.5.21 rather than layering speculative changes.

## Build

- Baseline: `cytube-os-v0.5.21.js` from `main`
- New file: `cytube-os-v0.5.35.js`
- Branch: `cyos-v0.5.35-focus-keyboard-fix`
- No changes made to `main`.
