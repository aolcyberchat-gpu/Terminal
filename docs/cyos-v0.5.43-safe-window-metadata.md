# CyOS v0.5.43 — safe rendering for registered windows

## Change
Hardened the dynamic window-registration UI against HTML injection and selector breakage from plugin-supplied window metadata.

- Titlebars now construct controls with DOM APIs and assign the window title through `textContent`.
- Desktop icons now construct their glyph and label as text nodes rather than interpolating metadata into `innerHTML`.
- Desktop/mobile icon duplicate checks compare `dataset.w` values instead of building CSS selectors from the registered ID.
- Window-menu labels, action names, arguments, shortcuts, IDs, and ARIA labels are HTML-escaped before insertion into menu markup.
- Menu lookup compares the `aria-controls` value against dropdown element IDs rather than interpolating it into a CSS selector.

## Why
`CyOS.registerWindow()` is a public plugin API. Its `title` and `icon` values previously flowed into `innerHTML` in titlebars and desktop icons; custom window IDs and labels also flowed into generated menu markup and selector strings. This could create unintended markup or break UI when metadata contained quotes or HTML characters.

## Verification
- Source-based: dynamic titlebar and desktop-icon metadata no longer enters `innerHTML`.
- Source-based: menu-generated dynamic fields are escaped.
- Source-based: desktop/mobile icon checks and menu lookup no longer interpolate custom IDs into CSS selectors.
- Runtime: not yet tested. Register a window with a title such as `Test <Window> "One"` and icon text such as `<>`; verify they display literally, its icon opens/focuses it, and its Window menu opens normally.
