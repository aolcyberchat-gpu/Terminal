# CyOS v0.5.48 — Simple Alpha Output

**Base:** v0.5.47  
**Branch:** `cyos-v0.5.48-simple-alpha-output`  
**Runtime test status:** Source syntax checked; browser test pending

## Change

The previous alpha output exposed internal implementation details (frame/titlebar, buffer/input, userlist, configured alpha). Those are not meaningful concepts to someone using CyOS: they see one Chat window.

v0.5.48 simplifies the user-facing result to one effective window opacity:
- Normal layout: the configured opacity.
- Theater Chat: the effective content opacity after the Theater CSS multiplier, with a concise `(theater)` label.
- Other windows: their effective opacity.

The internal alpha resolver still keeps the configured value and Theater override distinct. Only the user-facing formatting changed. No CSS, geometry, or opacity-setting behavior was changed.

## Expected output

In Theater mode, with Chat configured at 100%:

```text
chat        76% (theater)
video       100%
playlist    100%
```

Outside Theater, Chat configured at 100% reports `100%`.

If Chat is configured at 70% while Theater is active, the effective content opacity is 53% after rounding.

## Test

1. Install v0.5.48.
2. Run `alpha` in split mode and verify Chat reports its configured/effective value without implementation details.
3. Switch to Theater and run `alpha`; Chat should show `76% (theater)` at a configured 100%.
4. Run `alpha chat 70`; it should report `53% (theater)`.
5. Run `wins` and verify it uses the same concise Chat value.

The architecture note remains the source of the broader rule: command results should report observable outcomes, while internal state detail stays internal unless it helps the user.
