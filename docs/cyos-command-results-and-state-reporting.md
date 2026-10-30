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

The dispatcher recognizes this result and routes it through the shared reporter. Commands that have not migrated retain their existing behavior. This allows incremental adoption without a big-bang rewrite.

## Truthful status semantics

- **success:** the action completed and the relevant resulting state was observed.
- **failure:** validation, permission, or execution failed.
- **pending:** an operation was initiated but completion is not yet confirmed.
- **unknown:** available interfaces cannot establish whether it succeeded.

A successful socket emit means only that a request was sent. It does not prove server acceptance or completion. Async room actions must remain pending until an acknowledgement, callback, event, or authoritative state change confirms the outcome.

## v0.5.49 implementation

The dispatcher now recognizes an opt-in structured Action Result. The `focus` command is the first migrated action:
1. Validate the requested window.
2. Call the existing CyOS focus operation.
3. Inspect `S.focus` and the appropriate open/tab state.
4. Return success only when the requested window is confirmed as focused and visible; otherwise return unknown.
5. Let the shared reporter display the result.

Unknown window names return a structured failure.

This is a foundation, not a complete migration. Existing commands still use legacy return/notification behavior until individually migrated. Permission and confirmation wrappers also retain their existing behavior.

## Migration order

1. Focus/open/close and other local window actions.
2. Geometry, layout, alpha and other local state changes.
3. Playlist and chat actions, with pending vs confirmed outcomes.
4. Consistent reporting across Terminal, palette and other entry points.

Keep diagnostic details internal by default. Report one concise result that matches the user's mental model.
