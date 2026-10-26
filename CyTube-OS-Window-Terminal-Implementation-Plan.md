# CyTube OS --- Window, Desktop, and Terminal Implementation Plan

**Status:** Draft for review\
**Purpose:** Turn the existing visual-language specification into an
implementation sequence with observable acceptance tests.\
**Baseline:** `cytube-os-v0.4.7.js` is the current working baseline
reported by the project owner. `v0.4.8` was generated but was not
adopted or live-tested; do not use it as the base for this work without
explicit approval.

## 1. Goals

1.  Make windows behave consistently as desktop windows.
2.  Establish a clear relationship between the desktop, icons, windows,
    and menu bar.
3.  Preserve working CyTube OS behavior while changing window mechanics.
4.  Build Terminal as the shared command/help/log workspace after the
    window model is stable.
5.  Keep implementation claims grounded in source inspection and live
    tests; distinguish static checks from browser verification.

## 2. Non-goals for the first window release

-   Do not add a batch of new playlist/chat commands.
-   Do not implement arbitrary Bash compatibility.
-   Do not execute arbitrary JavaScript or CSS from Terminal.
-   Do not redesign every icon or require icons to be movable
    immediately.
-   Do not change server-side CyTube behavior or imply client-side
    permission checks are a security boundary.
-   Do not silently base the work on the untested v0.4.8 script.

## 3. Desktop layers and geometry

### 3.1 Layering contract

Use a consistent conceptual stack:

1.  CyTube page/background and desktop surface.
2.  Desktop icons and desktop selection state.
3.  Application windows, stacked by z-order.
4.  Active window chrome and menus/popovers above their associated
    window.
5.  Persistent OS menu bar and global overlays where appropriate.

Windows must be able to overlap desktop icons. Icons must not reserve a
permanent strip that prevents windows from entering that region. The
menu bar may reserve its own height because it is a persistent system
surface.

### 3.2 Window bounds

-   Calculate usable desktop bounds from the viewport and persistent
    menu bar, not from the desktop icon column.
-   Keep windows reachable: prevent a window from being moved entirely
    off-screen.
-   On small viewports, constrain windows to the available area and
    preserve usable controls.
-   Recalculate bounds on viewport resize/orientation change without
    unexpectedly resetting a user's chosen layout.
-   Do not recreate or reparent underlying CyTube media elements in a
    way that reloads playback unless source inspection and testing show
    it is safe.

### 3.3 Icons

-   Icons belong to the desktop layer and may be covered by windows.
-   Opening an icon should open or focus its associated window rather
    than create duplicates by default.
-   Icon movement is a later enhancement, not a prerequisite for fixing
    window layering.
-   If icon movement is added later, dragging an icon must be
    distinguishable from dragging a window, and touch behavior must not
    interfere with normal tapping or page scrolling.
-   Provide an Arrange Icons/reset arrangement option only when icon
    movement exists.

## 4. Window controls and state

Every supported application window should use the same documented
control semantics.

-   **Close:** Hide/close the UI surface without unintentionally
    destroying useful underlying state. Reopening should follow a
    documented policy.
-   **Minimize:** Remove the window from the active desktop view while
    preserving state; provide a discoverable restore path.
-   **Maximize/Zoom:** Expand the window to the usable desktop bounds.
    Activating it again restores the prior bounds.
-   **Resize:** Resize using supported edges/corners, respecting minimum
    dimensions and viewport limits.
-   **Move:** Drag the title bar; dragging inside content should not
    move the window.
-   **Focus/stacking:** Clicking a window brings it to the front and
    makes it active. Only the active window should receive
    window-specific keyboard input.
-   **Focus return:** Closing or hiding the active window should focus a
    sensible remaining window or the desktop.
-   **Persistence:** Do not promise saved/restored window state until
    persistence is implemented and tested.

### 4.1 Snapping

Planned snap targets:

-   Left half.
-   Right half.
-   Top-left quarter.
-   Top-right quarter.
-   Bottom-left quarter.
-   Bottom-right quarter.
-   Maximize/full usable area.

Snapping should use the same usable desktop bounds as maximize.
Restoring from a snap should return to the previous custom size and
position where feasible. Do not implement snap targets that overlap the
menu bar or leave window controls unreachable.

### 4.2 Layout presets

The existing Layout control may remain a cycle through fixed
arrangements, but each preset must be explicitly defined and documented.
Layout presets should be composed from the same window geometry/state
mechanism used by manual move, resize, maximize, and snap. A preset must
not be a separate competing layout system.

## 5. Terminal direction

Terminal is a planned shared command and diagnostics workspace, not a
claim to provide a full host operating-system shell.

### 5.1 Window identity

-   The desktop Terminal icon and menu entry should open/focus the same
    Terminal window.
-   Help and Console should eventually be consolidated into views inside
    Terminal rather than remain inconsistent independent surfaces.
-   Terminal should use the same title bar, move, resize, minimize,
    maximize/restore, close, focus, z-order, and snap behavior as other
    windows.

### 5.2 Views

-   **Command:** command input, output, errors, command history.
-   **Help:** searchable reference derived from the actual command
    registry, including usage, aliases, scope, and shortcuts where
    available.
-   **Logs:** recent system messages, command outcomes, warnings, and
    errors.

The first Terminal release should establish the window and view model;
it should not require a large new command catalog.

### 5.3 Command architecture

-   Menu items, keyboard shortcuts, command palette actions, and
    Terminal commands should call the same registered command
    definitions/dispatcher where applicable.
-   A command definition should state its name/aliases, description,
    arguments, scope, permission requirements, confirmation policy,
    execution function, and result reporting.
-   Unknown commands should return a clear error and usage/help
    guidance.
-   Report a request as sent when the client cannot verify server
    completion; do not claim success without evidence.
-   Help and shortcut hints should be derived from registered behavior
    where feasible so documentation does not drift.

### 5.4 Shell-like language

Potential future features: command history, aliases, completion, saved
snippets, variables, and limited composition. These are not part of the
initial window release.

Do not claim Bash compatibility. Do not run arbitrary host commands. Do
not evaluate arbitrary JavaScript in the normal Terminal. Any future
scripting language should be deliberately specified and limited to
registered CyTube OS APIs.

### 5.5 Chat and private messages

Potential future capabilities, subject to source verification and
explicit design:

-   Send public chat messages through a verified CyTube path.
-   Send PMs through a verified PM path.
-   Show public chat events in an opt-in or clearly configured view.
-   Keep PM content out of ordinary logs and diagnostic exports by
    default.

Do not implement these merely because they are conceptually possible;
verify actual callbacks, APIs, message limits, and error behavior first.

### 5.6 Diagnostics and safe customization

-   Prefer read-only diagnostics and explicit settings APIs.
-   A controlled appearance command may change only supported OS
    settings.
-   Do not treat a JavaScript `eval` restriction or a UI prompt as a
    sandbox.
-   Do not execute arbitrary JS/CSS in the normal Terminal.
-   If developer evaluation is ever needed, design it as a separate
    capability with an explicit threat model.

### 5.7 Deterministic local state

A future state model may represent window positions, sizes, z-order,
active window, visibility, snap state, and selected layout as explicit
state. Explicit state can make local layouts easier to save, restore,
replay, and test.

This does not guarantee deterministic media playback, chat/network
responses, server permissions, or other external behavior. Treat
reproducible local desktop state as a future goal, not a promise of
full-session determinism.

### 5.8 Appearance modes

Potential later options:

-   Adjustable transparency with minimum text contrast.
-   Compact Terminal presentation using the same Terminal instance.
-   Desktop layout profiles.
-   Responsive mobile presentation.

Defer these until the normal window model is stable.

## 6. Implementation phases

### Phase A --- Source audit and baseline

-   Start from the exact v0.4.7 source.
-   Inspect window creation, bounds calculation, z-index, move/resize
    handlers, close/minimize/maximize controls, snapping, layout
    presets, icon containers, and Help/Console/Terminal surfaces.
-   Write down current behavior before changing it.
-   Keep a copy of the baseline and identify the exact code sections to
    change.

**Exit criteria:** The source audit identifies why the right-side icon
region constrains windows and maps each existing window control to its
current behavior. No assumptions are presented as verified facts.

### Phase B --- Window/icon relationship

-   Remove icon-column reservation from window bounds.
-   Establish and test the intended stacking order.
-   Ensure windows can cover icons and icons remain usable where
    exposed.
-   Preserve menu-bar clearance and viewport constraints.

**Exit criteria:** A window can be dragged over the right-side icon
area; it stays beneath the menu bar; clicking an exposed icon still
works; existing CyTube media continues without an unintended reload.

### Phase C --- Consistent window controls

-   Verify and standardize close, minimize, maximize/restore, manual
    resize, move, and focus.
-   Make minimize distinct from manual resizing.
-   Ensure reopen/restore behavior is discoverable.
-   Add/repair half-screen and four-corner snapping.
-   Align fixed Layout presets with the same geometry model.

**Exit criteria:** Each control passes its test on desktop; basic
controls remain usable on mobile; snap and maximize share the same
usable bounds; restore returns to prior geometry where specified.

### Phase D --- Terminal window unification

-   Inspect existing Terminal, Help, and Console source before
    consolidating anything.
-   Define one Terminal window instance with Command, Help, and Logs
    views.
-   Make all Terminal entry points focus that same instance.
-   Use the standard window behavior from Phases B/C.

**Exit criteria:** Opening Terminal from the icon and menu does not
create duplicate windows; all three views are reachable; Terminal moves,
resizes, minimizes, maximizes, snaps, and closes like other windows.

### Phase E --- Shared command registry

-   Inventory existing commands and actions.
-   Route applicable menu, shortcut, palette, and Terminal actions
    through the same registry/dispatcher.
-   Generate Help from the registry where possible.
-   Preserve permission checks, confirmation flows, and honest result
    reporting.

**Exit criteria:** A selected action has the same result regardless of
entry point; unknown commands fail clearly; no new command is described
as working until tested.

### Phase F --- Later enhancements

Only after the above phases pass:

-   Optional icon movement and Arrange Icons.
-   Saved layouts and deterministic local-state replay.
-   Terminal command history/completion/snippets.
-   Carefully scoped chat/PM integration.
-   Transparency and compact mode.
-   Controlled diagnostics and appearance commands.

## 7. Regression test matrix

Run the relevant tests on both a desktop browser and a mobile browser.
Record actual results; do not mark a test passed merely because code or
syntax checks pass.

### Window behavior

-   [ ] Drag each supported window by its title bar.
-   [ ] Drag/resize from supported corners and edges.
-   [ ] Move a window across and over the right-side icon area.
-   [ ] Confirm the menu bar remains usable and windows do not become
    unreachable.
-   [ ] Close a window and verify documented reopen/state behavior.
-   [ ] Minimize and restore; confirm state is preserved.
-   [ ] Maximize and restore; confirm prior bounds are restored.
-   [ ] Snap left/right and all four corners.
-   [ ] Apply every Layout preset and then manually resize a window.
-   [ ] Resize/rotate the viewport and confirm windows remain usable.
-   [ ] Confirm media playback does not unexpectedly reload or reset.

### Icon behavior

-   [ ] Click/tap each visible desktop icon.
-   [ ] Confirm icons can be covered by windows.
-   [ ] Confirm an exposed icon remains clickable.
-   [ ] If icon movement is later added, test it independently from
    window dragging on mouse and touch.

### Terminal integration

-   [ ] Open Terminal from its desktop icon and menu entry; confirm one
    instance.
-   [ ] Switch between Command, Help, and Logs.
-   [ ] Move, resize, minimize, maximize, close, and snap Terminal.
-   [ ] Confirm Help describes only implemented commands.
-   [ ] Confirm command results distinguish request-sent from
    server-confirmed outcomes.
-   [ ] Confirm unknown commands produce clear errors.
-   [ ] Confirm private content is not included in ordinary logs/exports
    by default if PM support is added.

### Existing behavior

-   [ ] F10 focuses the menu bar.
-   [ ] Dropdown menu mouse and keyboard navigation still work.
-   [ ] `Ctrl+K` command palette still opens.
-   [ ] Existing `add` and `del` workflows still work, including
    confirmation and permission handling.
-   [ ] Desk-mode `L` layout cycling still works.
-   [ ] Tooltips and focus indicators remain usable.

## 8. Verification and release discipline

For every version:

1.  Identify the exact base file and version.
2.  Make one coherent change set.
3.  Run JavaScript syntax validation.
4.  Run focused source/behavior tests where feasible.
5.  Inspect the diff for accidental unrelated changes.
6.  Package the complete script and a ZIP backup.
7.  State clearly what was tested automatically and what still requires
    live CyTube testing.
8.  Do not claim GitHub publication unless the file was actually
    committed/uploaded and the URL verified.
9.  Provide the intended jsDelivr URL, explicitly conditional on the
    file being present on the named branch.
10. Keep the previous known-working version available for rollback.

## 9. Decisions currently agreed

-   Window/icon behavior comes before adding more commands.
-   v0.4.7 is the reported working baseline.
-   v0.4.8 was not adopted and is not the default base.
-   Windows should overlap icons; the icon column must not reserve
    window space.
-   Close, minimize, maximize/restore, and resize have distinct
    semantics.
-   Half-screen and four-corner snapping are desired.
-   Terminal should ultimately be a normal window with Command, Help,
    and Logs views.
-   Terminal should use a shared command architecture, not a second
    implementation path.
-   Normal Terminal should not evaluate arbitrary JavaScript or pretend
    to be full Bash.
-   Mobile usability and preservation of existing CyTube behavior are
    required.

## 10. Open questions to resolve during source audit

-   What exact current behavior does each window control implement?
-   Which windows are native OS-managed surfaces versus wrappers around
    existing CyTube DOM elements?
-   How are z-index and focus currently tracked?
-   Does minimizing preserve all relevant state today?
-   Which current layout presets exist, and which should remain?
-   Are Help and Console independent windows, views, or partial aliases
    in the actual v0.4.7 source?
-   Which existing command definitions can be reused directly by
    Terminal?
-   Which browser/mobile constraints require alternate snap or title-bar
    behavior?

These questions should be answered from the source and live testing, not
guessed.
