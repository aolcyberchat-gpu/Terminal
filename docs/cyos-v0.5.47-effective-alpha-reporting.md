# CyOS v0.5.47 — Effective Alpha Reporting

**Base:** v0.5.46  
**Branch:** `cyos-v0.5.47-effective-alpha-reporting`  
**Runtime test status:** Not yet tested by the user

## Change

The alpha command previously reported only `getAlpha(id)`, which is the configured/stored value. Theater CSS applies a 76% multiplier to Chat's message buffer and chat input, so the old output could say 100% while those surfaces visibly rendered at 76%.

v0.5.47 reports:
- Chat configured alpha.
- Chat frame/titlebar effective alpha.
- Chat message buffer/input effective alpha.
- Theater's 76% override when active.
- Optional userlist alpha separately when the userlist is shown.
- Other windows as configured/effective alpha, since their current background rule uses the configured value.

The `wins` output also distinguishes Chat's surfaces instead of showing one ambiguous number.

## Verification boundary

Source inspection confirms the CSS selector applies the 76% multiplier only to `#chatwrap`, `#messagebuffer`, and `#chatline` under Theater mode. The userlist has its own 100%-of-configured rule. This release does not claim browser/runtime testing; please test it in CyTube.

## Test

1. Install v0.5.47 in place of v0.5.46.
2. Run `alpha` in Terminal in the normal split layout.
3. Switch to View → Theater and run `alpha` again.
4. Compare Chat's configured/frame values with buffer/input. At a configured 100%, Theater should report buffer/input as 76%.
5. Run `alpha chat 70` in Theater. Expected: configured/frame 70%, buffer/input 53% (rounded), with the Theater override identified.
6. Toggle the userlist on and verify its reported alpha follows the configured value, not the 76% buffer/input multiplier.
7. Run `wins` and verify Chat is not represented by one misleading alpha number.

No changes were made to `main`.
