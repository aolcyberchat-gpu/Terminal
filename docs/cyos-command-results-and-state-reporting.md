# CyOS Command Results and State Reporting

## User-facing principle

Commands report what actually happened, at the abstraction level users understand. Do not expose implementation details unless a diagnostic command specifically calls for them.

## Layers

- **Command registry:** names, aliases, usage, scope, permissions and confirmation metadata.
- **Dispatcher:** resolves the command, invokes it and recognizes a structured result.
- **Action:** performs the requested operation and returns an outcome.
- **State inspector:** reads authoritative post-action application state.
- **Command Result Reporter:** presents the outcome in concise user-facing language.

## Action Result contract

New local commands may return an opt-in structured result with:
- `status`: `success`, `failure`, `pending`, or `unknown`.
- `action`: stable action identifier.
- `target`: affected window or object, when applicable.
- `message`: user-facing summary.
- `details`: optional diagnostic data, not automatically displayed.

The dispatcher recognizes this result and routes it through the shared reporter. Commands that have not migrated retain their existing behavior.

## Truthful status semantics

- **success:** the action completed and the relevant resulting state was observed.
- **failure:** validation, permission, or execution failed.
- **pending:** an operation was initiated but completion is not yet confirmed.
- **unknown:** available interfaces cannot establish whether it succeeded.

A successful socket emit means only that a request was sent. It does not prove server acceptance or completion. Async room actions remain pending until an acknowledgement, callback, event, or authoritative state change confirms the outcome.

## User-facing output

Report truth at the abstraction level of the user's mental model. A user sees one Chat window, not its internal DOM surfaces. Keep configured/effective state distinctions internally, but show concise results in ordinary commands.

## Implemented migrations

### v0.5.49 — focus

The dispatcher gained an opt-in structured Action Result. `focus <window>` validates the target, performs the focus operation, then checks CyOS focus and visibility/tab state. It reports success only when the target is confirmed focused and visible. Unknown targets return failure.

### v0.5.50 — show/open and hide

- `show <window>` and `open <window>` validate the target, perform the open/focus operation, then verify desktop visibility or the active mobile tab.
- `hide <window>` validates the target, performs the close operation on desktop, and verifies it is no longer open or minimized.
- Mobile does not support closing/hiding windows; `hide` reports that limitation as a failure instead of claiming success when nothing changed.
- Both commands use the shared Action Result reporter.

## Migration strategy

Migrate incrementally:
1. Local window actions (focus, show/open, hide).
2. Geometry, layout, alpha and other local state changes.
3. Playlist and chat actions, distinguishing pending from confirmed outcomes.
4. Consistent reporting across Terminal, palette and other entry points.

Do not rewrite all commands at once. Preserve legacy behavior until each command has a well-defined result and a reliable way to inspect the outcome.
