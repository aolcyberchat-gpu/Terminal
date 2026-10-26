# CyTube OS --- Visual Language & Interaction Specification

**Document status:** Design draft for review\
**Target implementation:** v0.4 and later\
**Scope:** Visual style, desktop behavior, menus, keyboard navigation,
commands, help, logs, and accessibility\
**Supersedes:** Nothing yet. This document consolidates the existing
CyTube OS visual/command-language draft and the newer desktop
interaction proposal; unresolved decisions remain explicitly marked.

------------------------------------------------------------------------

## 1. Purpose

CyTube OS is a small desktop environment layered over a CyTube channel
page. It should feel like a compact, classic desktop operating system
rather than a collection of unrelated floating panels.

The design combines a restrained monochrome visual language, overlapping
movable windows, desktop icons, a persistent menu bar, keyboard-first
navigation, contextual help, and a shared command system.

The interface should be discoverable: users should be able to learn
keyboard commands by looking at menus, focusing controls, hovering with
a mouse, or opening Help. Keyboard support must not make the interface
unusable by mouse or touch.

### 1.1 Design goals

1.  **Consistent command behavior:** menus, keyboard shortcuts, command
    palette, terminal, and mouse controls invoke the same underlying
    actions.
2.  **Keyboard-first, not keyboard-only:** all important actions are
    keyboard-accessible, while mouse and touch remain supported.
3.  **Discoverability:** labels, access-key underlines, shortcut hints,
    tooltips, and Help explain what an action does and how to invoke it.
4.  **Classic desktop character:** a compact menu bar, crisp borders,
    overlapping windows, draggable title bars, desktop icons, and
    restrained monochrome graphics.
5.  **Safe room actions:** permissions are checked conservatively in the
    client, while CyTube/server-side authorization remains
    authoritative.
6.  **Progressive implementation:** improve the existing v0.4 code in
    small, testable steps instead of replacing it wholesale without
    need.
7.  **Honest status:** unavailable, denied, failed, or unsupported
    operations must not appear to have succeeded.

### 1.2 Non-goals

-   Reimplementing a complete historical Macintosh or Windows desktop
    pixel-for-pixel.
-   Claiming that client-side JavaScript can grant server permissions or
    bypass CyTube authorization.
-   Exposing every conceivable CyTube operation before its event,
    permission, and failure behavior is verified.
-   Adding animation or decorative complexity at the expense of
    reliability, readability, or mobile use.

------------------------------------------------------------------------

## 2. Design lineage and terminology

The intended feel is inspired by classic Macintosh desktop conventions
and early desktop operating systems: menu-bar navigation, a clear active
window, title-bar dragging, overlapping windows, desktop icons, and
keyboard shortcuts.

The interaction model may deliberately combine conventions from
different systems. In particular, **underlined access letters** are a
useful Windows-style convention and should not be presented as a claim
that every classic Macintosh version behaved that way.

Use these terms consistently:

-   **Menu bar:** persistent row of top-level menus.
-   **Menu:** dropdown opened from the menu bar.
-   **Access key:** a letter used to activate an item while its menu or
    context is active; visually underlined where supported.
-   **Shortcut:** a key combination or documented key sequence that
    invokes an action directly.
-   **Focus:** the control or window currently receiving keyboard input.
-   **Active window:** the focused window, normally drawn in front of
    other windows.
-   **Desktop icon:** a movable launcher or representation of a
    window/tool.
-   **Command registry:** the authoritative list of supported commands
    and their metadata.
-   **Command dispatcher:** the shared execution path that validates and
    runs a command.
-   **Terminal:** a movable window that combines command entry,
    help/reference, and logs.
-   **Scope:** whether a command is local to the current browser,
    affects the shared room, or sends public chat.

------------------------------------------------------------------------

## 3. Visual language

### 3.1 Palette and rendering

The baseline is a **six-level grayscale visual system**, using black,
white, and intermediate grays/dither patterns. Keep contrast high and
decoration restrained.

-   Prefer hard borders and simple shadows over soft gradients.
-   Prefer square or minimally rounded corners.
-   Use a sans-serif face for interface chrome and a monospace face for
    commands, logs, and diagnostic output.
-   Use small, simple, high-contrast icons; the existing target is 32 ×
    32, 1-bit icon artwork where practical.
-   Do not rely on color alone to communicate focus, permission,
    selection, busy state, or errors.
-   Dither patterns may represent inactive or busy states, but must
    remain distinguishable at mobile sizes.
-   Preserve readable text sizes and sufficient touch targets on small
    screens.

### 3.2 State grammar

These visual meanings should be consistent throughout the interface:

  -----------------------------------------------------------------------
  Visual treatment                    Meaning
  ----------------------------------- -----------------------------------
  Inverted foreground/background      Current selection or strong focus

  Clear outline                       Keyboard selection or focus, where
                                      inversion would be too heavy

  Title-bar stripe                    Draggable window title bar

  Dithered treatment                  Inactive, disabled, or busy state;
                                      pair with a clear label when
                                      ambiguity is possible

  Dotted rule                         Lightweight separation within lists
                                      or menus

  Double border                       Modal or confirmation that requires
                                      attention

  Underlined text                     Link, runnable command, or access
                                      key, depending on context

  Raised/outlined control             Clickable control; must also have a
                                      label or accessible name
  -----------------------------------------------------------------------

Do not assign one treatment multiple conflicting meanings in the same
context. If an element is disabled, its state must not be communicated
only through a subtle texture.

### 3.3 Menu bar

The menu bar stays at the top of the CyTube OS workspace and remains
visually distinct from the window content.

Proposed initial top-level menus:

-   **CyTube OS** --- About, preferences, desktop settings, and UI
    reset/reload options where safe.
-   **File** --- open tools, save/export supported data, and other
    file-like operations.
-   **Edit** --- command-input editing and applicable copy/paste or
    selection actions.
-   **View** --- desktop visibility, layout, zoom, and window appearance
    options.
-   **Window** --- open-window list and focus/window management.
-   **Chat** --- chat-specific commands and options when implemented.
-   **Playlist** --- supported playlist navigation and actions.
-   **Help** --- command reference, keyboard shortcuts, and
    troubleshooting.

This list is a proposal, not a claim that every menu is already
implemented. The exact menu set and menu-item assignments remain open
for review.

Common menus such as Window and Help should remain predictable. Where
useful, a menu may expose additional items for the active window.
Context-sensitive items must not cause menu positions or shortcuts to
change unpredictably.

### 3.4 Menu dropdowns

-   Clicking a top-level item opens its dropdown.
-   The currently open menu and selected item have clear visual states.
-   Disabled items remain readable and explain why they are unavailable
    when practical.
-   Separators group related operations without clutter.
-   Submenus are indicated with a right-pointing marker.
-   Menu placement must remain within the visible viewport.
-   Menus must work with mouse, keyboard, and touch.

### 3.5 Windows

Windows should feel like recognizable desktop windows rather than
generic cards.

-   Each window has a title bar and a clear active/inactive state.
-   Dragging the title bar moves the window; dragging a resize grip
    resizes it when resizing is supported.
-   Clicking a window brings it to the front and gives it focus.
-   Closing a window hides/closes that UI surface without accidentally
    destroying unrelated application state.
-   Minimize/restore should preserve the window's state if implemented.
-   Double-clicking a title bar may zoom/restore the window, provided
    this behavior is discoverable and does not conflict with touch.
-   Window controls need accessible names and visible focus states.
-   Window stacking, dragging, and resizing must not break embedded
    media players or reload an iframe as a side effect.
-   On narrow/mobile viewports, simplify window chrome when needed while
    preserving access to all functions.

**Implementation note:** v0.4 already wraps existing CyTube DOM regions
as windows. Changes must account for that architecture and avoid moving
or recreating embedded media elements in ways that interrupt playback.

### 3.6 Desktop icons

-   Icons represent tools or windows, such as Chat, Playlist, and
    Terminal.
-   Icons are selectable and movable.
-   Double-click or Enter opens the selected icon's destination.
-   Icons have visible selected and focused states.
-   Windows may overlap desktop icons; icons should not be forced above
    every window.
-   An Arrange Icons command may restore a predictable layout.
-   On touch devices, provide a practical way to select and move icons
    without requiring hover.
-   Position persistence is desirable but should follow reliable drag,
    focus, and stacking behavior.

------------------------------------------------------------------------

## 4. Keyboard and focus model

### 4.1 General rules

1.  Every important action must have a keyboard path.
2.  Do not steal keystrokes while the user is typing in a text field,
    content-editable region, or chat input, except for explicitly scoped
    input commands.
3.  Global shortcuts must be few, documented, and unlikely to collide
    with browser or operating-system shortcuts.
4.  Access keys are context-sensitive. For example, `T` may activate
    Transparency while a View submenu is open, but must not change
    transparency when the user is typing `T` into chat.
5.  `Escape` closes the topmost menu/submenu or cancels a pending
    operation before it changes the broader UI mode.
6.  Keyboard focus must always be visible.
7.  If a Ctrl/Alt shortcut is provided, document a suitable alternative
    sequence where practical for devices where modifier keys are awkward
    or unavailable.
8.  Never make keyboard support the only way to perform an action.

### 4.2 Proposed menu navigation

This is the intended behavior; exact global entry shortcuts remain to be
finalized.

-   A documented shortcut or menu-bar control moves focus to the menu
    bar.
-   Left/Right arrows select top-level menus.
-   Enter or Down opens the selected menu.
-   Up/Down moves through menu items.
-   Enter activates the selected item.
-   An underlined access letter activates its item when that menu
    context is active.
-   Right opens a submenu; Left returns to the parent menu where
    applicable.
-   Escape closes a submenu/menu; a second Escape may return focus to
    the prior control.
-   Tab behavior should be consistent and documented; it must not trap
    the user in menus.

The implementation should not depend on a single undocumented key
combination. The menu bar itself should be clickable, and Help should
explain the keyboard path.

### 4.3 Shortcut hints and access-key underlines

-   Show a shortcut hint beside menu items that have a direct shortcut.
-   Underline an access letter when it is active in the current menu
    context.
-   Do not underline a letter merely for decoration.
-   Distinguish an access key from a global shortcut in Help and
    documentation.
-   Avoid assigning duplicate access letters to sibling items unless the
    collision is explicitly handled.
-   If a shortcut is unavailable due to focus context, the interface
    should make that context clear.

### 4.4 Tooltips

Tooltips should support both pointer hover and keyboard focus.

Where useful, a tooltip should state:

1.  What the control does.
2.  Its menu path.
3.  Its shortcut or access key, if one exists.

Example:
`Adjust chat transparency — View > Chat Window > Transparency — shortcut: …`

-   Do not make a tooltip the only source of essential information.
-   Touch users need visible labels or an equivalent help mechanism
    because hover is unavailable.
-   Tooltips should not obscure the item or persist after focus has
    moved away.
-   Tooltips must not claim shortcuts that are not actually registered.

### 4.5 Existing and proposed keys

The current v0.4 help text describes several existing Desk-mode keys,
including `Esc`, `Ctrl+K`, `c`, `v`, `p`, `o`, `Tab`, `m`, `[`, `]`,
`z`, `t`, `x`, `d`, `s`, `u`, `n`, `a`, `j`, `k`, Enter, and Delete.
Their exact behavior must be verified against the script before being
treated as stable public API.

Do not silently remap existing keys as part of the menu work. Create and
maintain a shortcut inventory, identify collisions, and document any
intentional changes.

------------------------------------------------------------------------

## 5. One command system

### 5.1 Core rule

**Menus, mouse controls, keyboard shortcuts, the command palette, and
Terminal input must call the same command definitions and dispatcher.**

Do not separately reimplement the same operation in a menu click
handler, a keyboard handler, and a terminal parser. The different
interfaces should be front ends to the same action.

Each command definition should carry enough metadata to support:

-   Canonical command name and aliases.
-   Description and usage.
-   Applicable target and arguments.
-   Scope: local, room, or public chat.
-   Permission requirements.
-   Whether confirmation is required.
-   Keyboard shortcut/access-key metadata where applicable.
-   Availability/enabled state.
-   A result or error message suitable for the Terminal log and UI
    notification.

The Help command reference and menu shortcut hints should be generated
from the same metadata where feasible.

### 5.2 Command grammar

The existing draft uses:

`verb [target] [args]`

Keep this as the default shape unless a documented command needs a
different form.

Proposed namespaces from the earlier draft:

-   `pl.` --- playlist
-   `win.` --- windows
-   `layout.` --- layout
-   `chat.` --- chat
-   `user.` --- user-related actions
-   `mod.` --- moderation
-   `sys.` --- CyTube OS/system UI

Existing aliases and target syntax should be preserved only after
checking the current parser and avoiding collisions. The earlier draft
described targets including playlist indexes, `.`, `+1`, `-1`, `$`,
ranges, `/text/`, and `@name`; these are design vocabulary, not proof
that every target type is implemented.

### 5.3 Scope and reporting

Use consistent scope markers:

-   `○` --- local-only UI action.
-   `●` --- room action visible to other room participants.
-   `✉` --- public chat message.

The exact glyphs may be revisited for font and accessibility support,
but scope must remain explicit.

Server slash commands such as moderation commands must be routed through
CyTube's normal handling rather than accidentally posted as ordinary
public chat. The command interface must classify and report their scope
correctly. Do not intercept unknown slash commands unless the behavior
is deliberate and documented.

### 5.4 Permissions and failure behavior

-   Missing permission information must not default to permission
    granted.
-   If the permission API is missing or throws, fail closed for
    operations that require authorization.
-   Explain denied actions clearly.
-   Disable or visually mark unavailable menu commands when the client
    can reliably determine their status.
-   Client checks improve usability but are not a security boundary.
    CyTube/server-side authorization remains authoritative.
-   Do not show success until the operation has actually been accepted
    or the available API gives sufficient evidence of success.
-   Distinguish local UI changes, socket emission, server
    acknowledgement, and confirmed server state where those are
    different.

### 5.5 Destructive actions

Destructive or disruptive actions should ask for confirmation in the
UI/Terminal when appropriate. Confirmation must be keyboard-operable and
have a clear cancel path.

-   Entering the affirmative choice confirms.
-   Escape or the negative choice cancels.
-   A timeout, if used, cancels rather than confirms.
-   The prompt should state the action and target.
-   Do not use confirmation prompts for every harmless local action;
    reserve them for meaningful consequences.

------------------------------------------------------------------------

## 6. Terminal: command, help, and logs

### 6.1 Purpose

Terminal is the shared, movable workspace for:

-   Entering commands.
-   Viewing command results and errors.
-   Browsing command history.
-   Reading the command and shortcut reference.
-   Inspecting recent logs.
-   Exporting logs when feasible.

The menu bar should provide a direct **Help \> Terminal** route or an
equivalent clearly named entry, and the desktop should have a Terminal
icon. Both entry points should open/focus the same Terminal window
rather than create duplicate windows by default.

### 6.2 Terminal views

Keep the functions distinct within one window:

-   **Command:** command input, output, and history.
-   **Help:** searchable command reference, aliases, usage, scopes,
    permissions, and keyboard shortcuts.
-   **Logs:** recent diagnostics, command echoes, results, warnings, and
    errors.

These can be tabs, panes, or a simple selector. Choose the least complex
UI that remains usable on mobile.

### 6.3 Command input and history

-   Enter runs the current command.
-   Up/Down navigate command history when the command input has focus.
-   History behavior must not override normal text editing or browser
    navigation unexpectedly.
-   Palette and Terminal history should share a consistent policy;
    whether they share one history store is an implementation decision.
-   Invalid commands should return concise errors plus usage/help where
    useful.
-   Public chat text sent from Terminal must be clearly distinguished
    from local commands.
-   The Terminal must not evaluate arbitrary JavaScript. It is a command
    interface, not an unrestricted developer console.

### 6.4 Logs

-   Keep a bounded in-memory log so the UI cannot grow without limit.
-   Clearly distinguish command echo, informational result, warning, and
    error.
-   Provide a **Display Logs** action that opens/focuses Terminal's Logs
    view.
-   Provide a **Save/Export Logs** action where browser capabilities
    permit it.
-   Export should explain what is included and avoid silently
    transmitting logs to a server.
-   Clearing logs should be explicit and should not falsely imply that
    the underlying error or event never happened.
-   Logs should not expose credentials, private keys, or other secrets.

### 6.5 Help

Help should be available from the menu bar and Terminal. It should
include:

-   A quick-start keyboard guide.
-   Menu navigation instructions.
-   Commands, aliases, arguments, and examples.
-   Scope and permission indicators.
-   Shortcut and access-key reference.
-   Troubleshooting and known limitations.
-   Version information.

Where feasible, generate command/shortcut tables from the actual
registry so Help does not drift from implemented behavior.

------------------------------------------------------------------------

## 7. Active-window menus and contextual actions

The active window may contribute relevant menu items, following a
predictable rule:

-   Common menus stay stable.
-   Contextual items appear in a consistent location.
-   Items that do not apply are disabled or omitted according to a
    documented policy.
-   The user can discover contextual commands through the active
    window's menu and Help.
-   A menu item, its shortcut, and its Terminal command all invoke the
    same underlying command.

Example design flow, not yet a required implemented command:

`View > Chat Window > Transparency`

The Transparency item may open a slider or adjustment control. The
chosen value should be available to the keyboard and pointer, and its
state should be reported accurately. A direct command may later expose
the same operation, but its syntax must be registered and documented
rather than invented ad hoc.

------------------------------------------------------------------------

## 8. Desktop and window behavior

### 8.1 Focus and stacking

-   Clicking a window focuses it and brings it to the front.
-   Keyboard switching changes focus predictably.
-   The active window is visually obvious.
-   Focus must not be lost into hidden CyTube elements.
-   Closing or hiding a window returns focus to a sensible surviving
    window or the desktop.
-   A hidden or inactive window must not continue intercepting keyboard
    shortcuts unexpectedly.

### 8.2 Moving and resizing

-   Drag the title bar to move a window.
-   Use a visible resize affordance where resizing is supported.
-   Provide keyboard movement/resizing modes where practical, with clear
    entry and exit instructions.
-   Snap/zoom behavior should be consistent and reversible.
-   Do not move existing media DOM nodes if that risks reloading an
    embedded player.

### 8.3 Icons and window relationship

-   Desktop icons live in the desktop layer.
-   Windows stack above icons.
-   Selecting an icon should not accidentally drag a window.
-   Moving icons and moving windows must have distinct, discoverable
    interaction targets.
-   Arrange/restore commands should recover from accidental clutter.

### 8.4 Responsive behavior

The desktop must remain usable on narrow/mobile screens. It is
acceptable to simplify window chrome, change how windows are presented,
or use tabs when space is limited, as long as the same functions remain
available and the mode change is understandable.

------------------------------------------------------------------------

## 9. Accessibility and input safety

-   Use semantic buttons and controls where practical.
-   Provide accessible names for icon-only controls.
-   Show visible keyboard focus.
-   Do not use color or dithering as the sole status indicator.
-   Ensure tooltips and menus are operable without a mouse.
-   Avoid trapping focus in a menu or modal.
-   Avoid shortcuts that fire while typing in chat or Terminal input
    unless they are explicitly intended for that input.
-   Respect browser and operating-system conventions where possible.
-   Make confirmation dialogs operable by keyboard, pointer, and touch.
-   Preserve a way to return to the normal CyTube page. The earlier
    draft describes `?plain=1` as a plain-page escape hatch; verify its
    current implementation before relying on it.

------------------------------------------------------------------------

## 10. Implementation architecture

The implementation should be layered:

1.  **Command registry:** definitions and metadata.
2.  **Dispatcher:** parsing, validation, permission checks,
    confirmation, execution, and result reporting.
3.  **Input adapters:** menu clicks, keyboard shortcuts, command
    palette, Terminal input, and other controls.
4.  **UI components:** menu bar, dropdowns, windows, desktop icons,
    Terminal views, tooltips, notifications, and confirmations.
5.  **CyTube adapters:** narrowly scoped calls to verified
    DOM/API/socket behavior.
6.  **Logging and Help generation:** shared output and references
    derived from actual command metadata.

The command dispatcher should be the common path for commands. UI-only
operations may use internal helpers, but menu and keyboard actions
should not bypass the shared action definition when the action is
represented as a command.

Keep CyTube integration isolated from presentation code as much as
possible. Verify each socket event, permission function, and DOM
dependency before expanding command coverage.

------------------------------------------------------------------------

## 11. Implementation and verification sequence

The recommended order is deliberately incremental.

### Phase 1 --- Safety and command integrity

-   Fix permission handling so missing APIs or exceptions do not grant
    access.
-   Review every room-affecting command and its permission requirements.
-   Centralize command execution so menu, keyboard, palette, and
    Terminal paths converge.
-   Correct scope reporting and preserve normal CyTube handling for
    server slash commands.
-   Verify success/error reporting and confirmation cancellation.

### Phase 2 --- Menu and keyboard foundation

-   Establish the menu bar and dropdown behavior.
-   Implement keyboard focus, arrow navigation, Enter, Escape, access
    keys, and shortcut hints.
-   Add tooltips for pointer hover and keyboard focus.
-   Build a shortcut inventory and check conflicts with chat input and
    browser shortcuts.

### Phase 3 --- Terminal consolidation

-   Combine command entry, Help, and Logs into one movable Terminal
    window.
-   Keep the views distinct and mobile-usable.
-   Define history behavior.
-   Add log display and export, with privacy-conscious defaults.
-   Generate Help from command metadata where feasible.

### Phase 4 --- Desktop behavior

-   Verify window focus, stacking, drag, close, resize, and zoom.
-   Add movable desktop icons.
-   Ensure windows layer above icons.
-   Test that media playback is not interrupted by window operations.
-   Add persistence only after the basic interaction model is stable.

### Phase 5 --- Polish and expansion

-   Add contextual menu items for active windows.
-   Implement transparency and other window appearance settings through
    the shared command system.
-   Refine dither patterns, icons, and tooltip content.
-   Add further CyTube functions only after their behavior and
    permissions are verified.

### Verification labels

When reporting progress, distinguish:

-   **Static inspection:** source reviewed, behavior inferred from code.
-   **Syntax check:** parser accepted the script.
-   **Mocked test:** behavior tested with simulated dependencies.
-   **Browser test:** behavior tested in a browser environment.
-   **Live CyTube test:** behavior tested on an actual CyTube channel.
-   **Not verified:** no adequate test has yet established the behavior.

Do not describe a feature as working merely because its code exists.

------------------------------------------------------------------------

## 12. Open decisions

These decisions should be resolved before or during implementation,
without pretending they have already been settled.

1.  **Top-level menus:** Should the final set include Chat and Playlist
    as always-visible menus, or should those commands appear only when
    the corresponding window is active?
2.  **Menu-bar entry shortcut:** Which shortcut or Escape sequence
    should focus the menu bar without colliding with browser controls or
    chat input?
3.  **Access-key behavior:** Should letters activate items only while a
    menu is open, or should selected menu access keys also work from a
    menu-bar focus state?
4.  **Terminal layout:** Tabs, panes, or a simple view selector?
5.  **Window controls:** Close and zoom first, or include minimize from
    the beginning?
6.  **Desktop icon persistence:** Save positions across reloads, or keep
    them session-only initially?
7.  **Transparency:** What is the minimum/maximum opacity, and should
    text remain fully opaque while the window background changes?
8.  **Log export:** Plain text only initially, or JSON as well?
9.  **Mobile layout:** Use stacked windows/tabs or preserve
    overlapping-window behavior at all widths?
10. **Visual density:** How closely should the final styling follow
    System 6-era Macintosh appearance versus a hybrid monochrome
    desktop?

Until decided, implement the simplest option that preserves
accessibility and the core interaction model, and record the decision
here.

------------------------------------------------------------------------

## 13. Acceptance criteria

A release should not be considered aligned with this specification until
the applicable criteria pass.

### Commands

-   [ ] Menu, keyboard, palette, and Terminal paths use the same command
    definitions for shared actions.
-   [ ] Unknown commands fail clearly without accidentally becoming
    public chat.
-   [ ] Scope is displayed correctly for local, room, and public-chat
    actions.
-   [ ] Missing permission information does not grant access.
-   [ ] Destructive confirmation can be accepted and cancelled by
    keyboard, pointer, and touch.
-   [ ] Results do not claim success without adequate evidence.

### Menus and help

-   [ ] Menus open and close by pointer and keyboard.
-   [ ] Arrow navigation, Enter, Escape, and access keys work as
    documented.
-   [ ] Shortcut hints match registered shortcuts.
-   [ ] Tooltips work on hover and keyboard focus.
-   [ ] Help accurately describes implemented commands and limitations.

### Windows and desktop

-   [ ] Active-window focus and stacking are obvious.
-   [ ] Windows can be moved without interrupting media playback.
-   [ ] Desktop icons can be selected and moved if that feature is
    enabled.
-   [ ] Windows stack above desktop icons.
-   [ ] Keyboard focus does not disappear into hidden CyTube UI.
-   [ ] The interface remains usable on mobile-sized viewports.

### Terminal and logs

-   [ ] Command, Help, and Logs views are accessible from the same
    Terminal window.
-   [ ] History navigation does not break ordinary text editing.
-   [ ] Logs are bounded and categorized.
-   [ ] Log export, if present, is user-initiated and does not silently
    transmit data.

------------------------------------------------------------------------

## 14. Relationship to existing v0.4

This specification is a design target, not a claim that v0.4 already
satisfies it.

The current v0.4 source has useful foundations, including a command
registry and dispatcher, a command palette, several keyboard controls,
window wrapping and dragging, confirmation prompts, a Help reference,
and a local log area. Earlier source review also identified areas to
audit before expanding the interface: fail-open permission fallback, UI
paths that bypass shared command dispatch, inconsistent scope reporting
for slash commands, and incomplete visible shortcut hints.

These are audit findings to verify against the exact source during
implementation, not reasons to rewrite the whole script by default.

**Recommended next step:** review and approve this specification,
resolve only the decisions that block Phase 1, then implement one small
change at a time against the actual v0.4 source.
