# CyOS Command Results and State Reporting

**Status:** Architecture principle adopted; incremental implementation  
**Applies to:** CyOS command registry, dispatcher, local actions, CyTube actions, and Terminal output

## Core rule

A command must report what actually happened, not merely what it was asked to do.

Command output is evidence about an action and the resulting application state. It is not a paraphrase of the command's documentation, usage string, or intended effect.

## Keep these layers distinct

1. **Command registry** — describes command names, aliases, usage, scope, permissions, and help text. It is metadata, not proof that an action occurred.
2. **Dispatcher** — resolves aliases, parses arguments, validates input and permissions, invokes the action, and captures its result.
3. **Action** — performs the operation and returns an outcome that reflects what it could actually establish.
4. **State inspector** — reads authoritative current application state, including effective UI/rendering state where that differs from stored configuration.
5. **Result reporter** — formats the action outcome and inspected state for Terminal, Console, palette, or other interfaces.

The preferred name for the reporting layer is **Command Result Reporter**. Its structured input is an **Action Result**, supplemented by a **State Inspector** when current state needs to be verified.

## Result vocabulary

Use outcomes that do not overclaim:

- **success** — the requested local operation completed and its result is observable.
- **failure** — validation, permission, API, or execution failed.
- **pending** — an operation was initiated but completion has not yet been confirmed.
- **unknown** — the available interfaces cannot establish whether it succeeded.

For asynchronous CyTube/server operations, a successful socket emit means only **request sent**. It does not prove that the server accepted the request or that the requested state change occurred. Report the request as pending unless a server callback/event or authoritative state inspection confirms the outcome.

## State must describe what is effective

Distinguish at least:

- **configured state** — the value stored/requested by CyOS.
- **effective state** — the value currently applied by the relevant runtime or renderer.
- **override/context** — a layout, theme, viewport, or other rule that modifies the effective result.

Do not collapse multiple independently rendered surfaces into one misleading value. For example, in Theater mode Chat's configured alpha is applied to the frame/titlebar and userlist, while the CSS applies a 76% multiplier to the message buffer and chat input. Reporting a single "Chat alpha" conceals that difference.

## Migration strategy

Do not replace the command system in one rewrite. Preserve the existing command registry and dispatcher API while migrating incrementally:

1. Local synchronous commands (alpha, focus, open/close, geometry) return structured outcomes and report inspected state.
2. Local commands with multiple UI effects report each observable result.
3. CyTube/socket actions distinguish request dispatch from server-confirmed completion.
4. Add consistent result formatting across Terminal, Console, and palette entry points.

## Acceptance criteria

- A command never reports success solely because it was dispatched.
- Errors and permission denials remain explicit.
- Reported state is read after the action when possible.
- Configured values are not mislabeled as effective values.
- Layout-specific and per-surface overrides are identified.
- Unknown or unconfirmed outcomes are stated honestly.
- Help/usage metadata remains separate from runtime results.

## v0.5.47 implementation

The alpha command now reports Chat's configured alpha separately from its effective frame/titlebar and buffer/input backgrounds. In Theater mode, the buffer/input result includes the CSS 76% multiplier. The optional userlist is reported separately when shown. Other windows retain a configured/effective single value because their current background rule uses the configured alpha directly.

This is an alpha-specific state-reporting improvement, not yet a general structured Action Result contract. The broader dispatcher/reporter migration remains incremental work.
