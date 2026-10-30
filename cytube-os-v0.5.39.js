/* ============================================================
   CyTube OS - v0.5.39
   Retro grayscale desktop + keyboard-first window manager.
   Skins CyTube's own chat / video / playlist elements (nothing is
   rebuilt, so emotes, formatting and slash commands keep working).
   Install: Channel Settings > Edit > JavaScript.
   Escape hatch: add ?plain=1 to the channel URL for the normal page.

   v0.5.4: public registration API (window.CyOS)
   v0.5.5: Terminal window + declarative confirm option
   v0.5.6: Terminal-native y/n confirms; shell commands
   v0.5.7: Full command pack
   v0.5.8: Integration pass
   v0.5.9: Global window transparency
   v0.5.10: Per-window alpha
   v0.5.11: Alpha 0–100%; Chat buffer/chatline/userlist honor window --win-a
   v0.5.12: Fail-closed permissions for every command; lock/unlock/unban/move-to-top use real server
            events; settemp permission key; Terminal no longer double-echoes; Playlist fill restored;
            `alpha list <value>` now addresses the Playlist window (bare `alpha list` still lists)
   v0.5.13: Window id list→playlist (removes list/playlist collision); alpha listing is bare `alpha`
            only; list/pl remain command aliases that toggle the playlist window; saved-state migration
   v0.5.14: Align room cmds with CyTube perms; declarative confirm for destructive/mod actions
            (del/shuffle/clearpl/kick/ban/unban/reload); voteskip+pollvote keys; drop redundant
            in-handler permission checks
   v0.5.15: Native CyTube mod parity — mute/smute/unmute, chat clear, kickanons, ipban,
            clean/cleantitle (fail-closed perms + confirm on destructive/people-affecting)
   v0.5.16: Remaining native parity — sp, shout/rcv, hpoll, rank, drink (/d); richer poll opts
   v0.5.17: Site-admin /a flair command (global rank ≥ 255 only)
   v0.5.18: Site-admin-only siterank (set channel rank; CLIENT.rank ≥ 255)
   v0.5.19: VIBE density — status line (mode/focus/lock/hints) + Terminal status strip
   v0.5.20: Menu bar shows registered windows (focus|open); always-on-top; richer Chat menu
   v0.5.21: Fixes — /clear and /say typed in chat go to CyTube natively (no longer hijacked by local
            clear/say); registerWindow keeps saved open/closed state across reloads; window menus no
            longer overlap on narrow screens; registered windows get a mobile tab; stray "[object
            HTMLDivElement]" text removed from the menu root
   v0.5.35: Focused native buttons are excluded from CyOS desk shortcuts so Enter/Space can activate them.
   v0.5.36: Window lifecycle is independent of layout; launchers persist in theater; focus follows windows.
   v0.5.37: Theater and PiP layout no longer force-close the Playlist window.
   v0.5.38: Returning from Theater/PiP restores geometry only, not stale window lifecycle state.
   v0.5.39: Deferred Terminal focus is cancelled if the window was closed, minimized, or focus moved.
   ============================================================ */
(() => {
  "use strict";

  const VERSION = "0.5.39";
  if (window.__cyos || /[?&]plain\b/.test(location.search)) return;
  window.__cyos = true;

  const MB = 24, TB = 20, ICON = 84, TAB = 38, G = 10;
  const KEY = "cyos:v1:" + location.pathname;
  let DEFS = [
    ["chat", "Chat", "#chatwrap", "\u25A4"],
    ["video", "Video", "#videowrap", "\u25B6"],
    ["playlist", "Playlist", "#playlistrow", "\u2630"],
    ["console", "Console", "#cyos-console", "\u25A3"],
    ["terminal", "Terminal", "#cyos-terminal", ">"],
    ["help", "Help", "#cyos-help", "?"]
  ];
  const defId = (d) => Array.isArray(d) ? d[0] : d.id;
  const defTitle = (d) => Array.isArray(d) ? d[1] : (d.title || d.id);
  const defIcon = (d) => Array.isArray(d) ? (d[3] || "") : (d.icon || "\u25A1");
  const winNames = () => DEFS.map(defId).join(", ");
  const WIN = {};
  const S = {
    mode: "split", theme: "mac", alphas: {}, rects: {}, open: { chat: true, video: true, playlist: true, console: false, terminal: false, help: false },
    sysmsg: true, pending: null, pendingT: 0, min: {}, top: {},
    menuWins: "focus",
    saved: null, z: 10, focus: "chat", desk: false, move: false,
    tab: "chat", sel: -1, users: false, nav: false
  };
  const ui = {};
  const pal = { el: null, input: null, hint: null, hist: [], hi: 0, on: false };
  const term = { hist: [], hi: 0, mirror: true };
  const ALIASES = Object.create(null);
  const NATIVE_SLASH = new Set(["clear", "say"]);
  let termQuiet = false;
  let countdownTimer = null;
  let noteTimer = 0;
  let termRunDepth = 0;

  const q = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mobile = () => innerWidth < 760;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const safe = (fn, d) => { try { return fn(); } catch (_) { return d; } };

  const load = () => safe(() => JSON.parse(localStorage.getItem(KEY) || "null"), null);
  const save = () => safe(() => localStorage.setItem(KEY, JSON.stringify({
    mode: S.mode, theme: S.theme, alphas: S.alphas, rects: S.rects, open: S.open, min: S.min, sysmsg: S.sysmsg,
    top: S.top, menuWins: S.menuWins
  })));

  /* ---------- styles ---------- */
  const CSS = `
html,body{height:100%!important;overflow:hidden!important}
body.cyos{--bg:#fff;--fg:#000;--d1:#c4c4c4;--d2:#9c9c9c;margin:0!important;padding:0!important;
  color:var(--fg);font:13px/1.4 Monaco,Menlo,Consolas,"Courier New",monospace;
  background:conic-gradient(var(--d1) 25%,var(--d2) 0 50%,var(--d1) 0 75%,var(--d2) 0) 0 0/4px 4px!important}
body.cyos.cyos-term{--bg:#0b0b0b;--fg:#e9e9e9;--d1:#1a1a1a;--d2:#0f0f0f}
body.cyos .cyos-hide,body.cyos footer,body.cyos nav.navbar{display:none!important}
body.cyos.cyos-nav nav.navbar{display:block!important;position:fixed!important;top:${MB}px;left:0;right:0;z-index:2147482000}
body.cyos .cyos-path{position:static!important;display:block!important;transform:none!important;overflow:visible!important;
  width:auto!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;
  background:none!important;float:none!important;box-shadow:none!important}

body.cyos .cyos-win{--win-a:1;position:fixed!important;display:flex!important;flex-direction:column;box-sizing:border-box!important;
  margin:0!important;padding:0!important;max-width:none!important;max-height:none!important;min-width:0!important;float:none!important;
  overflow:hidden!important;border:2px solid var(--fg)!important;border-radius:0!important;
  background:color-mix(in srgb,var(--bg) calc(var(--win-a)*100%),transparent)!important;color:var(--fg)!important;box-shadow:3px 3px 0 var(--fg)!important}
body.cyos .cyos-win.cyos-glass{backdrop-filter:blur(2px)}
body.cyos .cyos-win>.cyos-bar{background:color-mix(in srgb,var(--bg) calc(var(--win-a)*100%),transparent)!important}
body.cyos .cyos-win.cyos-pin{z-index:100000!important}
body.cyos.cyos-drag iframe{pointer-events:none!important}
body.cyos.cyos-drag{cursor:grabbing}

.cyos-bar{flex:0 0 ${TB}px;height:${TB}px;box-sizing:border-box;display:flex;align-items:center;gap:6px;padding:0 5px;
  background:var(--bg);color:var(--fg);border-bottom:2px solid var(--fg);position:relative;z-index:6;
  font:700 12px/1 Geneva,"Helvetica Neue",Arial,sans-serif;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none}
.cyos-bar i{flex:1;height:10px;background:repeating-linear-gradient(var(--fg) 0 1px,transparent 1px 3px);opacity:.4}
.cyos-focus>.cyos-bar i{opacity:1}
.cyos-box{all:unset;width:11px;height:11px;border:2px solid var(--fg);background:var(--bg);cursor:pointer;flex:none;box-sizing:content-box}
.cyos-box:hover{background:var(--fg)}
.cyos-box[data-a="min"]{background-image:linear-gradient(var(--fg),var(--fg));background-size:7px 2px;background-repeat:no-repeat;background-position:center}
.cyos-box[data-a="min"]:hover{background-image:linear-gradient(var(--bg),var(--bg))}
.cyos-box[data-a="zoom"]{box-shadow:inset 0 0 0 2px var(--bg),inset 0 0 0 4px var(--fg)}
.cyos-box[data-a="zoom"]:hover{box-shadow:inset 0 0 0 2px var(--fg),inset 0 0 0 4px var(--bg)}
.cyos-dock{position:absolute;left:8px;bottom:8px;display:flex;gap:6px;flex-wrap:wrap;max-width:60vw}
.cyos-dock:empty{display:none}
.cyos-chip{all:unset;cursor:pointer;padding:3px 10px;font-weight:700;background:var(--bg);color:var(--fg);border:2px solid var(--fg);box-shadow:2px 2px 0 var(--fg)}
.cyos-chip:hover,.cyos-chip:focus-visible{background:var(--fg);color:var(--bg)}
body.cyos-desk .cyos-focus>.cyos-bar{background:var(--fg);color:var(--bg)}
body.cyos .cyos-ontop>.cyos-bar span::after{content:" ↑";opacity:.7}
body.cyos-desk .cyos-focus>.cyos-bar i{background:repeating-linear-gradient(var(--bg) 0 1px,transparent 1px 3px)}
body.cyos-desk .cyos-focus>.cyos-bar .cyos-box{border-color:var(--bg)}
.cyos-grow{position:absolute;right:0;bottom:0;width:14px;height:14px;z-index:7;cursor:nwse-resize;touch-action:none;
  background:linear-gradient(135deg,transparent 50%,var(--fg) 50% 56%,transparent 56% 70%,var(--fg) 70% 76%,transparent 76%)}

/* chat — fill uses the Chat window's --win-a so glass applies to buffer/line/userlist, not only the title bar */
body.cyos #chatwrap{background:transparent!important}
body.cyos #chatwrap #chatheader{display:none!important}
body.cyos #chatwrap #userlist{display:none!important}
body.cyos.cyos-users #chatwrap #userlist{display:block!important;flex:0 0 auto;float:none!important;width:auto!important;
  max-height:28%;overflow:auto;border-bottom:2px solid var(--fg);color:var(--fg)!important;
  background:color-mix(in srgb,var(--bg) calc(var(--win-a,1)*100%),transparent)!important}
body.cyos #chatwrap #messagebuffer{flex:1 1 auto!important;height:auto!important;min-height:0!important;width:auto!important;float:none!important;
  overflow-y:auto!important;margin:0!important;border:0!important;padding:6px 8px!important;font:inherit!important;
  color:var(--fg)!important;
  background:color-mix(in srgb,var(--bg) calc(var(--win-a,1)*100%),transparent)!important}
body.cyos #chatwrap #messagebuffer *{color:inherit!important;background:transparent!important;text-shadow:none!important}
body.cyos #chatwrap #messagebuffer .username{font-weight:700}
body.cyos #chatwrap #messagebuffer .timestamp{opacity:.6}
body.cyos #chatwrap #messagebuffer a{text-decoration:underline}
body.cyos #chatwrap #chatline{flex:0 0 auto;width:100%!important;height:auto!important;margin:0!important;border:0!important;
  border-top:2px solid var(--fg)!important;border-radius:0!important;box-shadow:none!important;padding:7px 8px!important;
  font:inherit!important;color:var(--fg)!important;
  background:color-mix(in srgb,var(--bg) calc(var(--win-a,1)*100%),transparent)!important}
body.cyos.cyos-theater #chatwrap,body.cyos.cyos-theater #chatwrap #messagebuffer,body.cyos.cyos-theater #chatwrap #chatline{
  background:color-mix(in srgb,var(--bg) calc(var(--win-a,1)*76%),transparent)!important}

/* video */
body.cyos #videowrap{background:#000!important}
/* CyTube's video header (now-playing text plus the +/- size buttons) is hidden: the title lives in the
   playlist and the window resizes by drag, snap or keys. The elements stay in the DOM so CyTube's own code still works. */
body.cyos #videowrap #videowrap-header{display:none!important}
body.cyos #videowrap .embed-responsive{flex:1 1 auto;height:auto!important;min-height:0;padding:0!important;position:relative}
body.cyos #videowrap #ytapiplayer,body.cyos #videowrap .embed-responsive-item,
body.cyos #videowrap iframe,body.cyos #videowrap video{width:100%!important;height:100%!important}

/* playlist: same content language as the other windows (8px side padding, 2px rules, dotted list rows,
   inverted = now playing). Buttons keep their own light face so a label can never match its background. */
.cyos-body{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;padding-bottom:14px;
  background:transparent!important}
body.cyos #playlistrow .col-lg-5,body.cyos #playlistrow .col-md-5,body.cyos #playlistrow [class*="col-"]{
  background:transparent!important}
.cyos-body>*{float:none!important;width:auto!important;margin:0!important;display:block!important}
.cyos-body .row{margin:0!important}
.cyos-body [class*="col-"]{float:none!important;width:auto!important;padding:0!important}
.cyos-body #rightpane{order:1}
.cyos-body #leftpane{order:2;border-top:2px solid var(--fg);padding:6px 8px!important}
.cyos-body #leftpane:not(:has(#pollwrap *,#playlistmanagerwrap *)){display:none!important}
body.cyos #queue{max-height:none!important;height:auto!important;margin:0!important;padding:0!important;list-style:none;
  background:transparent!important;border:0!important}
body.cyos #queue>li{background:transparent!important;color:var(--fg)!important;border:0!important;border-radius:0!important;
  border-bottom:1px dotted var(--fg)!important;padding:4px 8px!important;margin:0!important}
body.cyos #queue>li *{color:inherit!important;text-shadow:none!important}
body.cyos #queue>li.queue_active{background:var(--fg)!important;color:var(--bg)!important}
body.cyos #queue>li.cyos-sel{outline:2px solid var(--fg);outline-offset:-3px}
body.cyos #queue>li.queue_active.cyos-sel{outline-color:var(--bg)}
body.cyos #queue .btn-group{display:flex!important;flex-wrap:wrap;gap:4px;float:none!important;margin:4px 0 2px!important}
body.cyos #queue .btn-group .btn{border-radius:0!important;border:2px solid var(--fg)!important;background:var(--bg)!important;
  color:var(--fg)!important;box-shadow:none!important;text-shadow:none!important;margin:0!important;padding:1px 8px!important;opacity:1!important;
  font:12px/1.4 Monaco,Menlo,Consolas,"Courier New",monospace!important}
body.cyos #queue>li.queue_active .btn-group .btn{border-color:var(--bg)!important}
body.cyos #queue .btn-group .btn .glyphicon{color:inherit!important;margin-right:6px;top:1px}
body.cyos #queue .btn-group .btn:hover,body.cyos #queue .btn-group .btn:focus-visible{background:var(--fg)!important;color:var(--bg)!important}
body.cyos #queue>li.queue_active .btn-group .btn:hover,body.cyos #queue>li.queue_active .btn-group .btn:focus-visible{border-color:var(--bg)!important}
body.cyos #plmeta{display:flex!important;justify-content:space-between;align-items:center;margin:0!important;padding:4px 8px!important;border:0!important;
  border-top:2px solid var(--fg)!important;border-radius:0!important;background:transparent!important;color:var(--fg)!important;box-shadow:none!important;
  font:12px/1.4 Monaco,Menlo,Consolas,"Courier New",monospace}
body.cyos #plmeta #pllength{float:none!important}
.cyos-body input,.cyos-body button,.cyos-body select{border-radius:0!important;border:2px solid var(--fg)!important;
  background:var(--bg)!important;color:var(--fg)!important;box-shadow:none!important}

/* desktop chrome */
#cyos-root{position:fixed;inset:0;pointer-events:none;z-index:2147483000;color:var(--fg);font:12px/1.2 Geneva,"Helvetica Neue",Arial,sans-serif}
#cyos-root>*{pointer-events:auto}
#cyos-desktop{position:fixed;inset:0;pointer-events:none;z-index:1;color:var(--fg);font:12px/1.2 Geneva,"Helvetica Neue",Arial,sans-serif}
#cyos-desktop>*{pointer-events:auto}
.cyos-menu{position:absolute;top:0;left:0;right:0;height:${MB}px;box-sizing:border-box;display:flex;align-items:center;gap:6px;
  padding:0 8px;background:var(--bg);border-bottom:2px solid var(--fg);font-weight:700;white-space:nowrap;overflow:visible}
.cyos-winmenus{display:flex;align-items:center;gap:0;height:100%;flex:0 0 auto}
.cyos-menu button{all:unset;cursor:pointer;padding:3px 7px;font-weight:700}
.cyos-menu .cyos-menugroup{position:relative;display:flex;align-items:center;height:100%}
.cyos-menu button[data-menu].on,.cyos-menu button[data-menu][aria-expanded="true"]{background:var(--fg);color:var(--bg)}
.cyos-dropdown{position:absolute;top:100%;left:0;display:none;min-width:178px;max-width:min(280px,90vw);padding:4px 0;background:var(--bg);color:var(--fg);border:2px solid var(--fg);box-shadow:3px 3px 0 var(--fg);z-index:20;font-weight:400;white-space:normal}
.cyos-dropdown.on{display:block}
.cyos-dropdown button{all:unset;box-sizing:border-box;display:flex;width:100%;align-items:center;justify-content:space-between;gap:16px;padding:6px 10px;cursor:pointer;font-weight:400;white-space:nowrap}
.cyos-dropdown button:hover,.cyos-dropdown button:focus-visible{background:var(--fg);color:var(--bg);outline:2px solid var(--fg);outline-offset:-2px}
.cyos-dropdown button:focus-visible{box-shadow:inset 0 0 0 2px var(--bg)}
.cyos-dropdown .cyos-separator{height:1px;background:var(--fg);margin:4px 0;opacity:.5}
.cyos-dropdown kbd{font:10px/1 Monaco,Menlo,Consolas,monospace;border:1px solid currentColor;padding:2px 3px}
.cyos-menu button:hover,.cyos-menu button:focus-visible{background:var(--fg);color:var(--bg)}
.cyos-menu button:focus-visible,.cyos-ico:focus-visible,.cyos-tabs button:focus-visible{outline:3px solid var(--fg);outline-offset:2px;box-shadow:0 0 0 2px var(--bg)}
.cyos-menu button:focus-visible{outline-color:var(--fg)}
.cyos-menu u{text-underline-offset:2px;text-decoration-thickness:2px}
.cyos-menu kbd{font:10px/1 Monaco,Menlo,Consolas,monospace;border:1px solid currentColor;padding:1px 3px;margin-left:2px;opacity:.8}
.cyos-note{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;font-weight:400;padding-left:10px}
.cyos-note.err{text-decoration:underline}
.cyos-flag{border:2px solid var(--fg);padding:1px 8px;font:11px/1.2 Monaco,Menlo,Consolas,monospace;max-width:52vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:0}
body.cyos-desk .cyos-flag{background:var(--fg);color:var(--bg)}
.cyos-flag b{font-weight:700}
#cyos-terminal .cyos-term-status{flex:0 0 auto;padding:2px 8px;border-bottom:2px solid var(--fg);font:11px/1.3 Monaco,Menlo,Consolas,monospace;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cyos-terminal .cyos-term-status b{font-weight:700}
.cyos-icons{position:absolute;top:${MB + 14}px;right:10px;width:64px;display:flex;flex-direction:column;gap:14px}
.cyos-ico{all:unset;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-weight:700;font-size:11px;text-align:center}
.cyos-ico b{width:40px;height:34px;display:grid;place-items:center;background:var(--bg);color:var(--fg);
  border:2px solid var(--fg);box-shadow:2px 2px 0 var(--fg);font-size:18px}
.cyos-ico span{background:var(--bg);padding:0 3px}
.cyos-ico:hover b,.cyos-ico:focus-visible b{background:var(--fg);color:var(--bg)}
.cyos-tabs{position:absolute;left:0;right:0;bottom:0;height:${TAB}px;display:none;background:var(--bg);border-top:2px solid var(--fg)}
.cyos-tabs button{all:unset;flex:1;display:grid;place-items:center;font-weight:700;cursor:pointer}
.cyos-tabs button+button{border-left:2px solid var(--fg)}
.cyos-tabs button.on{background:var(--fg);color:var(--bg)}
.cyos-pal{position:absolute;left:50%;top:14%;transform:translateX(-50%);width:min(580px,94vw);display:none;
  background:var(--bg);border:2px solid var(--fg);box-shadow:4px 4px 0 var(--fg)}
.cyos-pal.on{display:block}
.cyos-pal input{all:unset;display:block;box-sizing:border-box;width:100%;padding:9px 10px;font:14px/1.2 Monaco,Menlo,Consolas,monospace;
  border-bottom:2px solid var(--fg);color:var(--fg)}
.cyos-hint{margin:0;padding:8px 10px;white-space:pre-wrap;font:12px/1.5 Monaco,Menlo,Consolas,monospace;max-height:50vh;overflow:auto}

.cyos-confirm{display:none;align-items:center;gap:6px;flex:1;min-width:0;font-weight:400}
.cyos-confirm.on{display:flex}
.cyos-confirm>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.cyos-confirm button{border:2px solid var(--fg)!important;padding:0 8px!important}
#cyos-console .cyos-log{flex:1 1 auto;min-height:0;overflow:auto;padding:6px 8px;font:12px/1.5 Monaco,Menlo,Consolas,monospace;
  white-space:pre-wrap;overflow-wrap:anywhere;background:transparent!important}
.cyos-l.echo{font-weight:700}
.cyos-l.err{text-decoration:underline}
.cyos-l.ask{background:var(--fg);color:var(--bg)}
.cyos-l.ok{opacity:.85}
body.cyos #chatwrap #messagebuffer .cyos-sys{font-style:italic;opacity:.8;border-left:2px dotted var(--fg);padding-left:6px;margin:2px 0}
.cyos-menu .mo{display:none!important}
#cyos-help .cyos-helptext{flex:1 1 auto;min-height:0;margin:0;padding:8px 10px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;
  font:12px/1.5 Monaco,Menlo,Consolas,monospace;background:transparent!important;color:var(--fg)!important;border:0!important;border-radius:0!important}
.cyos-synthetic{display:flex;flex-direction:column}
.cyos-synthetic .cyos-body{flex:1 1 auto;min-height:0;overflow:auto;padding:8px 10px}
#cyos-terminal{display:flex;flex-direction:column}
#cyos-terminal .cyos-term-log{flex:1 1 auto;min-height:0;overflow:auto;padding:6px 8px;font:12px/1.5 Monaco,Menlo,Consolas,monospace;
  white-space:pre-wrap;overflow-wrap:anywhere}
#cyos-terminal .cyos-term-line{flex:0 0 auto;display:flex;align-items:center;gap:6px;padding:4px 8px;border-top:2px solid var(--fg);
  font:12px/1.4 Monaco,Menlo,Consolas,monospace}
#cyos-terminal .cyos-term-ps{flex:none;font-weight:700;user-select:none}
#cyos-terminal .cyos-term-input{flex:1 1 auto;min-width:0;border:0!important;outline:none!important;background:transparent!important;
  color:var(--fg)!important;font:inherit!important;padding:0!important;margin:0!important;box-shadow:none!important}
#cyos-terminal .cyos-term-l{margin:0 0 2px}
#cyos-terminal .cyos-term-l.echo{font-weight:700}
#cyos-terminal .cyos-term-l.err{text-decoration:underline}
#cyos-terminal .cyos-term-l.sys{opacity:.75;font-style:italic}


@media (max-width:759px){
  body.cyos .cyos-win>.cyos-bar,body.cyos .cyos-grow,body.cyos .cyos-icons,.cyos-menu .nm,.cyos-dock{display:none!important}
  .cyos-menu .mo{display:inline-block!important}
  .cyos-menu{gap:2px;padding:0 4px;overflow-x:auto;overflow-y:visible}
  .cyos-dropdown{position:fixed;top:${MB}px;left:4px;max-height:65vh;overflow:auto}
  body.cyos .cyos-win{border-width:0 0 2px!important;box-shadow:none!important}
  .cyos-tabs{display:flex}
  body.cyos #chatwrap #chatline{font-size:16px!important}
  body.cyos #queue .btn-group .btn{padding:6px 12px!important;font-size:13px!important}
}
`;

  /* ---------- notes, chat, socket helpers ---------- */
  function log(kind, text) {
    if (ui.log) {
      const d = document.createElement("div");
      d.className = "cyos-l " + kind;
      d.textContent = text;
      ui.log.appendChild(d);
      while (ui.log.childNodes.length > 300) ui.log.removeChild(ui.log.firstChild);
      ui.log.scrollTop = ui.log.scrollHeight;
    }
    // Mirror into Terminal when a command was launched from there, or always for asks
    if (ui.termLog && ((termRunDepth > 0 && kind !== "echo") || kind === "ask")) termWrite(kind, text);
  }

  function termWrite(kind, text) {
    if (!ui.termLog) return;
    const d = document.createElement("div");
    d.className = "cyos-term-l " + (kind || "ok");
    d.textContent = text;
    ui.termLog.appendChild(d);
    while (ui.termLog.childNodes.length > 400) ui.termLog.removeChild(ui.termLog.firstChild);
    ui.termLog.scrollTop = ui.termLog.scrollHeight;
  }

  function termRun(line) {
    let t = String(line || "").trim();
    if (!t) return;
    // Expand leading alias (first token only)
    const sp = t.indexOf(" ");
    const head = (sp < 0 ? t : t.slice(0, sp)).toLowerCase();
    if (ALIASES[head]) {
      t = ALIASES[head] + (sp < 0 ? "" : t.slice(sp));
    }
    if (t === "!!") {
      if (!term.hist.length) return termWrite("err", "No history.");
      t = term.hist[term.hist.length - 1];
    }
    term.hist.push(t);
    if (term.hist.length > 80) term.hist.shift();
    term.hi = term.hist.length;
    termWrite("echo", "$ " + t);
    termRunDepth++;
    try { run(t); } finally { termRunDepth--; }
  }

  function termOut(kind, text) {
    if (termQuiet && kind !== "err" && kind !== "ask") return;
    if (termRunDepth > 0 || S.focus === "terminal" || (S.open.terminal && !S.min.terminal))
      termWrite(kind || "ok", text);
    else
      log(kind || "ok", text);
  }

  function activeRow() {
    return rows().find((x) => x.classList.contains("queue_active")) || null;
  }

  function rowMeta(row) {
    if (!row) return null;
    const title = titleOf(row);
    const timeEl = row.querySelector(".qe_time, .qe_duration, .queue_time");
    const time = timeEl ? timeEl.textContent.trim() : "";
    const temp = row.classList.contains("queue_temp");
    const uid = uidOf(row);
    return { title, time, temp, uid, row };
  }

  function listUsers() {
    const items = [...document.querySelectorAll("#userlist .userlist_item, #userlist .userlist_itemuser, .userlist_item")];
    if (items.length) {
      return items.map((el) => {
        const name = (el.querySelector(".userlist_name, .username, span") || el).textContent.replace(/\s+/g, " ").trim();
        return name;
      }).filter(Boolean);
    }
    // Fallback: userlist may be collapsed; try data on CLIENT
    const ul = (window.CHANNEL && CHANNEL.users) || (window.CLIENT && CLIENT.users) || null;
    if (ul && typeof ul === "object") {
      return Object.keys(ul).map((k) => (ul[k] && (ul[k].name || k)) || k);
    }
    return [];
  }

  // Destructive room commands ask first: y confirms, n or Esc cancels, 15s timeout cancels.
  // When the command was launched from Terminal, keep focus there and accept y/n in the prompt.
  function ask(text, yes) {
    clearTimeout(S.pendingT);
    const fromTerm = termRunDepth > 0 || S.focus === "terminal" ||
      (ui.termInput && document.activeElement === ui.termInput);
    S.pending = { text, yes, fromTerm: !!fromTerm };
    if (ui.confirm) {
      ui.confirm.firstChild.textContent = text + " (y/n)";
      ui.confirm.classList.add("on");
    }
    if (ui.note) ui.note.style.display = "none";
    log("ask", text + " (y/n)");
    if (fromTerm) {
      setTermPrompt("?");
      // log("ask") already mirrored the question into the Terminal
      termWrite("sys", "Confirm: press y / n / Esc, or type yes|no and Enter.");
      if (ui.termInput) {
        ui.termInput.value = "";
        setTimeout(() => { try { ui.termInput.focus({ preventScroll: true }); } catch (_) {} }, 0);
      }
    }
    S.pendingT = setTimeout(() => answer(false, true), 15000);
    statusLine();
  }

  function answer(ok, timedOut) {
    const p = S.pending;
    if (!p) return;
    S.pending = null;
    clearTimeout(S.pendingT);
    if (ui.confirm) ui.confirm.classList.remove("on");
    if (ui.note) ui.note.style.display = "";
    setTermPrompt("$");
    const msg = ok ? "Confirmed." : (timedOut ? "Timed out, cancelled." : "Cancelled.");
    if (p.fromTerm) termWrite(ok ? "ok" : "sys", msg);
    else log("ok", msg);
    if (ok) {
      try { p.yes(); } catch (err) { note(String(err && err.message || err), "err"); }
    }
    if (p.fromTerm && ui.termInput) {
      setTimeout(() => { try { ui.termInput.focus({ preventScroll: true }); } catch (_) {} }, 0);
    }
    statusLine();
  }

  function setTermPrompt(ch) {
    const ps = ui.termPs || (ui.termInput && ui.termInput.parentElement && ui.termInput.parentElement.querySelector(".cyos-term-ps"));
    if (ps) { ps.textContent = ch || "$"; ui.termPs = ps; }
  }

  function note(msg, kind) {
    const k = kind === "err" ? "err" : "ok";
    log(k, msg);
    // Keep Terminal as a full activity log when it is focused (post-confirm notes, etc.)
    if (ui.termLog && S.focus === "terminal" && termRunDepth === 0 && k !== "ask") {
      // Avoid double-print when log already mirrored via termRunDepth
      // log only mirrors when termRunDepth > 0 or kind === ask, so this is complementary
      termWrite(k, msg);
    }
    if (!ui.note) return;
    ui.note.textContent = msg;
    ui.note.className = "cyos-note" + (kind === "err" ? " err" : "");
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { ui.note.textContent = ""; }, 6000);
  }

  // Permission checks fail closed: unknown APIs, exceptions, and non-boolean
  // results must never be interpreted as permission granted.
  function permissionStatus(perm) {
    if (typeof hasPermission !== "function") return null;
    const result = safe(() => hasPermission(perm), null);
    return typeof result === "boolean" ? result : null;
  }


  function denyPermission(perm, action) {
    const status = permissionStatus(perm);
    if (status === true) return false;
    if (status === false) {
      note("Permission denied: " + action + ".", "err");
    } else {
      note("Cannot verify permission for " + action + "; blocked for safety.", "err");
    }
    return true;
  }

  function emit(ev, data) {
    if (typeof socket === "undefined" || !socket) {
      note("Not connected to the channel yet; request not sent.", "err");
      return false;
    }
    try {
      if (data === undefined) socket.emit(ev); else socket.emit(ev, data);
      return true;
    } catch (err) {
      note("Could not send channel request (" + ev + "): " + String(err && err.message || err), "err");
      return false;
    }
  }

  // Goes through CyTube's own chat handler so slash commands, history and rate limits behave normally.
  function sendChat(text) {
    const line = q("#chatline"), jq = window.jQuery;
    if (line && jq) {
      const draft = line.value;
      line.value = text;
      jq(line).trigger(jq.Event("keydown", { which: 13, keyCode: 13 }));
      line.value = draft;
    } else {
      emit("chatMsg", { msg: text, meta: {} });
    }
  }

  /* ---------- playlist helpers ---------- */
  const rows = () => [...document.querySelectorAll("#queue > li")];
  const uidOf = (row) => {
    const jq = window.jQuery;
    const v = jq ? safe(() => jq(row).data("uid")) : undefined;
    const raw = v !== undefined ? v : row.dataset.uid;
    return raw !== undefined && raw !== "" && !isNaN(Number(raw)) ? Number(raw) : raw;
  };

  function mark() {
    const r = rows();
    r.forEach((x, i) => x.classList.toggle("cyos-sel", i === S.sel));
    if (r[S.sel]) r[S.sel].scrollIntoView({ block: "nearest" });
  }

  function select(delta) {
    const r = rows();
    if (!r.length) return note("The playlist is empty.", "err");
    if (S.sel < 0) S.sel = Math.max(0, r.findIndex((x) => x.classList.contains("queue_active")));
    else S.sel = clamp(S.sel + delta, 0, r.length - 1);
    mark();
  }

  function addMedia(url, pos) {
    url = (url || "").trim().replace(/^<+|>+$/g, "");
    if (!url) return note("Usage: add <url>", "err");
    // Permission is enforced by the cmd() wrapper (playlistadd / playlistnext).
    const m = typeof parseMediaLink === "function" ? safe(() => parseMediaLink(url)) : null;
    if (!m || !m.id || !m.type) return note("That link isn't a supported media URL.", "err");
    if (emit("queue", { id: m.id, type: m.type, pos, temp: true })) {
      note("Add request sent (" + pos + "): " + m.type + ". Playlist confirmation pending.");
    }
  }

  const titleOf = (row) => ((row.querySelector(".qe_title") || row).textContent || "").replace(/\s+/g, " ").trim();
  const shorten = (t, n) => t.length > n ? t.slice(0, n - 1) + "\u2026" : t;

  // Targets: 3, ., $, +1, -1, 2-5, /text/  ->  array of zero-based row indexes
  function resolve(t) {
    const r = rows();
    if (!r.length) return [];
    const cur = r.findIndex((x) => x.classList.contains("queue_active"));
    t = String(t == null ? "" : t).trim();
    let out = [], m;
    if (t === ".") out = [cur];
    else if (t === "$") out = [r.length - 1];
    else if ((m = t.match(/^([+-])(\d+)$/))) out = [cur + (m[1] === "+" ? 1 : -1) * Number(m[2])];
    else if ((m = t.match(/^(\d+)$/))) out = [Number(m[1]) - 1];
    else if ((m = t.match(/^(\d+)-(\d+)$/))) {
      const lo = Math.min(Number(m[1]), Number(m[2])), hi = Math.max(Number(m[1]), Number(m[2]));
      for (let i = lo; i <= hi; i++) out.push(i - 1);
    } else if ((m = t.match(/^\/(.+)\/$/))) {
      const needle = m[1].toLowerCase();
      out = [r.findIndex((x) => titleOf(x).toLowerCase().includes(needle))];
    }
    return out.filter((i) => i >= 0 && i < r.length);
  }

  function jump(t) {
    if (denyPermission("playlistjump", "jumping to a playlist item")) return;
    const idx = resolve(t);
    if (!idx.length) return note('No playlist entry matches "' + String(t || "") + '".', "err");
    const row = rows()[idx[0]];
    if (emit("jumpTo", uidOf(row))) note("Jump request sent for #" + (idx[0] + 1) + ": " + shorten(titleOf(row), 50) + ". Playback confirmation pending.");
  }

  function del(t) {
    if (denyPermission("playlistdelete", "deleting playlist items")) return;
    const idx = resolve(t);
    if (!idx.length) return note('No playlist entry matches "' + String(t || "") + '".', "err");
    const list = rows(), uids = idx.map((i) => uidOf(list[i]));
    const label = idx.length === 1
      ? "Remove #" + (idx[0] + 1) + " " + shorten(titleOf(list[idx[0]]), 40) + "?"
      : "Remove " + idx.length + " entries (#" + (idx[0] + 1) + " to #" + (idx[idx.length - 1] + 1) + ")?";
    ask(label, () => {
      let n = 0;
      uids.forEach((u) => { if (emit("delete", u)) n++; });
      if (n) note("Delete request sent for " + n + (n === 1 ? " entry." : " entries.") + " Playlist confirmation pending.");
      else note("No delete requests were sent.", "err");
    });
  }

  // Local-only system line in your own chat when anyone queues something (nothing is sent to chat).
  function sysLine(text) {
    const buf = q("#messagebuffer");
    if (!buf) return;
    const near = buf.scrollHeight - buf.scrollTop - buf.clientHeight < 60;
    const d = document.createElement("div");
    d.className = "cyos-sys";
    d.textContent = text;
    buf.appendChild(d);
    if (near) buf.scrollTop = buf.scrollHeight;
  }

  let hooked = false;
  function hookSocket() {
    if (hooked) return true;
    if (typeof socket === "undefined" || !socket || !socket.on) return false;
    socket.on("queue", (d) => {
      if (!S.sysmsg || !d || !d.item) return;
      const it = d.item, title = (it.media && it.media.title) || "untitled";
      setTimeout(() => {
        const r = rows(), i = r.findIndex((x) => uidOf(x) === it.uid);
        const cur = r.findIndex((x) => x.classList.contains("queue_active"));
        const where = i < 0 ? "" : i === cur + 1 ? " (plays next, #" + (i + 1) + ")" : " (#" + (i + 1) + ")";
        sysLine("\u25CF " + (it.queueby || "someone") + " queued: " + title + where);
      }, 60);
    });
    socket.on("banlist", (entries) => { banlist = Array.isArray(entries) ? entries : []; if (banWaiter) banWaiter(); });
    socket.on("setPlaylistLocked", (locked) => note("Playlist is now " + (locked ? "locked" : "unlocked") + "."));
    hooked = true;
    return true;
  }

  /* ---------- window geometry ---------- */
  // Usable desktop = viewport minus the menu bar. Desktop icons are a layer under the
  // windows, not a reserved strip, so windows may cover them.
  function desk() {
    return { w: innerWidth, h: innerHeight - MB };
  }

  function keepIn(r) {
    const d = desk();
    r.w = Math.min(r.w, d.w);
    r.h = Math.min(r.h, d.h);
    r.x = clamp(r.x, 0, Math.max(0, d.w - r.w));
    r.y = clamp(r.y, MB, Math.max(MB, innerHeight - TB - 2));
  }

  function layout(m) {
    const W = innerWidth - ICON - 8, H = innerHeight - MB, R = S.rects;
    // Layout changes geometry only. Window open/minimized state belongs to the
    // window manager and must survive every layout transition unchanged.
    R.console = { x: G, y: MB + H - 200 - G, w: Math.min(620, W - 2 * G), h: 200 };
    R.terminal = { x: Math.max(G, W - 520 - G), y: MB + H - 280 - G, w: Math.min(520, W - 2 * G), h: 260 };
    R.help = { x: Math.max(G, Math.round((innerWidth - 560) / 2)), y: MB + 40, w: Math.min(560, innerWidth - 2 * G), h: Math.max(160, Math.min(540, H - 60)) };
    if (m === "theater") {
      const cw = clamp(Math.round(innerWidth * 0.34), 300, 460), ch = Math.round(H * 0.62);
      R.video = { x: 0, y: MB, w: innerWidth, h: H };
      R.chat = { x: innerWidth - cw - 12, y: MB + H - ch - 12, w: cw, h: ch };
      R.playlist = { x: G, y: MB + G, w: 360, h: 260 };
    } else if (m === "pip") {
      const w = clamp(Math.round(W * 0.28), 260, 380), h = Math.round(w * 9 / 16) + TB;
      R.chat = { x: G, y: MB + G, w: W - 2 * G, h: H - 2 * G };
      R.video = { x: W - w - G, y: MB + H - h - G, w, h };
      R.playlist = { x: G + 40, y: MB + G + 40, w: Math.min(420, W - 80), h: Math.min(360, H - 80) };
    } else {
      const vw = Math.round(clamp(W * 0.6, 320, Math.max(320, W - 300)));
      const vh = Math.round(vw * 9 / 16) + TB + 4;
      R.video = { x: G, y: MB + G, w: vw, h: vh };
      R.playlist = { x: G, y: MB + vh + 2 * G, w: vw, h: Math.max(120, H - vh - 3 * G) };
      R.chat = { x: vw + 2 * G, y: MB + G, w: Math.max(260, W - vw - 3 * G), h: H - 2 * G };
    }
  }

  function setMode(m, fresh) {
    const fs = ["theater", "pip"], inFs = fs.includes(S.mode);
    if (fs.includes(m) && !inFs) S.saved = clone({ r: S.rects });
    if (m === "split" && !fresh && inFs && S.saved) {
      S.rects = S.saved.r; S.saved = null; m = "custom";
    } else {
      if (!fs.includes(m)) S.saved = null;
      layout(m === "custom" ? "split" : m);
    }
    S.mode = m;
    refresh();
    save();
  }

  function cycleLayout() {
    setMode(S.mode === "theater" ? "pip" : S.mode === "pip" ? "split" : "theater", S.mode === "pip");
  }

  const Z_TOP = 1000000;

  function baseZ(n) {
    const z = parseInt(WIN[n] && WIN[n].el && WIN[n].el.dataset.cyosZ, 10);
    return Number.isFinite(z) ? z : 10;
  }

  function applyZ(n) {
    const w = WIN[n];
    if (!w) return;
    const z = baseZ(n);
    w.el.dataset.cyosZ = String(z);
    w.el.style.zIndex = String((S.top[n] ? Z_TOP : 0) + z);
    w.el.classList.toggle("cyos-ontop", !!S.top[n]);
  }

  function raiseWin(n) {
    if (!WIN[n]) return;
    WIN[n].el.dataset.cyosZ = String(++S.z);
    applyZ(n);
  }

  function place(n) {
    const w = WIN[n];
    if (!w) return;
    let r = S.rects[n];
    const m = mobile();
    if (m) r = { x: 0, y: MB, w: innerWidth, h: innerHeight - MB - TAB };
    else if (!r) return;
    else { if (r.sn) Object.assign(r, targetRect(r.sn)); keepIn(r); }
    const open = m ? S.tab === n : (!!S.open[n] && !S.min[n]);
    const st = w.el.style;
    [["left", open ? r.x : -10000], ["top", r.y], ["width", r.w], ["height", r.h]]
      .forEach(([k, v]) => st.setProperty(k, Math.round(v) + "px", "important"));
    w.el.classList.toggle("cyos-closed", !open);
    w.el.classList.toggle("cyos-pin", S.mode === "pip" && n === "video");
    w.el.classList.toggle("cyos-focus", S.focus === n);
    applyZ(n);
  }  function playlistLockLabel() {    if (!window.CHANNEL || typeof CHANNEL.openqueue !== "boolean") return "";
    return CHANNEL.openqueue ? "pl:open" : "pl:lock";
  }

  function statusHints() {
    if (S.pending) return "y/n confirm";
    if (S.move) return "arrows move · Esc";
    if (S.desk) return "m move · j/k pl · Esc chat · ^K";
    if (S.focus === "terminal") return "cmds · man · Esc desk";
    if (S.focus === "playlist") return "j/k · Enter jump · Del · Esc desk";
    return "Esc desk · ^K · Y term";
  }

  function statusText() {
    const mode = S.move ? "MOVE" : S.desk ? "DESK" : "CHAT";
    const foc = S.focus || "?";
    const pl = playlistLockLabel();
    const bits = [mode, foc];
    if (pl) bits.push(pl);
    bits.push(statusHints());
    return bits.join(" · ");
  }

  function statusLine() {
    document.body.classList.toggle("cyos-desk", S.desk);
    if (ui.flag) {
      ui.flag.textContent = statusText();
      ui.flag.title = "Mode · focus · playlist lock · key hints";
    }
    if (ui.termStatus) {
      const openN = DEFS.map(defId).filter((id) => S.open[id] && !S.min[id]).length;
      const pl = playlistLockLabel() || "pl:?";
      ui.termStatus.innerHTML = "<b>v" + VERSION + "</b> · " + (S.focus || "?") + " · " + S.mode + " · " + pl + " · " + openN + " win";
    }
  }

  function flag() { statusLine(); }

  function tabs() {
    document.querySelectorAll(".cyos-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.w === S.tab));
  }

  function clampAlpha(n) {
    n = Number(n);
    if (n !== 0 && !(n > 0)) return 1;
    if (n > 1) n = n / 100;
    // 0 = fully clear chrome background; text stays solid via color (not element opacity)
    return Math.max(0, Math.min(1, n));
  }

  function getAlpha(id) {
    const a = S.alphas[id];
    return typeof a === "number" ? clampAlpha(a) : 1;
  }

  function setAlpha(id, value) {
    if (!id) return false;
    if (!WIN[id] && !DEFS.some((d) => defId(d) === id)) return false;
    const a = clampAlpha(value);
    S.alphas[id] = a;
    applyAlpha(id);
    return true;
  }

  function applyAlpha(id) {
    const targets = id ? [id] : Object.keys(WIN);
    targets.forEach((n) => {
      const w = WIN[n];
      if (!w || !w.el) return;
      const a = getAlpha(n);
      w.el.style.setProperty("--win-a", String(a));
      w.el.classList.toggle("cyos-glass", a > 0 && a < 0.999);
    });
  }

  function refresh() {
    const b = document.body.classList;
    b.toggle("cyos-mobile", mobile());
    b.toggle("cyos-theater", S.mode === "theater");
    b.toggle("cyos-pip", S.mode === "pip");
    b.toggle("cyos-term", S.theme === "term");
    b.toggle("cyos-users", S.users);
    b.toggle("cyos-nav", S.nav);
    Object.keys(WIN).forEach(place);
    applyAlpha();
    flag();
    tabs();
    renderDock();
  }

  function focusSurface(n) {
    const w = WIN[n];
    if (!w || mobile()) return;
    try { w.el.focus({ preventScroll: true }); } catch (_) { try { w.el.focus(); } catch (_) {} }
  }

  function focusWin(n) {
    if (!WIN[n]) return;
    if (mobile()) S.tab = n; else { S.open[n] = true; S.min[n] = false; }
    S.focus = n;
    raiseWin(n);
    refresh();
    rebuildWindowMenus();
    if (!mobile()) {
      if (n === "terminal" && ui.termInput) {
        setTimeout(() => {
          if (S.focus !== n || !S.open[n] || S.min[n]) return;
          try { ui.termInput.focus({ preventScroll: true }); } catch (_) {}
        }, 0);
      } else {
        focusSurface(n);
      }
    }
  }

  function openWin(n) { focusWin(n); save(); }

  const visibleNames = () => DEFS.map(defId).filter((k) => WIN[k] && S.open[k] && !S.min[k]);
  // Most recently focused visible window (highest z-index): where focus goes when the active window leaves.
  const topVisible = () => visibleNames().sort((x, y) => (+WIN[y].el.style.zIndex || 0) - (+WIN[x].el.style.zIndex || 0))[0];

  function closeWin(n) {
    if (mobile() || !WIN[n]) return;
    S.open[n] = false;
    S.min[n] = false;
    if (S.focus === n) S.focus = topVisible() || "chat";
    refresh();
    rebuildWindowMenus();
    if (S.focus !== n) focusSurface(S.focus);
    save();
  }

  function minWin(n) {
    if (!WIN[n]) return;
    if (mobile()) return note("Minimize is for the desktop layout; use the tabs.", "err");
    if (!S.open[n] || S.min[n]) return;
    S.min[n] = true;
    if (S.focus === n) S.focus = topVisible() || n;
    refresh();
    rebuildWindowMenus();
    if (S.focus !== n) focusSurface(S.focus);
    save();
    note((defTitle(DEFS.find((d) => defId(d) === n) || {title:n})) + " minimized. Click its chip (bottom left) or press its key to restore.");
  }

  function toggleWin(n) {
    if (!WIN[n]) return;
    if (!mobile() && S.open[n] && !S.min[n] && S.focus === n) closeWin(n); else openWin(n);
  }

  function cycle(dir) {
    const names = DEFS.map(defId).filter((k) => WIN[k] && (mobile() || (S.open[k] && !S.min[k])));
    if (!names.length) return;
    const i = names.indexOf(S.focus);
    focusWin(names[(i + dir + names.length) % names.length]);
  }

  // One geometry model: r.sn = current snap target, r.pv = the custom geometry to return to,
  // r.pz = the snap a window was in before it was maximized (maximize again returns there).
  // Snap, maximize and presets all use desk() bounds (viewport minus the menu bar).
  const SNAPS = ["l", "r", "tl", "tr", "bl", "br", "max"];

  function targetRect(t) {
    const d = desk(), hw = Math.floor(d.w / 2), hh = Math.floor(d.h / 2);
    const v = {
      l: [0, MB, hw, d.h], r: [hw, MB, d.w - hw, d.h],
      tl: [0, MB, hw, hh], tr: [hw, MB, d.w - hw, hh],
      bl: [0, MB + hh, hw, d.h - hh], br: [hw, MB + hh, d.w - hw, d.h - hh],
      max: [0, MB, d.w, d.h]
    }[t] || [0, MB, d.w, d.h];
    return { x: v[0], y: v[1], w: v[2], h: v[3] };
  }

  function restoreWin(n) {
    const r = S.rects[n];
    if (!r || !r.sn) return;
    if (r.pv) Object.assign(r, r.pv);
    delete r.sn; delete r.pv; delete r.pz;
    place(n);
    save();
  }

  function snapTo(n, t, prev) {
    const r = S.rects[n];
    if (!r) return;
    if (mobile()) return note("Snapping is for the desktop layout.", "err");
    if (!SNAPS.includes(t)) return note("Snap targets: " + SNAPS.join(", "), "err");
    if (!S.open[n] || S.min[n]) return;
    if (r.sn === t) {
      if (t === "max" && r.pz) { r.sn = r.pz; delete r.pz; place(n); save(); return; }
      return restoreWin(n);
    }
    if (!r.sn) r.pv = prev || { x: r.x, y: r.y, w: r.w, h: r.h };
    if (t === "max" && r.sn) r.pz = r.sn; else delete r.pz;
    r.sn = t;
    Object.assign(r, targetRect(t));
    if (S.mode === "split") S.mode = "custom";
    place(n);
    save();
  }

  function zoom(n) { snapTo(n, "max"); }
  function snap(n, side) { snapTo(n, side); }

  // Where a title-bar drag was released: side edges = halves, side corner zones = quarters, top edge = maximize.
  function dropTarget(x, y) {
    const E = 8, C = 72, d = desk();
    const nearL = x <= E, nearR = x >= d.w - E;
    if (nearL || nearR) {
      if (y <= MB + C) return nearL ? "tl" : "tr";
      if (y >= innerHeight - C) return nearL ? "bl" : "br";
      return nearL ? "l" : "r";
    }
    if (y <= MB + 6) return "max";
    return null;
  }

  // Minimized windows leave the desktop; a chip bottom-left restores each one.
  function renderDock() {
    if (!ui.dock) return;
    const names = mobile() ? [] : DEFS.map(defId).filter((k) => WIN[k] && S.open[k] && S.min[k]);
    const sig = names.join(",");
    if (ui.dock.dataset.sig === sig) return;
    ui.dock.dataset.sig = sig;
    ui.dock.textContent = "";
    names.forEach((k) => {
      const title = defTitle(DEFS.find((d) => defId(d) === k) || {title:k});
      const b = document.createElement("button");
      b.type = "button"; b.className = "cyos-chip"; b.dataset.w = k;
      b.textContent = title; b.title = "Restore " + title + " window";
      ui.dock.appendChild(b);
    });
  }

  /* ---------- mouse / touch dragging ---------- */
  function drag(e, name, kind) {
    if (mobile() || (e.button !== undefined && e.button > 0)) return;
    const r = S.rects[name];
    if (!r) return;
    e.preventDefault();
    focusWin(name);
    const pv0 = r.pv ? { ...r.pv } : null;
    delete r.sn; delete r.pv; delete r.pz;
    const sx = e.clientX, sy = e.clientY, o = { x: r.x, y: r.y, w: r.w, h: r.h };
    const tgt = e.currentTarget;
    if (tgt.setPointerCapture) tgt.setPointerCapture(e.pointerId);
    document.body.classList.add("cyos-drag");
    const mv = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (kind === "move") { r.x = o.x + dx; r.y = o.y + dy; }
      else { r.w = Math.max(200, o.w + dx); r.h = Math.max(110, o.h + dy); }
      place(name);
    };
    const up = (ev) => {
      tgt.removeEventListener("pointermove", mv);
      tgt.removeEventListener("pointerup", up);
      tgt.removeEventListener("pointercancel", up);
      document.body.classList.remove("cyos-drag");
      if (kind === "move") {
        const d = desk(), t = dropTarget(ev.clientX, ev.clientY);
        if (t) { snapTo(name, t, pv0 || o); }
        else {
          keepIn(r);
          if (Math.abs(r.x) < 12) r.x = 0;
          if (Math.abs(d.w - (r.x + r.w)) < 12) r.x = d.w - r.w;
          if (Math.abs(r.y - MB) < 12) r.y = MB;
          place(name);
        }
      }
      if (S.mode === "split") S.mode = "custom";
      save();
    };
    tgt.addEventListener("pointermove", mv);
    tgt.addEventListener("pointerup", up);
    tgt.addEventListener("pointercancel", up);
  }

  /* ---------- building windows and desktop ---------- */
  function makeWindow(def) {
    // Accept legacy [name, title, selector, icon] or registry object
    let name, title, sel, icon, mount, bodyClass;
    if (Array.isArray(def)) {
      name = def[0]; title = def[1]; sel = def[2]; icon = def[3] || "";
    } else {
      name = def.id; title = def.title || def.id; sel = def.selector;
      icon = def.icon || "\u25A1"; mount = def.mount; bodyClass = def.bodyClass;
    }
    if (!name || WIN[name]) return;

    let el = sel ? q(sel) : null;
    if (!el) {
      // Create a fresh window shell for registered / synthetic windows
      el = document.createElement("div");
      el.id = "cyos-win-" + name;
      el.className = "cyos-synthetic";
      const body = document.createElement("div");
      body.className = "cyos-body" + (bodyClass ? " " + bodyClass : "");
      el.appendChild(body);
      document.body.appendChild(el);
      if (typeof mount === "function") {
        try { mount(body, { id: name, title, el }); } catch (err) {
          console.error("[cyos] mount failed for", name, err);
          body.textContent = "Mount error: " + (err && err.message ? err.message : err);
        }
      }
    }

    const bar = document.createElement("div");
    bar.className = "cyos-bar";
    bar.innerHTML = '<button type="button" class="cyos-box" data-a="close" aria-label="Close ' + title + '" title="Close (reopen from the desktop icon or Window menu)"></button>' +
      "<i></i><span>" + title + "</span><i></i>" +
      '<button type="button" class="cyos-box" data-a="min" aria-label="Minimize ' + title + '" title="Minimize (restore from the chip at bottom left)"></button>' +
      '<button type="button" class="cyos-box" data-a="zoom" aria-label="Maximize or restore ' + title + '" title="Maximize / restore (Z)"></button>';
    const grow = document.createElement("div");
    grow.className = "cyos-grow";
    if (name === "playlist" && sel) {
      const body = document.createElement("div");
      body.className = "cyos-body";
      while (el.firstChild) body.appendChild(el.firstChild);
      el.appendChild(body);
    }
    el.insertBefore(bar, el.firstChild);
    el.appendChild(grow);
    el.classList.add("cyos-win");
    el.tabIndex = -1;
    el.style.zIndex = String(++S.z);
    WIN[name] = { name, el, bar, grow, title, icon, mount };

    el.addEventListener("pointerdown", () => { if (S.focus !== name) focusWin(name); }, true);
    bar.addEventListener("pointerdown", (e) => { if (!e.target.closest(".cyos-box")) drag(e, name, "move"); });
    bar.addEventListener("dblclick", (e) => { if (!e.target.closest(".cyos-box")) zoom(name); });
    bar.addEventListener("click", (e) => {
      const b = e.target.closest(".cyos-box");
      if (!b) return;
      if (b.dataset.a === "zoom") zoom(name); else if (b.dataset.a === "min") minWin(name); else closeWin(name);
    });
    grow.addEventListener("pointerdown", (e) => drag(e, name, "size"));
  }

  // Hide everything that isn't an ancestor of a window, without moving any window (moving an iframe would reload the player).
  function carve() {
    const wins = new Set(Object.values(WIN).map((w) => w.el));
    const keep = new Set();
    wins.forEach((el) => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) keep.add(n); });
    keep.forEach((a) => {
      a.classList.add("cyos-path");
      [...a.children].forEach((c) => {
        if (keep.has(c) || wins.has(c)) return;
        if (c.matches(".modal,.modal-backdrop,script,style,link,[id^=cyos]")) return;
        c.classList.add("cyos-hide");
      });
    });
  }

  const HELP = [
    "CyTube OS " + VERSION + " — keyboard & command reference",
    "",
    "Esc            Chat mode ↔ Desk mode",
    "Ctrl+K         command palette (Desk: also / or :)",
    "F10            menu bar focus",
    "Y              Terminal    O Console    H Help",
    "C V P          Chat / Video / Playlist",
    "",
    "Desk mode: m move, [ ] snap halves, 1-4 quarters, z max, - min,",
    "  t theater, x pip, d dock, s split, l cycle layout, Tab cycle windows,",
    "  u users, n navbar, a add…, j/k playlist select, Enter jump, Del remove",
    "",
    "Terminal (keep keyboard here)",
    "  Type commands without a leading slash. Up/Down = history. !! = repeat.",
    "  Destructive actions prompt y/n in the Terminal (? prompt).",
    "  alias name=cmd   man <cmd>   cmds   status   quiet|verbose",
    "",
    "Playlist  now|np  ls  search <text>  duration  add|next <url>",
    "  jump|del <target>  move <from> <to>  skip  voteskip  shuffle  clearpl",
    "  temp [N]  makeperm [N]  replay",
    "Targets: 3  .  $  +1  -1  2-5  /title/",
    "",
    "Windows   focus|show|hide <name>  min  max  snap <side>  cycle  desk",
    "  wins  theater|pip|dock|split  theme mac|term",
    "  alpha                  list all window alphas",
    "  alpha [win|all] on|off|0|0.7  set glass (0=clear fill, text stays solid)",
    "",
    "Room      who  say|me|msg|sp  afk  poll|hpoll|vote  lock|unlock",
    "Mod       kick ban unban ipban kickanons  mute smute unmute  clearchat",
    "          clean <user>  cleantitle <title>  rank  shout",
    "Site      a <text>  siterank <user> <n>  (rank ≥ 255)",
    "Fun       roll [NdM]  pick a|b|c  countdown <sec>  drink  mcdonalds",
    "",
    "Scope in cmds:  ○ local   ● room   ✉ chat",
    "Escape hatch: add ?plain=1 to the channel URL.",
    "Developers: CyOS.registerWindow / registerCommand (see status)."
  ].join("\n");

  function showHelp() { openWin("help"); }
  function hideHelp() { closeWin("help"); }

  function accessLabel(label, key) {
    const i = key ? label.toLowerCase().indexOf(key) : -1;
    return i < 0 ? label : label.slice(0, i) + "<u>" + label[i] + "</u>" + label.slice(i + 1);
  }

  function windowMenuItems(id) {
    const topLabel = S.top[id] ? "Disable always on top" : "Always on top";
    if (id === "chat") {
      return [
        ["Focus Chat", "chat", "", "C", "f"],
        ["User list", "users", "", "U", "u"],
        ["Queue notices", "sysmsg", "", "", "q"],
        ["Private message…", "palette.msg", "", "", "p"],
        [topLabel, "win.top", "chat", "", "t"],
        ["Glass (alpha on)", "alpha", "chat on", "", "g"],
        ["Solid (alpha off)", "alpha", "chat off", "", "s"],
        ["Alpha 70%", "alpha", "chat 0.7", "", "a"]
      ];
    }
    if (id === "playlist") {
      return [
        ["Add media…", "palette.add", "", "", "a"],
        ["Skip current", "skip", "", "", "k"],
        ["Vote to skip", "voteskip", "", "", "v"],
        ["Jump / delete…", "palette.toggle", "", "Ctrl+K", "j"],
        ["Lock playlist", "lock", "", "", "l"],
        ["Unlock playlist", "unlock", "", "", "u"],
        [topLabel, "win.top", "playlist", "", "t"],
        ["Glass (alpha on)", "alpha", "playlist on", "", "g"],
        ["Solid (alpha off)", "alpha", "playlist off", "", "s"]
      ];
    }
    if (id === "terminal") {
      return [
        ["Focus Terminal", "terminal", "", "Y", "f"],
        ["Clear Terminal", "clear", "", "", "c"],
        ["Quiet mode", "quiet", "", "", "q"],
        ["Verbose mode", "verbose", "", "", "v"],
        [topLabel, "win.top", "terminal", "", "t"],
        ["Glass (alpha on)", "alpha", "terminal on", "", "g"],
        ["Solid (alpha off)", "alpha", "terminal off", "", "s"]
      ];
    }
    if (id === "video") {
      return [
        ["Focus Video", "video", "", "V", "f"],
        ["Theater layout", "theater", "", "T", "h"],
        ["Picture in Picture", "pip", "", "X", "p"],
        [topLabel, "win.top", "video", "", "t"],
        ["Glass (alpha on)", "alpha", "video on", "", "g"],
        ["Solid (alpha off)", "alpha", "video off", "", "s"]
      ];
    }
    if (id === "console") {
      return [
        ["Focus Console", "console", "", "O", "f"],
        ["Clear Console", "cls", "", "", "c"],
        [topLabel, "win.top", "console", "", "t"],
        ["Glass (alpha on)", "alpha", "console on", "", "g"],
        ["Solid (alpha off)", "alpha", "console off", "", "s"]
      ];
    }
    if (id === "help") {
      return [
        ["Focus Help", "help.toggle", "", "H", "f"],
        [topLabel, "win.top", "help", "", "t"],
        ["Glass (alpha on)", "alpha", "help on", "", "g"],
        ["Solid (alpha off)", "alpha", "help off", "", "s"]
      ];
    }
    return [
      ["Focus window", "win.open", id, "", "f"],
      ["Minimize", "win.min", "", "-", "m"],
      ["Close", "win.close", id, "", "c"],
      [topLabel, "win.top", id, "", "t"],
      ["Glass (alpha on)", "alpha", id + " on", "", "g"],
      ["Solid (alpha off)", "alpha", id + " off", "", "s"],
      ["Alpha 70%", "alpha", id + " 0.7", "", "a"]
    ];
  }

  function rebuildWindowMenus() {
    const host = ui && ui.winMenus;
    if (!host) return;
    const ids = [];
    if (S.menuWins === "open") {
      DEFS.forEach((d) => {
        const id = defId(d);
        if (WIN[id] && S.open[id] && !S.min[id]) ids.push(id);
      });
    } else if (S.focus && WIN[S.focus] && (mobile() ? S.tab === S.focus : (S.open[S.focus] && !S.min[S.focus]))) {
      ids.push(S.focus);
    }
    const used = { f: 1, e: 1, v: 1, w: 1, h: 1 };
    host.innerHTML = ids.map((id) => {
      const title = defTitle(DEFS.find((d) => defId(d) === id) || { title: id });
      let access = "";
      const low = title.toLowerCase();
      for (let i = 0; i < low.length; i++) {
        const ch = low[i];
        if (ch >= "a" && ch <= "z" && !used[ch]) { access = ch; used[ch] = 1; break; }
      }
      if (!access) {
        for (let c = 97; c <= 122; c++) {
          const ch = String.fromCharCode(c);
          if (!used[ch]) { access = ch; used[ch] = 1; break; }
        }
      }
      const label = (S.top[id] ? "\u2191 " : "") + title;
      return menuMarkup(label, "x" + id, windowMenuItems(id));
    }).join("");
  }

  // item = [label, action, arg, shortcut, accessLetter]; the access letter is unique inside its menu.
  function menuMarkup(label, access, items) {
    const id = "cyos-menu-" + access;
    const rows = items.map((it) => {
      const key = (it[4] || it[0][0]).toLowerCase(), sc = it[3] || "";
      const tip = sc ? (/^Ctrl/.test(sc) ? "Shortcut: " : "Desk-mode key (press Esc first): ") + sc : "";
      return '<button type="button" role="menuitem" data-do="' + it[1] + '" data-arg="' + (it[2] || "") + '" data-key="' + key + '"' +
        (tip ? ' title="' + tip + '"' : "") + ">" + accessLabel(it[0], key) + (sc ? "<kbd>" + sc + "</kbd>" : "") + "</button>";
    }).join("");
    return '<span class="cyos-menugroup"><button type="button" data-menu="' + access + '" data-access="' + access + '" aria-haspopup="true" aria-expanded="false" aria-controls="' + id + '"><u>' + label[0] + "</u>" + label.slice(1) + '</button><div class="cyos-dropdown" id="' + id + '" role="menu" aria-label="' + label + '">' + rows + "</div></span>";
  }

  let openMenu = null;
  function closeMenus(returnFocus) {
    if (!ui.root) return;
    ui.root.querySelectorAll(".cyos-dropdown.on").forEach((d) => d.classList.remove("on"));
    ui.root.querySelectorAll("button[data-menu]").forEach((b) => { b.classList.remove("on"); b.setAttribute("aria-expanded", "false"); });
    const previous = openMenu;
    openMenu = null;
    if (returnFocus && previous) previous.focus();
  }
  function showMenu(button, focusFirst) {
    closeMenus(false);
    if (!button) return;
    const drop = q("#" + button.getAttribute("aria-controls"), ui.root);
    if (!drop) return;
    openMenu = button;
    button.classList.add("on"); button.setAttribute("aria-expanded", "true"); drop.classList.add("on");
    if (focusFirst) { const first = q('[role="menuitem"]', drop); if (first) first.focus(); }
  }
  function runMenuAction(button) {
    const action = button.dataset.do, arg = button.dataset.arg || "";
    closeMenus(false);
    switch (action) {
      case "palette.add": openPalette(); pal.input.value = "add "; hints(); pal.input.focus(); break;
      case "plain": dispatch("plain", [], "", false); break;
      case "win.open": dispatch("win.open", [arg], "", false); break;
      case "chat": dispatch("chat", [], "", false); exitDesk(); break;
      case "video": dispatch("video", [], "", false); break;
      case "list": dispatch("list", [], "", false); break;
      case "console": dispatch("console", [], "", false); break;
      case "users": dispatch("users", [], "", false); break;
      case "sysmsg": dispatch("sysmsg", [], "", false); break;
      case "cls": dispatch("cls", [], "", false); break;
      case "palette.msg": openPalette(); if (pal.input) { pal.input.value = "msg "; hints(); pal.input.focus(); } break;
      case "win.close": dispatch("hide", arg ? [arg] : [], "", false); break;
      case "win.top": dispatch("top", arg ? [arg] : [], "", false); break;
      case "menumode": dispatch("menumode", arg ? [arg] : [], "", false); break;
      case "lock": dispatch("lock", [], "", false); break;
      case "unlock": dispatch("unlock", [], "", false); break;
      case "skip": dispatch("skip", [], "", false); break;
      case "voteskip": dispatch("voteskip", [], "", false); break;
      case "clear": dispatch("clear", [], "", false); break;
      case "quiet": dispatch("quiet", [], "", false); break;
      case "verbose": dispatch("verbose", [], "", false); break;
      case "alpha": {
        const parts = String(arg || "").trim().split(/\s+/).filter(Boolean);
        dispatch("alpha", parts, parts.join(" "), false);
        break;
      }
      default: dispatch(action, arg ? [arg] : [], "", false); break;
    }
  }

  function buildRoot() {
    const iconTips = {chat:'Open or focus Chat (C)',video:'Open or focus Video (V)',playlist:'Open or focus Playlist (P)',console:'Open or focus Console (O)',terminal:'Open or focus Terminal (Y)',help:'Open or focus Help (H or ?)'};
    const iconKeys = {chat:'C',video:'V',list:'P',console:'O',terminal:'Y',help:'H'};
    const iconsHtml =
      '<div class="cyos-icons">' +
      DEFS.map((d) => {
        const id = defId(d), title = defTitle(d), icon = defIcon(d);
        const tip = iconTips[id] || ("Open " + title);
        const key = iconKeys[id] || "";
        return '<button type="button" class="cyos-ico" data-w="' + id + '" title="' + tip + '"' +
          (key ? ' aria-keyshortcuts="' + key + '"' : '') +
          '><b>' + icon + "</b><span>" + title + "</span></button>";
      }).join("") +
      '</div>';
    const r = document.createElement("div");
    r.id = "cyos-root";
    r.innerHTML =
      '<nav class="cyos-menu" aria-label="CyTube OS menu bar"><b title="CyTube OS desktop environment">◆ CyTube OS</b>' +
      menuMarkup("File", "f", [["Commands…", "palette.toggle", "", "Ctrl+K", "c"], ["Keyboard reference", "help.toggle", "", "H", "k"], ["Return to normal CyTube", "plain", "", "", "r"]]) +
      menuMarkup("Edit", "e", [["Command palette…", "palette.toggle", "", "Ctrl+K", "p"], ["Clear Console", "cls", "", "", "c"]]) +
      menuMarkup("View", "v", [["Cycle layout", "layout.cycle", "", "L", "c"], ["Split", "split", "", "", "s"], ["Theater", "theater", "", "", "t"], ["Picture in Picture", "pip", "", "", "p"], ["Dock layout", "dock", "", "", "d"], ["Toggle theme", "theme", "", "", "h"], ["Focused glass", "alpha", "on", "", "a"], ["Focused solid", "alpha", "off", "", "o"], ["Focused 70%", "alpha", "0.7", "", ""], ["List alphas", "alpha", "", "", ""], ["Menu: focused window", "menumode", "focus", "", ""], ["Menu: all open windows", "menumode", "open", "", ""]]) +
      menuMarkup("Window", "w", [["Chat", "win.open", "chat", "C", "c"], ["Video", "video", "", "V", "v"], ["Playlist", "list", "", "P", "p"], ["Console", "console", "", "O", "o"], ["Terminal", "terminal", "", "Y", "e"], ["Help", "help.toggle", "", "H", "h"], ["Minimize", "win.min", "", "-", "m"], ["Maximize / restore", "win.max", "", "Z", "x"], ["Always on top", "win.top", "", "", "a"], ["Snap left half", "win.snap", "l", "[", "l"], ["Snap right half", "win.snap", "r", "]", "r"], ["Top left quarter", "win.snap", "tl", "1", "t"], ["Top right quarter", "win.snap", "tr", "2", "i"], ["Bottom left quarter", "win.snap", "bl", "3", "b"], ["Bottom right quarter", "win.snap", "br", "4", "u"]]) +
      '<span class="cyos-winmenus" id="cyos-winmenus"></span>' +
      menuMarkup("Help", "h", [["Keyboard reference", "help.toggle", "", "H", "k"], ["Command palette…", "palette.toggle", "", "Ctrl+K", "p"]]) +
      '<button type="button" class="cyos-legacy" data-m="pal" title="Open command palette (Ctrl+K)">Commands <kbd>Ctrl+K</kbd></button>' +
      '<span class="cyos-confirm"><span></span><button type="button" data-c="y">Yes</button><button type="button" data-c="n">No</button></span>' +
      '<span class="cyos-note"></span><span class="cyos-flag">Chat</span><span class="cyos-clock"></span></nav>' +
      '<div class="cyos-dock" aria-label="Minimized windows"></div>' +
      '<div class="cyos-tabs">' + DEFS.map((d) => '<button type="button" data-w="' + defId(d) + '" title="Switch to ' + defTitle(d) + ' window">' + defTitle(d) + "</button>").join("") + "</div>" +
      '<div class="cyos-pal" role="dialog" aria-label="CyTube OS command palette"><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command palette" title="Type a command; Enter runs it, Up/Down recalls history, Tab completes" placeholder="Type a command (help)"><div class="cyos-hint"></div></div>';
    document.body.appendChild(r);
    // Desktop layer: icons live here, above the page background and below every window.
    const desktop = document.createElement("div");
    desktop.id = "cyos-desktop";
    desktop.innerHTML = iconsHtml;
    document.body.appendChild(desktop);
    ui.root = r;
    ui.desktop = desktop;
    ui.note = q(".cyos-note", r);
    ui.confirm = q(".cyos-confirm", r);
    ui.dock = q(".cyos-dock", r);
    ui.flag = q(".cyos-flag", r);
    ui.clock = q(".cyos-clock", r);
    ui.winMenus = q("#cyos-winmenus", r);
    pal.el = q(".cyos-pal", r);
    pal.input = q(".cyos-pal input", r);
    pal.hint = q(".cyos-hint", r);

    const onClick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.menu) {
        const wasOpen = b.getAttribute("aria-expanded") === "true";
        if (wasOpen) closeMenus(false); else showMenu(b, true);
        return;
      }
      if (b.dataset.do) { runMenuAction(b); return; }
      if (b.dataset.w) { dispatch("win.open", [b.dataset.w], "", false); if (b.dataset.w === "chat") exitDesk(); }
      else if (b.dataset.m === "cycle") dispatch("layout.cycle", [], "", false);
      else if (b.dataset.m === "help") dispatch("help.toggle", [], "", false);
      else if (b.dataset.m === "pal") dispatch("palette.toggle", [], "", false);
      else if (b.dataset.c) answer(b.dataset.c === "y");
    };
    r.addEventListener("click", onClick);
    desktop.addEventListener("click", onClick);

    document.addEventListener("pointerdown", (e) => {
      if (openMenu && !r.contains(e.target)) closeMenus(false);
    }, true);

    const tick = () => { ui.clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };
    tick();
    setInterval(tick, 15000);
    return r;
  }

  /* ---------- palette ---------- */
  const GLYPH = { local: "\u25CB", room: "\u25CF", chat: "\u2709" };
  const CMD = {};
  // perm may be a string, or an options object: { perm, confirm: (args, raw) => promptString }
  // Permission is checked before confirmation. Empty confirm string skips the prompt.
  const cmd = (names, usage, desc, scope, fn, perm) => {
    let confirm = null, p = perm;
    if (perm && typeof perm === "object") {
      confirm = typeof perm.confirm === "function" ? perm.confirm : null;
      p = perm.perm || null;
    }
    const wrapped = (args, raw) => {
      // Fail closed: only an explicit `true` from hasPermission lets a command run.
      // Denied, unknown, throwing or non-boolean answers all block it (denyPermission explains which).
      if (p && denyPermission(p, usage || [].concat(names)[0] || "this action")) return;
      if (confirm) {
        const prompt = confirm(args, raw);
        if (!prompt) return fn(args, raw);
        return ask(prompt, () => fn(args, raw));
      }
      return fn(args, raw);
    };
    [].concat(names).forEach((n, i) => {
      CMD[n] = { fn: wrapped, usage: i === 0 ? usage : "", desc, scope, perm: p, confirm: !!confirm };
    });
  };
  const setLayout = (n) => {
    n = (n || "").toLowerCase();
    if (n === "dock") setMode("split");
    else if (n === "split") setMode("split", true);
    else if (n === "theater" || n === "pip") setMode(S.mode === n ? "split" : n);
    else note("Layouts: split, theater, pip, dock", "err");
  };

  cmd("help", "help", "Open the Help window", "local", () => showHelp());
  cmd("chat", "chat", "Open and focus chat", "local", () => openWin("chat"));
  cmd("video", "video", "Show or hide the video window", "local", () => toggleWin("video"));
  cmd(["list", "pl", "playlist"], "list", "Show or hide the playlist window", "local", () => toggleWin("playlist"));
  cmd(["console", "log"], "console", "Show or hide the Console", "local", () => toggleWin("console"));
  cmd(["terminal", "term", "shell"], "terminal", "Show or hide the Terminal", "local", () => toggleWin("terminal"));
  cmd(["top", "ontop"], "top [window]", "Toggle always-on-top for a window (default: focus)", "local", (a) => {
    const n = (a[0] || S.focus || "").toLowerCase();
    if (!n || !WIN[n]) return note("Usage: top [window] — windows: " + winNames(), "err");
    S.top[n] = !S.top[n];
    Object.keys(WIN).forEach(applyZ);
    rebuildWindowMenus();
    save();
    note((defTitle(DEFS.find((d) => defId(d) === n) || { title: n })) + (S.top[n] ? " always on top." : " normal stacking."));
  });
  cmd("menumode", "menumode focus|open", "Menu bar: focused window only, or every open window", "local", (a) => {
    const m = (a[0] || "").toLowerCase();
    if (m !== "focus" && m !== "open") return note("Usage: menumode focus|open  (now: " + S.menuWins + ")", "err");    S.menuWins = m;
    rebuildWindowMenus();
    save();    note("Menu bar shows " + (m === "focus" ? "the focused window only." : "every open window."));  });
  cmd("cls", "cls", "Clear the Console and Terminal", "local", () => {
    if (ui.log) ui.log.textContent = "";
    if (ui.termLog) ui.termLog.textContent = "";
  });
  cmd("clear", "clear", "Clear the Terminal (or Console if Terminal is closed)", "local", () => {
    if (S.open.terminal && ui.termLog) ui.termLog.textContent = "";
    else if (ui.log) ui.log.textContent = "";
  });
  cmd(["ls", "pl.ls"], "ls", "List playlist entries with numbers", "local", () => {
    const r = rows();
    if (!r.length) return note("Playlist is empty.");
    const lines = r.map((row, i) => {
      const active = row.classList.contains("queue_active") ? " *" : "  ";
      return String(i + 1).padStart(3) + active + " " + shorten(titleOf(row), 60);
    });
    lines.forEach((ln) => { if (termRunDepth > 0 || S.focus === "terminal") termWrite("ok", ln); });
    note(r.length + " item(s). Use jump N / del N.");
    if (!(termRunDepth > 0 || S.focus === "terminal")) log("ok", lines.join("\n"));
  });
  cmd(["status", "whoami"], "status", "Show OS version, focus, theme, open windows", "local", () => {
    statusLine();
    const name = (window.CLIENT && CLIENT.name) || (window.NAME) || "guest";
    const open = DEFS.map(defId).filter((id) => S.open[id] && !S.min[id]);
    const lines = [
      "CyTube OS " + VERSION,
      "user: " + name,
      "focus: " + S.focus + "  theme: " + S.theme + "  alpha(" + (S.focus || "?") + "): " + Math.round(getAlpha(S.focus) * 100) + "%  layout: " + S.mode,
      "open: " + (open.join(", ") || "(none)"),
      "desk: " + (S.desk ? "on" : "off") + "  sysmsg: " + (S.sysmsg ? "on" : "off")
    ];
    lines.forEach((ln) => { if (termRunDepth > 0 || S.focus === "terminal") termWrite("ok", ln); });
    note(lines[0] + " — " + name + " / " + S.focus);
    if (!(termRunDepth > 0 || S.focus === "terminal")) lines.forEach((ln) => log("ok", ln));
  });
  cmd(["cmds", "commands"], "cmds", "List commands available in Terminal / palette", "local", () => {
    const items = Object.keys(CMD).filter((n) => CMD[n].usage).sort();
    const glyph = { local: "\u25CB", room: "\u25CF", chat: "\u2709" };
    items.forEach((n) => {
      const c = CMD[n];
      const g = glyph[c.scope] || " ";
      const line = g + " " + (c.usage || n).padEnd(22) + (c.desc || "");
      termOut("ok", line);
    });
    note(items.length + " commands. man <cmd> for one; help for keyboard.");
  });
  cmd("wins", "wins", "List windows and open/minimized/alpha state", "local", () => {
    DEFS.forEach((d) => {
      const id = defId(d);
      const st = !WIN[id] ? "missing" : S.min[id] ? "min" : S.open[id] ? (S.focus === id ? "FOCUS" : "open") : "closed";
      const a = Math.round(getAlpha(id) * 100) + "%";
      const line = id.padEnd(12) + st.padEnd(8) + a.padEnd(5) + defTitle(d);
      termOut("ok", line);
    });
  });
  cmd("echo", "echo <text>", "Print text in Terminal / Console", "local", (a, raw) => {
    const t = raw || a.join(" ");
    note(t || "(empty)");   // note() already mirrors into the Terminal exactly once
  });
  cmd("focus", "focus <window>", "Open and focus a window (chat, video, playlist, …)", "local", (a) => {
    const n = (a[0] || "").toLowerCase();
    if (!n || !WIN[n]) return note("Windows: " + DEFS.map(defId).join(", "), "err");
    openWin(n);
    note("Focused " + n);
  });
  cmd("perm", "perm [name]", "Check a CyTube permission (default: playlistadd)", "local", (a) => {
    const p = a[0] || "playlistadd";
    const st = permissionStatus(p);
    const label = st === true ? "granted" : st === false ? "denied" : "unknown";
    note("perm " + p + ": " + label);
    if (termRunDepth > 0 || S.focus === "terminal") termWrite("ok", p + " = " + label);
  });
  cmd("theater", "theater", "Full-screen video with chat on top", "local", () => setLayout("theater"));
  cmd("pip", "pip", "Small floating video over full-screen chat", "local", () => setLayout("pip"));
  cmd("dock", "dock", "Return to your previous layout", "local", () => setLayout("dock"));
  cmd("split", "split", "Reset to the default split layout", "local", () => setLayout("split"));
  cmd("layout.set", "layout.set <name>", "split, theater, pip or dock", "local", (a) => setLayout(a[0]));
  cmd("win.toggle", "win.toggle <name>", "Toggle a window by name", "local", (a) => {
    const n = (a[0] || "").toLowerCase();
    if (WIN[n]) toggleWin(n); else note("Windows: " + winNames(), "err");
  });
  // UI-only actions live in the same registry/dispatcher but stay out of palette hints.
  cmd("win.open", "", "Open and focus a window", "local", (a) => {
    const n = (a[0] || "").toLowerCase();
    if (WIN[n]) openWin(n); else note("Windows: " + winNames(), "err");
  });
  cmd("layout.cycle", "", "Cycle through layouts", "local", () => cycleLayout());
  cmd("help.toggle", "", "Show or hide the Help window", "local", () => toggleWin("help"));
  cmd("help.close", "", "Close the Help window", "local", () => hideHelp());
  cmd("win.min", "", "Minimize the active window", "local", () => minWin(S.focus));
  cmd("win.max", "", "Maximize or restore the active window", "local", () => snapTo(S.focus, "max"));
  cmd("win.snap", "", "Snap the active window (l r tl tr bl br max)", "local", (a) => snapTo(S.focus, a[0]));
  cmd("win.restore", "", "Restore the active window's previous size", "local", () => restoreWin(S.focus));
  cmd("palette.toggle", "", "Toggle the command palette", "local", () => pal.on ? closePalette() : openPalette());
  cmd(["add", "pl.add"], "add <url>", "Add media to the end of the playlist", "room", (a, raw) => addMedia(raw, "end"), "playlistadd");
  cmd(["next", "pl.next"], "next <url>", "Add media to play next", "room", (a, raw) => addMedia(raw, "next"), "playlistnext");
  cmd(["skip", "pl.skip"], "skip", "Skip to the next item", "room", () => {
    if (emit("playNext")) note("Skip request sent.");
  }, "playlistjump");
  cmd("voteskip", "voteskip", "Vote to skip the current item", "room", () => {
    if (emit("voteskip")) note("Vote sent.");
  }, "voteskip");
  cmd(["jump", "pl.jump"], "jump <target>", "Play an entry: 3, ., $, +1, /text/", "room", (a, raw) => jump(raw), "playlistjump");
  cmd(["del", "pl.del"], "del <target>", "Remove entries: 3, 2-5, /text/ (asks first)", "room", (a, raw) => del(raw), "playlistdelete");
  cmd("say", "say <text>", "Send text to chat", "chat", (a, raw) => { if (raw) sendChat(raw); });
  cmd("users", "users", "Show or hide the user list in chat", "local", () => { S.users = !S.users; refresh(); });
  cmd("nav", "nav", "Show or hide the site navbar (login, options)", "local", () => { S.nav = !S.nav; refresh(); });
  cmd("sysmsg", "sysmsg [on|off]", "Show 'queued' lines in your chat", "local", (a) => {
    S.sysmsg = a[0] === "on" ? true : a[0] === "off" ? false : !S.sysmsg;
    note("Queue lines in chat: " + (S.sysmsg ? "on" : "off")); save();
  });
  cmd(["theme", "sys.theme"], "theme [mac|term]", "Switch between light and dark", "local", (a) => {
    S.theme = a[0] === "mac" || a[0] === "term" ? a[0] : (S.theme === "mac" ? "term" : "mac");
    refresh(); save();
  });
  cmd(["alpha", "opacity", "transparency"], "alpha [win] [on|off|0-1|0-100]", "Per-window transparency (focused if no name)", "local", (a) => {
    const parseVal = (tok) => {
      if (!tok) return null;
      const t = String(tok).toLowerCase();
      if (t === "on" || t === "glass") return 0.72;
      if (t === "off" || t === "solid") return 1;
      if (t === "toggle") return "toggle";
      if (t === "0" || t === "0%") return 0;
      let n = parseFloat(t);
      if (n !== 0 && !(n > 0)) return null;
      return clampAlpha(n);
    };
    const report = (id) => Math.round(getAlpha(id) * 100) + "%";
    // bare "alpha" lists all window alphas (one form only; no alpha list / alpha ls)
    if (!a.length) {
      const ids = DEFS.map(defId);
      ids.forEach((id) => termOut("ok", id.padEnd(12) + report(id)));
      note("alpha <window|all|focus> on|off|0|0.7|70  — focused: " + (S.focus || "?") + " " + report(S.focus));
      return;
    }
    let ids = [], valTok = null;
    const t0 = a[0].toLowerCase();
    const t1 = a[1] ? a[1].toLowerCase() : null;
    if (t0 === "all") {
      ids = DEFS.map(defId);
      valTok = t1;
    } else if (t0 === "focus" || t0 === ".") {
      ids = [S.focus];
      valTok = t1;
    } else if (WIN[t0] || DEFS.some((d) => defId(d) === t0)) {
      ids = [t0];
      valTok = t1;
    } else {
      // alpha on | alpha 0.7  → focused window
      ids = [S.focus];
      valTok = t0;
    }
    if (!valTok) {
      note((ids[0] || "?") + " alpha " + report(ids[0] || S.focus));
      return;
    }
    let val = parseVal(valTok);
    if (val === null) return note("Usage: alpha [chat|playlist|all] on|off|toggle|0-1|0-100", "err");
    ids.forEach((id) => {
      if (!id) return;
      if (val === "toggle") setAlpha(id, getAlpha(id) < 0.99 ? 1 : 0.72);
      else setAlpha(id, val);
    });
    save();
    if (ids.length === 1) note(ids[0] + " alpha " + report(ids[0]));
    else note(ids.length + " windows → alpha set");
  });
  cmd("plain", "plain", "Leave CyTube OS and reload the normal page", "local", () => { location.href = location.pathname + "?plain=1"; });

  /* ---- v0.5.7 command pack ---- */
  cmd(["now", "np"], "now", "Show the currently playing item", "local", () => {
    const r = activeRow();
    if (!r) return note("Nothing playing.", "err");
    const m = rowMeta(r);
    const i = rows().indexOf(r) + 1;
    const line = "#" + i + (m.temp ? " [temp]" : "") + " " + m.title + (m.time ? "  (" + m.time + ")" : "");
    note(line);
  });

  cmd("search", "search <text>", "List playlist entries matching text", "local", (a, raw) => {
    const needle = (raw || a.join(" ")).trim().toLowerCase();
    if (!needle) return note("Usage: search <text>", "err");
    const hits = rows().map((row, i) => ({ i: i + 1, row, t: titleOf(row) }))
      .filter((x) => x.t.toLowerCase().includes(needle));
    if (!hits.length) return note("No matches for \"" + needle + "\".", "err");
    hits.forEach((x) => termOut("ok", String(x.i).padStart(3) + "  " + shorten(x.t, 60)));
    note(hits.length + " match(es).");
  });

  cmd(["duration", "len"], "duration", "Show playlist size and time hints if available", "local", () => {
    const r = rows();
    if (!r.length) return note("Playlist is empty.");
    let withTime = 0;
    r.forEach((row) => { if (rowMeta(row).time) withTime++; });
    const line = r.length + " item(s)" + (withTime ? ", " + withTime + " with duration labels" : "");
    note(line);
  });

  cmd(["replay", "again"], "replay", "Jump to the currently playing item", "room", () => jump("."), "playlistjump");

  cmd("move", "move <from> <to>", "Move playlist item from index to index (1-based)", "room", (a) => {
    const from = parseInt(a[0], 10), to = parseInt(a[1], 10);
    if (!(from > 0 && to > 0)) return note("Usage: move <from> <to>  (1-based indexes)", "err");
    const r = rows();
    if (from > r.length || to > r.length) return note("Index out of range (1-" + r.length + ").", "err");
    if (from === to) return note("Already there.");
    const fromUid = uidOf(r[from - 1]);
    // CyTube moveMedia: after = uid of the item that should precede the moved item, or "prepend" for the top
    let after = null;
    if (to === 1) after = "prepend";
    else if (to > from) after = uidOf(r[to - 1]);
    else after = uidOf(r[to - 2]);
    if (emit("moveMedia", { from: fromUid, after: after })) {
      note("Move request sent: #" + from + " → #" + to + ".");
    }
  }, "playlistmove");

  cmd("shuffle", "shuffle", "Shuffle the playlist (asks first)", "room", () => {
    if (emit("shufflePlaylist")) note("Shuffle request sent.");
  }, { perm: "playlistshuffle", confirm: () => "Shuffle the entire playlist?" });

  cmd("clearpl", "clearpl", "Clear the playlist (asks first)", "room", () => {
    if (!rows().length) return note("Playlist is already empty.");
    if (emit("clearPlaylist")) note("Clear playlist request sent.");
    else {
      let c = 0;
      rows().forEach((row) => { if (emit("delete", uidOf(row))) c++; });
      note(c ? ("Delete requests sent for " + c + " items.") : "Could not clear playlist.", c ? undefined : "err");
    }
  }, { perm: "playlistclear", confirm: () => {
    const n = rows().length;
    return n ? ("Clear all " + n + " playlist items?") : "";
  }});

  cmd("temp", "temp [N]", "Mark item N (or current) as temporary", "room", (a) => {
    const r = rows();
    const n = a[0] ? parseInt(a[0], 10) : (r.findIndex((x) => x.classList.contains("queue_active")) + 1);
    if (!(n > 0) || n > r.length) return note("Usage: temp [N]", "err");
    const uid = uidOf(r[n - 1]);
    if (emit("setTemp", { uid: uid, temp: true })) {
      note("Set #" + n + " temporary.");
    } else note("Could not set temporary.", "err");
  }, "settemp");

  cmd(["makeperm", "permitem"], "makeperm [N]", "Mark item N (or current) as permanent", "room", (a) => {
    const r = rows();
    const n = a[0] ? parseInt(a[0], 10) : (r.findIndex((x) => x.classList.contains("queue_active")) + 1);
    if (!(n > 0) || n > r.length) return note("Usage: makeperm [N]", "err");
    const uid = uidOf(r[n - 1]);
    if (emit("setTemp", { uid: uid, temp: false })) note("Set #" + n + " permanent.");
    else note("Could not set permanent.", "err");
  }, "settemp");

  cmd(["who", "ulist"], "who", "List users in the channel", "local", () => {
    const names = listUsers();
    if (!names.length) return note("No users found (user list may be hidden — try: users).", "err");
    names.forEach((n) => termOut("ok", n));
    note(names.length + " user(s).");
  });

  cmd("me", "me <text>", "Send a /me action to chat", "chat", (a, raw) => {
    const t = raw || a.join(" ");
    if (!t) return note("Usage: me <text>", "err");
    sendChat("/me " + t);
    note("Action sent.");
  });

  cmd("sp", "sp <text>", "Send a spoiler-hidden chat message", "chat", (a, raw) => {
    const t = raw || a.join(" ");
    if (!t) return note("Usage: sp <text>", "err");
    sendChat("/sp " + t);
    note("Spoiler message sent.");
  });

  // CyTube /say /rcv /shout = big red shout (rank >= 1.5). CyOS `say` remains plain chat send.
  cmd(["shout", "rcv"], "shout <text>", "Send a shout (big red text; rank ≥ 1.5)", "chat", (a, raw) => {
    const t = raw || a.join(" ");
    if (!t) return note("Usage: shout <text>", "err");
    const rank = (window.CLIENT && typeof CLIENT.rank === "number") ? CLIENT.rank : null;
    if (rank !== null && rank < 1.5) return note("Shout requires rank ≥ 1.5.", "err");
    sendChat("/say " + t);
    note("Shout sent.");
  });

  cmd("msg", "msg <user> <text>", "Send a private message", "chat", (a, raw) => {
    if (a.length < 2) return note("Usage: msg <user> <text>", "err");
    const user = a[0];
    const text = raw.slice(raw.toLowerCase().indexOf(user.toLowerCase()) + user.length).trim();
    if (!text) return note("Usage: msg <user> <text>", "err");
    // CyTube: /msg user text via chat, or pm socket
    if (emit("pm", { to: user, msg: text, meta: {} })) note("PM sent to " + user + ".");
    else { sendChat("/msg " + user + " " + text); note("PM attempted via chat."); }
  });

  cmd("afk", "afk", "Toggle AFK status", "chat", () => {
    sendChat("/afk");
    note("AFK toggle sent.");
  });

  // poll / hpoll: "title" or CyTube-style "title,opt1,opt2" or "title | opt1 | opt2"
  function parsePoll(raw) {
    const s = (raw || "").trim();
    if (!s) return null;
    let title, opts;
    if (s.includes("|")) {
      const parts = s.split("|").map((x) => x.trim()).filter(Boolean);
      title = parts.shift();
      opts = parts;
    } else if (s.includes(",")) {
      const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
      title = parts.shift();
      opts = parts;
    } else {
      title = s;
      opts = ["Yes", "No"];
    }
    if (!title) return null;
    if (!opts.length) opts = ["Yes", "No"];
    return { title: title, opts: opts };
  }

  cmd("poll", "poll <title>[,opt…] or title | opt…", "Open a poll (default Yes/No)", "room", (a, raw) => {
    const p = parsePoll(raw || a.join(" "));
    if (!p) return note("Usage: poll <title>[,opt1,opt2]  or  poll title | a | b", "err");
    if (emit("newPoll", { title: p.title, opts: p.opts, obscured: false, timeout: 0 })) {
      note("Poll request sent: " + p.title + " (" + p.opts.length + " options).");
    } else note("Could not open poll (permission or server).", "err");
  }, "pollctl");

  cmd("hpoll", "hpoll <title>[,opt…] or title | opt…", "Open a poll with hidden results", "room", (a, raw) => {
    const p = parsePoll(raw || a.join(" "));
    if (!p) return note("Usage: hpoll <title>[,opt1,opt2]  or  hpoll title | a | b", "err");
    if (emit("newPoll", { title: p.title, opts: p.opts, obscured: true, timeout: 0 })) {
      note("Hidden poll request sent: " + p.title + " (" + p.opts.length + " options).");
    } else note("Could not open poll (permission or server).", "err");
  }, "pollctl");

  cmd("vote", "vote <n>", "Vote on the current poll (1-based option)", "room", (a) => {
    const n = parseInt(a[0], 10);
    if (!(n > 0)) return note("Usage: vote <n>", "err");
    if (emit("vote", { option: n - 1 }) || emit("vote", n - 1)) note("Vote sent for option " + n + ".");
    else note("Could not vote.", "err");
  }, "pollvote");

  cmd("min", "min", "Minimize the focused window", "local", () => minWin(S.focus));
  cmd("max", "max", "Maximize or restore the focused window", "local", () => snapTo(S.focus, "max"));
  cmd("snap", "snap <side>", "Snap focused window: l r tl tr bl br max", "local", (a) => {
    const t = (a[0] || "").toLowerCase();
    if (!t) return note("Usage: snap l|r|tl|tr|bl|br|max", "err");
    snapTo(S.focus, t);
  });
  cmd("hide", "hide <window>", "Close (hide) a window", "local", (a) => {
    const n = (a[0] || "").toLowerCase();
    if (!WIN[n]) return note("Windows: " + DEFS.map(defId).join(", "), "err");
    closeWin(n);
    note("Hid " + n);
  });
  cmd("show", "show <window>", "Open a window without stealing focus logic", "local", (a) => {
    const n = (a[0] || "").toLowerCase();
    if (!WIN[n]) return note("Windows: " + DEFS.map(defId).join(", "), "err");
    openWin(n);
    note("Showed " + n);
  });
  cmd("cycle", "cycle", "Cycle focus through open windows", "local", () => cycle(1));
  cmd("desk", "desk", "Enter desk mode (Esc exits)", "local", () => {
    if (!S.desk) enterDesk();
    note("Desk mode on. Esc returns to Chat.");
  });
  cmd("reload", "reload", "Reload the page (asks first)", "local", () => {
    location.reload();
  }, { confirm: () => "Reload CyTube OS / the page?" });

  cmd("history", "history", "Show recent Terminal commands", "local", () => {
    if (!term.hist.length) return note("History is empty.");
    term.hist.forEach((h, i) => termOut("ok", String(i + 1).padStart(3) + "  " + h));
  });
  cmd("alias", "alias [name=cmd]", "List or set a session alias", "local", (a, raw) => {
    if (!raw || !raw.trim()) {
      const keys = Object.keys(ALIASES);
      if (!keys.length) return note("No aliases. Set with: alias ll=ls");
      keys.forEach((k) => termOut("ok", k + "=" + ALIASES[k]));
      return;
    }
    const m = raw.match(/^([A-Za-z][\w]*)\s*=\s*(.+)$/);
    if (!m) return note("Usage: alias name=command   or  alias  (to list)", "err");
    ALIASES[m[1].toLowerCase()] = m[2].trim();
    note("Alias set: " + m[1].toLowerCase() + "=" + m[2].trim());
  });
  cmd(["time", "date"], "time", "Show local date and time", "local", () => {
    const s = new Date().toLocaleString();
    note(s);
  });
  cmd("ver", "ver", "Show CyTube OS version", "local", () => {
    note("CyTube OS " + VERSION);
  });
  cmd("about", "about", "Short about + feature summary", "local", () => {
    [
      "CyTube OS " + VERSION + " — retro desktop skin for CyTube",
      "Terminal, command palette, windows, playlist + room commands",
      "Registration API: CyOS.registerWindow / registerCommand",
      "Escape: ?plain=1   Help window: help   Command list: cmds"
    ].forEach((ln) => termOut("ok", ln));
    note("CyTube OS " + VERSION);
  });
  cmd("man", "man <cmd>", "Show one-line help for a command", "local", (a) => {
    const n = (a[0] || "").toLowerCase();
    if (!n) return note("Usage: man <cmd>", "err");
    const c = CMD[n];
    if (!c) return note("Unknown command \"" + n + "\". Try cmds.", "err");
    const aliases = Object.keys(CMD).filter((k) => CMD[k] === c || (CMD[k].fn === c.fn && CMD[k].desc === c.desc));
    const line = (c.usage || n).padEnd(22) + (c.desc || "") + (c.scope ? "  [" + c.scope + "]" : "");
    note(line);
    if (aliases.length > 1) termOut("sys", "aliases: " + aliases.sort().join(", "));
    if (c.perm) termOut("sys", "permission: " + c.perm);
    if (c.confirm) termOut("sys", "asks for confirmation before running");
  });
  cmd("quiet", "quiet", "Reduce Terminal noise (errors still show)", "local", () => {
    termQuiet = true;
    note("Quiet mode on.");
  });
  cmd("verbose", "verbose", "Show all Terminal output", "local", () => {
    termQuiet = false;
    note("Verbose mode on.");
  });

  cmd("kick", "kick <user> [reason]", "Kick a user (mod; asks first)", "room", (a, raw) => {
    if (!a[0]) return note("Usage: kick <user> [reason]", "err");
    const user = a[0];
    const reason = a.slice(1).join(" ");
    if (emit("chatMsg", { msg: "/kick " + user + (reason ? " " + reason : ""), meta: {} }) ||
        emit("kick", { name: user, reason: reason })) note("Kick requested for " + user + ".");
    else { sendChat("/kick " + user + (reason ? " " + reason : "")); note("Kick sent via chat."); }
  }, { perm: "kick", confirm: (a) => a[0] ? ("Kick " + a[0] + "?") : "" });

  cmd("ban", "ban <user> [reason]", "Ban a user (mod; asks first)", "room", (a) => {
    if (!a[0]) return note("Usage: ban <user> [reason]", "err");
    const user = a[0], reason = a.slice(1).join(" ");
    sendChat("/ban " + user + (reason ? " " + reason : ""));
    note("Ban command sent for " + user + ".");
  }, { perm: "ban", confirm: (a) => a[0] ? ("Ban " + a[0] + "?") : "" });

  // Native CyTube chat commands (server handlers in chat.js / kickban.js / playlist.js).
  cmd("mute", "mute <user>", "Mute a user in chat (mod; asks first)", "room", (a) => {
    if (!a[0]) return note("Usage: mute <user>", "err");
    sendChat("/mute " + a[0]);
    note("Mute command sent for " + a[0] + ".");
  }, { perm: "mute", confirm: (a) => a[0] ? ("Mute " + a[0] + "?") : "" });

  cmd("smute", "smute <user>", "Shadow-mute a user (mod; asks first)", "room", (a) => {
    if (!a[0]) return note("Usage: smute <user>", "err");
    sendChat("/smute " + a[0]);
    note("Shadow-mute command sent for " + a[0] + ".");
  }, { perm: "mute", confirm: (a) => a[0] ? ("Shadow-mute " + a[0] + "?") : "" });

  cmd(["unmute", "unsmute"], "unmute <user>", "Unmute a user (mod)", "room", (a) => {
    if (!a[0]) return note("Usage: unmute <user>", "err");
    sendChat("/unmute " + a[0]);
    note("Unmute command sent for " + a[0] + ".");
  }, "mute");

  cmd("kickanons", "kickanons", "Kick all anonymous users (mod; asks first)", "room", () => {
    sendChat("/kickanons");
    note("Kick-anons command sent.");
  }, { perm: "kick", confirm: () => "Kick all anonymous users?" });

  cmd(["ipban", "banip"], "ipban <user> [range|wrange] [reason]", "IP-ban a user (mod; asks first)", "room", (a) => {
    if (!a[0]) return note("Usage: ipban <user> [range|wrange] [reason]", "err");
    sendChat("/ipban " + a.join(" "));
    note("IP-ban command sent for " + a[0] + ".");
  }, { perm: "ban", confirm: (a) => a[0] ? ("IP-ban " + a[0] + "?") : "" });

  cmd(["clearchat", "chatclear"], "clearchat", "Clear the channel chat buffer (mod; asks first)", "room", () => {
    sendChat("/clear");
    note("Chat clear command sent.");
  }, { perm: "chatclear", confirm: () => "Clear the channel chat buffer for everyone?" });

  cmd("clean", "clean <user>", "Remove playlist items queued by user (mod; asks first)", "room", (a) => {
    if (!a[0]) return note("Usage: clean <user>", "err");
    sendChat("/clean " + a.join(" "));
    note("Clean command sent for " + a[0] + ".");
  }, { perm: "playlistdelete", confirm: (a) => a[0] ? ("Remove all playlist items from " + a[0] + "?") : "" });

  cmd("cleantitle", "cleantitle <title>", "Remove playlist items matching title (mod; asks first)", "room", (a, raw) => {
    const t = (raw || a.join(" ")).trim();
    if (!t) return note("Usage: cleantitle <title>", "err");
    sendChat("/cleantitle " + t);
    note("Clean-title command sent.");
  }, { perm: "playlistdelete", confirm: (a, raw) => {
    const t = (raw || a.join(" ")).trim();
    return t ? ('Remove playlist items matching "' + t + '"?') : "";
  }});

  // Rank is not a CHANNEL.perms key — CyTube requires effectiveRank >= 3 (channel admin).
  cmd("rank", "rank <user> <n>", "Set a user's channel rank (admin; asks first)", "room", (a) => {
    if (a.length < 2) return note("Usage: rank <user> <n>  (n ≥ 1, below your rank)", "err");
    const user = a[0];
    const n = parseInt(a[1], 10);
    if (!(n >= 1)) return note("Rank must be a positive integer ≥ 1.", "err");
    const my = (window.CLIENT && typeof CLIENT.rank === "number") ? CLIENT.rank : null;
    if (my !== null && my < 3) return note("Setting ranks requires channel admin (rank ≥ 3).", "err");
    sendChat("/rank " + user + " " + n);
    note("Rank command sent: " + user + " → " + n + ".");
  }, { confirm: (a) => (a.length >= 2 ? ("Set " + a[0] + "'s rank to " + a[1] + "?") : "") });

  // Site-admin only (≥ 255). Prefer setChannelRank socket; fall back to /rank chat.
  // Rank gate lives in both confirm (skip y/n when denied) and fn (authoritative block).
  cmd(["siterank", "srank"], "siterank <user> <n>", "Set channel rank (site admin only; asks first)", "room", (a) => {
    if (a.length < 2) return note("Usage: siterank <user> <n>", "err");
    const user = a[0];
    const n = parseInt(a[1], 10);
    if (!(n >= 1)) return note("Rank must be a positive integer ≥ 1.", "err");
    const my = (window.CLIENT && typeof CLIENT.rank === "number") ? CLIENT.rank : null;
    if (my === null || my < 255) {
      return note("siterank requires site admin (rank ≥ 255). Channel admins: use rank.", "err");
    }
    if (emit("setChannelRank", { name: user, rank: n })) {
      note("Site rank change requested: " + user + " → " + n + ".");
    } else {
      sendChat("/rank " + user + " " + n);
      note("Site rank command sent via chat: " + user + " → " + n + ".");
    }
  }, { confirm: (a) => {
    const my = (window.CLIENT && typeof CLIENT.rank === "number") ? CLIENT.rank : null;
    if (my === null || my < 255) return ""; // fn will emit the denial note
    return a.length >= 2 ? ("[site] Set " + a[0] + "'s rank to " + a[1] + "?") : "";
  }});

  cmd(["drink", "d"], "drink [N] [message]", "Call drinks (CyTube /d; perm drink)", "room", (a, raw) => {
    // Preserve CyTube forms: /d, /d3, /d-1, /d message, /d3 message
    const t = (raw || a.join(" ")).trim();
    if (!t) {
      sendChat("/d");
      note("Drink call sent.");
      return;
    }
    // If first token is a number (optional leading +), use /dN rest
    const m = t.match(/^([+-]?\d+)(?:\s+(.*))?$/);
    if (m) {
      sendChat("/d" + m[1] + (m[2] ? " " + m[2] : ""));
    } else {
      sendChat("/d " + t);
    }
    note("Drink call sent.");
  }, "drink");

  // CyTube /a — site-admin only (server checks globalRank >= 255). Optional !icon- / !label- tokens.
  cmd(["a", "adminflair"], "a [!icon-…] [!label-…] <text>", "Site-admin flair message (rank ≥ 255)", "chat", (a, raw) => {
    const t = (raw || a.join(" ")).trim();
    if (!t) return note("Usage: a [!icon-name] [!label-name] <text>", "err");
    const rank = (window.CLIENT && typeof CLIENT.rank === "number") ? CLIENT.rank : null;
    if (rank !== null && rank < 255) {
      return note("Site-admin flair requires global rank ≥ 255.", "err");
    }
    sendChat("/a " + t);
    note("Admin-flair message sent.");
  });

  // unban is a socket event ({id, name} from the ban list), not a chat command: "/unban x" would post as public chat.

  let banlist = null, banWaiter = null;
  cmd("unban", "unban <user>", "Unban a user (mod; asks first)", "room", (a) => {
    const want = (a[0] || "").toLowerCase();
    if (!want) return note("Usage: unban <user>", "err");
    banlist = null;
    if (!emit("requestBanlist")) return;
    note("Requesting the ban list…");
    const t = setTimeout(() => { banWaiter = null; note("The server did not send a ban list (permission or connection).", "err"); }, 4000);
    banWaiter = () => {
      clearTimeout(t); banWaiter = null;
      const e = (banlist || []).find((x) => String(x.name || "").toLowerCase() === want);
      if (!e) return note('No ban entry named "' + a[0] + '".', "err");
      ask("Unban " + e.name + "?", () => {
        if (emit("unban", { id: e.id, name: e.name })) note("Unban request sent for " + e.name + ". Ban list confirmation pending.");
      });
    };
  }, "ban");

  // CyTube's client sends togglePlaylistLock (no argument) and the server answers with setPlaylistLocked.
  // The current state lives in CHANNEL.openqueue, so we only toggle when it would change the state we want.
  function setLock(wantLocked) {
    const cur = (window.CHANNEL && typeof CHANNEL.openqueue === "boolean") ? !CHANNEL.openqueue : null;
    if (cur === null) return note("Cannot read the playlist lock state; nothing sent. Use the page's lock button.", "err");
    if (cur === wantLocked) return note("The playlist is already " + (wantLocked ? "locked" : "unlocked") + ".");
    if (emit("togglePlaylistLock")) note("Playlist " + (wantLocked ? "lock" : "unlock") + " requested. Confirmation pending.");
  }
  cmd("lock", "lock", "Lock the playlist", "room", () => setLock(true), "playlistlock");
  cmd("unlock", "unlock", "Unlock the playlist", "room", () => setLock(false), "playlistlock");

  cmd("motd", "motd", "Show channel MOTD / announcement if present", "local", () => {
    const el = q("#motd, .motd, #announcement, .announcement");
    const t = el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    if (!t) return note("No MOTD found on this page.", "err");
    termOut("ok", t);
    note(shorten(t, 80));
  });

  cmd("css", "css", "Open Channel Settings (CSS) if available", "local", () => {
    const a = q('a[href*="css"], #showcssettings, a[onclick*="css"]');
    const btn = [...document.querySelectorAll("a, button")].find((el) => /channel settings|css/i.test(el.textContent || ""));
    if (btn) { btn.click(); note("Opened settings UI."); }
    else note("Use the Channel Settings menu in the navbar.", "err");
  });

  cmd("js", "js", "Open Channel Settings (JS) if available", "local", () => {
    const btn = [...document.querySelectorAll("a, button")].find((el) => /javascript|channel settings/i.test(el.textContent || ""));
    if (btn) { btn.click(); note("Opened settings UI."); }
    else note("Use the Channel Settings menu in the navbar.", "err");
  });

  cmd("roll", "roll [NdM]", "Roll dice (default 1d6); prints locally", "local", (a) => {
    const spec = (a[0] || "1d6").toLowerCase();
    const m = spec.match(/^(\d{1,2})d(\d{1,3})$/);
    if (!m) return note("Usage: roll [NdM]  e.g. roll 2d20", "err");
    const n = Math.min(20, parseInt(m[1], 10)), sides = Math.min(1000, parseInt(m[2], 10));
    const rolls = [];
    let sum = 0;
    for (let i = 0; i < n; i++) { const v = 1 + Math.floor(Math.random() * sides); rolls.push(v); sum += v; }
    const line = "roll " + n + "d" + sides + " → [" + rolls.join(", ") + "] = " + sum;
    note(line);
  });

  cmd("pick", "pick a|b|c", "Pick a random option (separate with |)", "local", (a, raw) => {
    const parts = (raw || a.join(" ")).split("|").map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) return note("Usage: pick red|green|blue", "err");
    const choice = parts[Math.floor(Math.random() * parts.length)];
    note("Picked: " + choice);
  });

  cmd("countdown", "countdown <sec>", "Countdown in Terminal then notify", "local", (a) => {
    const sec = parseInt(a[0], 10);
    if (!(sec > 0) || sec > 600) return note("Usage: countdown <seconds> (1-600)", "err");
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    let left = sec;
    termOut("sys", "Countdown " + left + "s …");
    countdownTimer = setInterval(() => {
      left--;
      if (left <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        termOut("ok", "Countdown done.");
        note("Countdown finished.");
      } else if (left <= 5 || left % 10 === 0) {
        termOut("sys", String(left) + "…");
      }
    }, 1000);
  });

  cmd("mcdonalds", "mcdonalds", "Open the I Love McDonald's party window", "local", () => {
    if (WIN.mcdonalds) { openWin("mcdonalds"); return; }
    // Register on the fly if not present
    if (typeof registerWindow === "function") {
      registerWindow({
        id: "mcdonalds",
        title: "I ♥ McDonald's",
        icon: "M",
        defaultOpen: true,
        mount: (body) => {
          body.innerHTML = "<p style=\"margin:0 0 8px\"><b>Type the phrase to dismiss:</b></p>" +
            "<p style=\"margin:0 0 8px;font-weight:700\">I love McDonald's</p>" +
            "<input type=\"text\" class=\"cyos-mcd-in\" style=\"width:100%;box-sizing:border-box;border:2px solid var(--fg);background:var(--bg);color:var(--fg);padding:4px 6px;font:inherit\" placeholder=\"type the phrase\" />" +
            "<p class=\"cyos-mcd-msg\" style=\"margin:8px 0 0;opacity:.8\"></p>";
          const inp = body.querySelector(".cyos-mcd-in");
          const msg = body.querySelector(".cyos-mcd-msg");
          const target = "i love mcdonald's";
          inp.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (inp.value.trim().toLowerCase() === target) {
                msg.textContent = "Accepted.";
                setTimeout(() => closeWin("mcdonalds"), 400);
              } else {
                msg.textContent = "Nope. Type exactly: I love McDonald's";
              }
            }
          });
          setTimeout(() => inp.focus(), 50);
        }
      });
      // A saved closed state wins inside registerWindow, but running this command always means "open it".
      if (WIN.mcdonalds) openWin("mcdonalds");
    } else note("Registration API not ready.", "err");
  });



  /* ---------- public registration API (v0.5.4) ---------- */
  function ensureDefaultState(id, defaultOpen) {
    if (S.open[id] === undefined) S.open[id] = !!defaultOpen;
    if (S.min[id] === undefined) S.min[id] = false;
    if (S.alphas[id] === undefined) S.alphas[id] = 1;
    if (!S.rects[id]) {
      const W = Math.min(480, Math.max(280, innerWidth - 2 * G - ICON));
      const H = Math.min(360, Math.max(160, innerHeight - MB - 80));
      S.rects[id] = {
        x: G + Math.floor(Math.random() * 40),
        y: MB + G + Math.floor(Math.random() * 40),        w: W, h: H
      };
    }
  }
  function addDesktopIcon(def) {    const desktop = ui.desktop || q("#cyos-desktop");
    if (!desktop) return;
    const icons = desktop.querySelector(".cyos-icons") || desktop;
    const id = defId(def);
    if (icons.querySelector('[data-w="' + id + '"]')) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cyos-ico";
    btn.dataset.w = id;
    btn.title = "Open " + defTitle(def);
    btn.innerHTML = "<b>" + defIcon(def) + "</b><span>" + defTitle(def) + "</span>";
    icons.appendChild(btn);
  }

  function addMobileTab(def) {
    const tabs = ui.root && q(".cyos-tabs", ui.root);
    const id = defId(def);
    if (!tabs || tabs.querySelector('[data-w="' + id + '"]')) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.w = id;
    btn.title = "Switch to " + defTitle(def) + " window";
    btn.textContent = defTitle(def);
    tabs.appendChild(btn);
  }

  function registerWindow(spec) {
    if (!spec || !spec.id) {
      console.error("[cyos] registerWindow requires { id, ... }");
      return false;
    }
    const id = String(spec.id);
    if (WIN[id] || DEFS.some((d) => defId(d) === id)) {
      console.warn("[cyos] window already registered:", id);
      return false;
    }
    const entry = {
      id,
      title: spec.title || id,
      icon: spec.icon || "\u25A1",
      selector: spec.selector || null,
      mount: typeof spec.mount === "function" ? spec.mount : null,
      bodyClass: spec.bodyClass || "",
      defaultOpen: !!spec.defaultOpen
    };
    DEFS.push(entry);
    // Saved state (from a previous page load) wins over defaultOpen, so a window you closed stays closed.
    const hadState = S.open[id] !== undefined;
    ensureDefaultState(id, entry.defaultOpen);

    // If the desktop is already built, create the window chrome + icon now
    if (ui.root) {
      makeWindow(entry);
      addDesktopIcon(entry);
      addMobileTab(entry);
      if (hadState) refresh();
      else if (entry.defaultOpen) openWin(id);
      else { S.open[id] = false; refresh(); }
      save();
    }
    // Auto-register a simple open command if none was provided
    if (!CMD[id] && !spec.noCommand) {
      cmd(id, id, "Open the " + entry.title + " window", "local", () => openWin(id));
    }
    return true;
  }

  function registerCommand(spec) {
    if (!spec) return false;
    const names = spec.names || spec.name;
    if (!names) {
      console.error("[cyos] registerCommand requires names/name");
      return false;
    }
    const usage = spec.usage || (Array.isArray(names) ? names[0] : names);
    const desc = spec.desc || "";
    const scope = spec.scope || "local";
    const fn = typeof spec.fn === "function" ? spec.fn : () => {};
    const perm = spec.perm || null;
    cmd(names, usage, desc, scope, fn, perm);
    return true;
  }

  function publishAPI() {
    window.CyOS = {
      version: VERSION,
      registerWindow,
      registerCommand,
      // thin, stable helpers for plugins
      openWin, closeWin, toggleWin, focusWin, minWin,
      getAlpha, setAlpha, applyAlpha,
      note, log, run, dispatch,
      getWindows: () => DEFS.map((d) => ({ id: defId(d), title: defTitle(d), icon: defIcon(d), alpha: getAlpha(defId(d)) })),
      getCommands: () => Object.keys(CMD).filter((n) => CMD[n].usage).map((n) => ({
        name: n, usage: CMD[n].usage, desc: CMD[n].desc, scope: CMD[n].scope
      }))
    };
  }


  function dispatch(name, args, raw, echo, display) {
    const c = CMD[String(name || "").toLowerCase()];
    if (!c) { note('Unknown command "' + name + '".', "err"); return false; }
    if (echo !== false && c.usage) log("echo", GLYPH[c.scope] + " " + (display || (name + (raw ? " " + raw : ""))));
    c.fn(args || [], raw || "");
    return true;
  }

  function run(text) {
    const t = text.trim();
    if (!t) return;
    if (t[0] === "/") { log("echo", GLYPH.chat + " " + t); return sendChat(t); }
    const parts = t.split(/\s+/), name = parts.shift().toLowerCase();
    if (!CMD[name]) return note('Unknown command "' + name + '". Try help, or say <text> to chat.', "err");
    return dispatch(name, parts, t.slice(name.length).trim(), true, t);
  }

  function hints() {
    const v = pal.input.value.trim().toLowerCase(), tok = v.split(/\s+/)[0];
    const items = Object.keys(CMD).filter((n) => CMD[n].usage && (!tok || n.startsWith(tok)));
    const lines = items.slice(0, 9).map((n) => {
      const c = CMD[n], status = c.perm ? permissionStatus(c.perm) : true;
      const suffix = status === false ? "  (permission denied)" : status === null ? (c.perm ? "  (permission unknown; blocked)" : "") : "";
      return GLYPH[c.scope] + " " + c.usage.padEnd(20) + c.desc + suffix;
    });
    pal.hint.textContent = lines.length ? lines.join("\n") : "No matching command. Text starting with / goes to chat.";
  }

  function openPalette(pre) {
    S.desk = false; S.move = false; flag();
    pal.on = true;
    pal.el.classList.add("on");
    pal.input.value = pre || "";
    pal.input.focus();
    hints();
  }

  function closePalette() {
    pal.on = false;
    pal.el.classList.remove("on");
    pal.input.blur();
  }

  function enterDesk() {
    S.desk = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (S.focus === "playlist" && S.sel < 0) select(0);
    flag();
  }

  function exitDesk() {
    S.desk = false; S.move = false; flag();
    if (!mobile()) { const l = q("#chatline"); if (l) l.focus({ preventScroll: true }); }
  }

  function wirePalette() {
    pal.input.addEventListener("input", hints);
    pal.input.addEventListener("blur", () => { setTimeout(() => { if (pal.on && document.activeElement !== pal.input) closePalette(); }, 150); });
    pal.input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); closePalette(); exitDesk(); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const v = pal.input.value;
        closePalette();
        if (v.trim()) pal.hist.push(v);
        pal.hi = pal.hist.length;
        run(v);
        exitDesk();
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        if (!pal.hist.length) return;
        pal.hi = clamp(pal.hi + (e.key === "ArrowUp" ? -1 : 1), 0, pal.hist.length);
        pal.input.value = pal.hist[pal.hi] || "";
      } else if (e.key === "Tab") {
        e.preventDefault();
        const tok = pal.input.value.trim().toLowerCase();
        if (tok.includes(" ")) return;
        const m = Object.keys(CMD).filter((n) => CMD[n].usage && n.startsWith(tok));
        if (m.length === 1) pal.input.value = m[0] + " ";
        hints();
      }
    });
  }

  /* ---------- keyboard ---------- */
  function deskKey(e) {
    const k = e.key, lk = k.length === 1 ? k.toLowerCase() : k, w = S.focus;
    let used = true;

    if (S.move) {
      const r = S.rects[w];
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
      if (d && r) {
        delete r.sn; delete r.pv; delete r.pz;
        if (e.shiftKey) { r.w = Math.max(200, r.w + d[0] * 24); r.h = Math.max(110, r.h + d[1] * 24); }
        else { r.x += d[0] * 24; r.y += d[1] * 24; }
        if (S.mode === "split") S.mode = "custom";
        place(w); save();
      } else if (k === "Enter" || lk === "m") { S.move = false; flag(); }
      else used = false;
      if (used) { e.preventDefault(); e.stopPropagation(); }
      return;
    }

    switch (lk) {
      case "c": dispatch("chat", [], "", false); exitDesk(); break;
      case "v": dispatch("video", [], "", false); break;
      case "p": dispatch("list", [], "", false); break;
      case "o": dispatch("console", [], "", false); break;
      case "y": dispatch("terminal", [], "", false); break;
      case "Tab": cycle(e.shiftKey ? -1 : 1); break;
      case "m": if (!mobile()) { S.move = true; flag(); } break;
      case "[": snap(w, "l"); break;
      case "]": snap(w, "r"); break;
      case "z": zoom(w); break;
      case "1": snapTo(w, "tl"); break;
      case "2": snapTo(w, "tr"); break;
      case "3": snapTo(w, "bl"); break;
      case "4": snapTo(w, "br"); break;
      case "r": restoreWin(w); break;
      case "-": minWin(w); break;
      case "t": dispatch("theater", [], "", false); break;
      case "x": dispatch("pip", [], "", false); break;
      case "d": dispatch("dock", [], "", false); break;
      case "s": dispatch("split", [], "", false); break;
      case "l": dispatch("layout.cycle", [], "", false); break;
      case "u": dispatch("users", [], "", false); break;
      case "n": dispatch("nav", [], "", false); break;
      case "a": openPalette("add "); break;
      case "/": case ":": dispatch("palette.toggle", [], "", false); break;
      case "?": case "h": dispatch("help.toggle", [], "", false); break;
      case "i": exitDesk(); break;
      case "Enter": if (w === "playlist" && S.sel >= 0) jump(S.sel + 1); else exitDesk(); break;
      case "ArrowDown": case "j": if (w === "playlist") select(1); else if (w === "help") ui.helpPre.scrollTop += 60; else used = false; break;
      case "ArrowUp": case "k": if (w === "playlist") select(-1); else if (w === "help") ui.helpPre.scrollTop -= 60; else used = false; break;
      case "Delete": case "Backspace": if (w === "playlist" && S.sel >= 0) del(S.sel + 1); else used = false; break;
      default: used = false;
    }
    if (used) { e.preventDefault(); e.stopPropagation(); }
  }

  function menuKey(e) {
    const root = ui.root;
    if (!root || e.ctrlKey || e.metaKey || e.altKey) return false;
    const menuButtons = [...root.querySelectorAll("button[data-menu]")].filter((b) => b.getClientRects().length && getComputedStyle(b).display !== "none");
    const active = document.activeElement;
    const activeMenuButton = menuButtons.includes(active) ? active : null;
    const dropdown = active && active.closest ? active.closest(".cyos-dropdown.on") : null;
    const items = dropdown ? [...dropdown.querySelectorAll('[role="menuitem"]')] : [];
    const idx = items.indexOf(active);
    if (dropdown) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); e.stopPropagation();
        const next = e.key === "ArrowDown" ? (idx + 1) % items.length : (idx <= 0 ? items.length - 1 : idx - 1);
        if (items[next]) items[next].focus();
        return true;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault(); e.stopPropagation();
        const current = menuButtons.indexOf(openMenu);
        const delta = e.key === "ArrowRight" ? 1 : -1;
        const next = menuButtons[(current + delta + menuButtons.length) % menuButtons.length];
        showMenu(next, true);
        return true;
      }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeMenus(true); return true; }
      if (e.key === "Enter" || e.key === " ") {
        if (idx >= 0) { e.preventDefault(); e.stopPropagation(); items[idx].click(); return true; }
      }
      if (e.key.length === 1) {
        const letter = e.key.toLowerCase();
        const match = items.find((b) => b.dataset.key === letter);
        if (match) { e.preventDefault(); e.stopPropagation(); match.click(); return true; }
      }
      return false;
    }
    if (e.key === "Escape" && openMenu) { e.preventDefault(); e.stopPropagation(); closeMenus(true); return true; }
    if (activeMenuButton && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault(); e.stopPropagation();
      const i = menuButtons.indexOf(activeMenuButton), delta = e.key === "ArrowRight" ? 1 : -1;
      menuButtons[(i + delta + menuButtons.length) % menuButtons.length].focus();
      return true;
    }
    if (activeMenuButton && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault(); e.stopPropagation(); showMenu(activeMenuButton, true); return true;
    }
    if (activeMenuButton && e.key.length === 1) {
      const match = menuButtons.find((b) => b.dataset.access === e.key.toLowerCase());
      if (match) { e.preventDefault(); e.stopPropagation(); showMenu(match, true); return true; }
    }
    return false;
  }

  function onKey(e) {
    if (S.pending && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "y" || k === "n" || k === "escape") { e.preventDefault(); e.stopPropagation(); answer(k === "y"); return; }
    }
    if (pal.on) return;
    // F10 is the dedicated keyboard entry point for the CyTube OS menu bar.
    // Keep Shift+F10 available for the browser's conventional context-menu behavior.
    if (e.key === "F10" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      const root = ui.root;
      const first = root && [...root.querySelectorAll("button[data-menu]")].find((b) =>
        b.getClientRects().length && getComputedStyle(b).display !== "none");
      if (first) {
        e.preventDefault(); e.stopPropagation();
        if (openMenu) closeMenus(false);
        first.focus();
        return;
      }
    }
    if (menuKey(e)) return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
      e.preventDefault(); e.stopPropagation(); openPalette(); return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector(".modal.in,.modal.show")) return;
    const t = e.target;
    const typing = !!t && (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName || "") || t.isContentEditable);
    const inChat = !!t && t.id === "chatline";

    if (e.key === "Escape") {
      if (typing && !inChat) return;
      e.preventDefault(); e.stopPropagation();
      if (S.move) { S.move = false; flag(); return; }
      if (S.desk) exitDesk(); else enterDesk();
      return;
    }
    if (!S.desk || typing) return;
    deskKey(e);
  }

  /* ---------- init ---------- */
  function init() {
    const style = document.createElement("style");
    style.id = "cyos-style";
    style.textContent = CSS;
    document.head.appendChild(style);
    document.body.classList.add("cyos");

    const con = document.createElement("div");
    con.id = "cyos-console";
    con.innerHTML = '<div class="cyos-log" role="log" aria-live="polite"></div>';
    document.body.appendChild(con);
    ui.log = con.firstChild;

    const hw = document.createElement("div");
    hw.id = "cyos-help";
    hw.innerHTML = '<pre class="cyos-helptext" tabindex="0"></pre>';
    document.body.appendChild(hw);
    ui.helpPre = hw.firstChild;
    ui.helpPre.textContent = HELP;

    const termEl = document.createElement("div");
    termEl.id = "cyos-terminal";
    termEl.innerHTML =
      '<div class="cyos-term-status" aria-hidden="true"></div>' +
      '<div class="cyos-term-log" role="log" aria-live="polite"></div>' +
      '<div class="cyos-term-line">' +
      '<span class="cyos-term-ps" aria-hidden="true">$</span>' +
      '<input type="text" class="cyos-term-input" autocomplete="off" autocapitalize="off" spellcheck="false" ' +
      'aria-label="Terminal command" placeholder="cmd · help · cmds · status" />' +
      "</div>";
    document.body.appendChild(termEl);
    ui.termLog = termEl.querySelector(".cyos-term-log");
    ui.termInput = termEl.querySelector(".cyos-term-input");
    ui.termStatus = termEl.querySelector(".cyos-term-status");
    termWrite("sys", "CyTube OS Terminal " + VERSION + " — same dispatcher as Ctrl+K and /chat.");
    termWrite("sys", "Density: status strip above · flag = mode·focus·lock·hints. Try: status, wins, ls, cmds.");

    if (ui.termInput) {
      ui.termPs = termEl.querySelector(".cyos-term-ps");
      ui.termInput.addEventListener("keydown", (e) => {
        // Pending confirmation: stay in Terminal — y/n/Esc or typed yes/no + Enter
        if (S.pending) {
          const k = e.key.toLowerCase();
          if (k === "y" || k === "n" || k === "escape") {
            e.preventDefault();
            e.stopPropagation();
            ui.termInput.value = "";
            answer(k === "y");
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            const v = ui.termInput.value.trim().toLowerCase();
            ui.termInput.value = "";
            if (v === "y" || v === "yes") answer(true);
            else if (v === "n" || v === "no" || v === "") answer(false);
            else termWrite("sys", "Please answer y or n.");
            return;
          }
          // Allow typing y/n as text then Enter; block history while pending
          if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); return; }
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          const v = ui.termInput.value;
          ui.termInput.value = "";
          termRun(v);
          return;
        }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          if (!term.hist.length) return;
          term.hi = clamp(term.hi + (e.key === "ArrowUp" ? -1 : 1), 0, term.hist.length);
          ui.termInput.value = term.hist[term.hi] || "";
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          ui.termInput.blur();
          exitDesk();
        }
      });
      // Focusing the terminal input should leave desk mode so typing works
      ui.termInput.addEventListener("focus", () => {
        if (S.desk) { S.desk = false; S.move = false; flag(); }
        S.focus = "terminal";
      });
    }

    DEFS.forEach(makeWindow);
    carve();
    buildRoot();
    wirePalette();

    layout("split");
    const saved = load();
    if (saved) {
      if (saved.theme === "mac" || saved.theme === "term") S.theme = saved.theme;

      if (saved.top && typeof saved.top === "object") S.top = saved.top;
      if (saved.menuWins === "focus" || saved.menuWins === "open") S.menuWins = saved.menuWins;
      if (saved.alphas && typeof saved.alphas === "object") {
        Object.keys(saved.alphas).forEach((k) => {
          const v = Number(saved.alphas[k]);
          if (v >= 0 && v <= 1) S.alphas[k] = v;
        });
      } else if (typeof saved.alpha === "number" && saved.alpha >= 0 && saved.alpha <= 1) {
        // migrate v0.5.9 global alpha onto core windows once
        ["chat", "video", "playlist", "console", "terminal", "help"].forEach((k) => { S.alphas[k] = saved.alpha; });
      }
      if (typeof saved.sysmsg === "boolean") S.sysmsg = saved.sysmsg;
      if (saved.rects && saved.open) {
        Object.assign(S.rects, saved.rects);
        Object.assign(S.open, saved.open);
        if (saved.min && typeof saved.min === "object") S.min = saved.min;
        // v0.5.13: window id list → playlist (migrate saved state once)
        ["open", "min", "rects", "alphas"].forEach((bag) => {
          const o = bag === "alphas" ? S.alphas : S[bag];
          if (o && o.list !== undefined && o.playlist === undefined) {
            o.playlist = o.list;
            delete o.list;
          }
        });
        // v0.4.x saved maximize state as z0; fold it into the shared snap model (sn = target, pv = previous geometry).
        Object.values(S.rects).forEach((r) => { if (r && r.z0) { r.pv = r.z0; r.sn = "max"; delete r.z0; } });
        S.mode = ["split", "custom", "theater", "pip"].includes(saved.mode) ? saved.mode : "custom";
      }
      // alphas may exist without rects/open (older saves)
      if (S.alphas && S.alphas.list !== undefined && S.alphas.playlist === undefined) {
        S.alphas.playlist = S.alphas.list;
        delete S.alphas.list;
      }
    }
    if (S.focus === "list") S.focus = "playlist";
    if (S.tab === "list") S.tab = "playlist";
    if (!WIN.chat) S.focus = Object.keys(WIN)[0] || "chat";
    if (!WIN[S.tab]) S.tab = S.focus;

    // Typing /add <url>, /skip, /jump 3 ... in chat runs our command instead of sending it as a message.
    // Slash commands we don't own (/me, /sp, /kick ...) still go to CyTube untouched.
    const chatLine = q("#chatline");
    if (chatLine) {
      chatLine.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || e.shiftKey) return;
        // BARE_ADD (disabled). To let "add <url>" / "next <url>" work without a slash, remove the // markers.
        // It only fires for add/next plus a URL CyTube can parse, so normal chat is never hijacked.
        // const bare = chatLine.value.trim().match(/^(add|next)\s+<?(https?:\/\/\S+?)>?$/i);
        // if (bare && typeof parseMediaLink === "function" && (safe(() => parseMediaLink(bare[2])) || {}).id) {
        //   e.preventDefault(); e.stopImmediatePropagation();
        //   chatLine.value = ""; run(bare[1] + " " + bare[2]); return;
        // }
        const m = chatLine.value.trim().match(/^\/(\S+)/);
        // clear and say exist locally with different meanings than CyTube's /clear (wipe channel chat) and
        // /say (shout), so those two always go to CyTube untouched. Use clearchat / shout here instead.
        if (!m || !CMD[m[1].toLowerCase()] || NATIVE_SLASH.has(m[1].toLowerCase())) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const text = chatLine.value.trim().slice(1);
        chatLine.value = "";
        run(text);
      }, true);
    }

    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", (e) => {
      const target = e.target;
      const win = target && target.closest ? target.closest(".cyos-win") : null;
      if (win) {
        const entry = Object.keys(WIN).find((id) => WIN[id].el === win);
        if (entry && S.focus !== entry) {
          S.focus = entry;
          raiseWin(entry);
          refresh();
          rebuildWindowMenus();
        }
      }
      if (S.desk && target && target.matches &&
          target.matches("input,textarea,select,[contenteditable='true']")) {
        S.desk = false; S.move = false; flag();
      }
    });
    if (!hookSocket()) { let n = 0; const t = setInterval(() => { if (hookSocket() || ++n > 40) clearInterval(t); }, 500); }

    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(refresh, 100); });

    focusWin(S.focus);
    rebuildWindowMenus();
    if (!mobile() && q("#chatline")) q("#chatline").focus({ preventScroll: true });
    publishAPI();
    note("CyTube OS " + VERSION + ". Menu: focused window · top [win] always-on-top · menumode focus|open");
  }

  let tries = 0;
  const boot = () => {
    if (document.body && (q("#chatwrap") || q("#videowrap"))) {
      try { init(); } catch (err) {
        console.error("[cyos] init failed", err);
        document.body.classList.remove("cyos");
        window.__cyos = false;
      }
      return true;
    }
    return false;
  };
  if (!boot()) {
    const t = setInterval(() => { if (boot() || ++tries > 75) clearInterval(t); }, 200);
  }
})();