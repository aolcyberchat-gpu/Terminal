/* ============================================================
   CyTube OS - v0.5.20
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
   v0.6.0: Local storage layer (IndexedDB, per channel, memory fallback) + Notes scratch-pad window
           (registered through the public Window API); store / notes commands; CyOS.store for plugins
   v0.6.1: Terminal input hardening for Android keyboards: Enter is also accepted by keyCode/keyup when the
           keyboard reports keydown as "Unidentified"/229, plus a tap-to-run button on touch screens
   v0.6.2: Command palette (Ctrl+K) gets the same Enter hardening as the Terminal; the menu bar no longer
           shows the mode/focus/hints strip (it only shows DESK or MOVE while those modes are active;
           the full line stays in the Terminal status strip and `status`)
   v0.12.0: Scheduler window + `sched` commands. Draft schedules in IndexedDB; add/list/rm/clear;
            duration probe; export JSON with createdBy (login only) + createdAt/updatedAt (UTC Z).
            Optional `sched apply` previews the draft in Broadcast without publishing.
   v0.11.2: CRT themes — amber phosphor and cyan blue (`theme amber|cyan`), plus existing mac/term.
            `theme` with no args cycles mac → term → amber → cyan.
   v0.11.1: Built-in dial stations Liquid TV, Ball World, FISH ON!, CyNews load shared schedules from
            github.com/duckwerks/cyos-channels (jsDelivr). Sample + HLS Test remain local demos.
   v0.11.0: Broadcast refine + HLS/MP4/WebM. hls.js on demand for m3u8 (hls:URL or bare .m3u8);
            stronger direct file playback (mp4/webm/ogg) with drift correction; Broadcast desk keys
            (1–9 channel, t tune, m mute when focused); richer status hints; demo channel with public
            HLS test stream; clearer slate/error messages. Built on the v0.10 multi-channel dial.
   v0.10.0: Multi-channel Broadcast + TV guide. Named channels (Liquid TV, Ball World, FISH ON!, CyNews,
            Sample) with a dial strip in the Broadcast window; switch by click or `bcast ch <name|n>`.
            Guide strip shows what's on + upcoming by wall-clock time. Channel directory is built-in and
            extensible (`bcast ch add <name> <url>`, `bcast ch rm`). `bcast guide [n]` dumps the guide.
            Schedules still come from public URLs (GitHub raw, Gist, etc.) so everyone shares the same source.
            Existing fixed-time engine, sample, load, tune unchanged.
   v0.9.0: Broadcast player. Tune in to watch the schedule live inside the Broadcast window: YouTube (embedded
           player) and direct video files. Joins mid-program at the computed position, switches at the exact
           second, corrects drift, shows a slate for off-air / unplayable videos. bcast tune|untune|mute|
           unmute|vol|duck. Per-window Broadcast menu. `bcast sample` is now a real looping YouTube demo.
   v0.8.0: Broadcast (step 1): a fixed-time schedule engine (pure function of schedule + clock: cuts,
           resumes, gaps, loop) and a read-only Broadcast window with a desktop icon: ON AIR, progress, Up
           Next. `bcast load <url>|sample|now|next|log|status|clear`. No playback yet. Compact desktop
           icons on short screens so all icons stay reachable.
   v0.7.1: Palette parity with the Terminal on Android: same input attributes (enterkeyhint, autocorrect off),
           a tap-to-run button on touch screens, and it no longer closes on a stray blur (only on an outside
           tap, Esc or run). Small event trace for the palette and Terminal inputs: `trace` prints it.
   v0.7.0: One window model. Theater and PiP are ordinary layout presets (plain geometry; no special CSS, no
           hidden icons, alpha comes only from `alpha`). New View > Tile open windows / Tile all windows
           (tile, tileall, Desk key G / Shift+G). Minimize and the bottom-left chips are gone: the left box
           closes (hides, never destroys) and the right box zooms (maximize / restore). `dock` now goes back
           to the layout before the last preset. Desk key W closes the focused window.
   ============================================================ */
(() => {
  "use strict";

  const VERSION = "0.12.0";
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
  // Some Android keyboards report Enter as key "Unidentified" / keyCode 229 on keydown, so Enter is recognised
  // by key, keyCode or code everywhere an input listens for it.
  // Small ring buffer of recent palette / Terminal input events, so a device that misbehaves can be diagnosed
  // from the Terminal (`trace`) without dev tools. Nothing here changes behaviour.
  const TRACE = [];
  const trace = (src, what, e) => {
    const a = document.activeElement;
    TRACE.push((Date.now() % 100000) + " " + src + " " + what +
      (e && e.type ? "" : "") + (e && "key" in e ? " key=" + e.key + " kc=" + e.keyCode + (e.isComposing ? " composing" : "") : e && e.inputType ? " it=" + e.inputType : "") +
      " ae=" + (a ? (a.tagName || "?").toLowerCase() + (a.className && typeof a.className === "string" ? "." + a.className.split(" ")[0] : "") : "none"));
    if (TRACE.length > 80) TRACE.shift();
  };
  const isEnterKey = (e) => e.key === "Enter" || e.keyCode === 13 || e.which === 13 || e.code === "Enter" || e.code === "NumpadEnter";
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
    mode: S.mode, theme: S.theme, alphas: S.alphas, rects: S.rects, open: S.open, sysmsg: S.sysmsg,
    top: S.top, menuWins: S.menuWins
  })));

  /* ---------- styles ---------- */
  const CSS = `
html,body{height:100%!important;overflow:hidden!important}
body.cyos{--bg:#fff;--fg:#000;--d1:#c4c4c4;--d2:#9c9c9c;margin:0!important;padding:0!important;
  color:var(--fg);font:13px/1.4 Monaco,Menlo,Consolas,"Courier New",monospace;
  background:conic-gradient(var(--d1) 25%,var(--d2) 0 50%,var(--d1) 0 75%,var(--d2) 0) 0 0/4px 4px!important}
body.cyos.cyos-term{--bg:#0b0b0b;--fg:#e9e9e9;--d1:#1a1a1a;--d2:#0f0f0f}
body.cyos.cyos-amber{--bg:#0c0a00;--fg:#ffb000;--d1:#3d2e00;--d2:#1a1400}
body.cyos.cyos-cyan{--bg:#001018;--fg:#5ef0ff;--d1:#0a3a48;--d2:#001820}
/* soft CRT readouts: amber/cyan terminal log inherits fg; slight letter comfort */
body.cyos.cyos-amber #cyos-terminal .cyos-term-log,
body.cyos.cyos-cyan #cyos-terminal .cyos-term-log{text-shadow:0 0 1px color-mix(in srgb,var(--fg) 55%,transparent)}
body.cyos.cyos-amber .cyos-win>.cyos-bar,
body.cyos.cyos-cyan .cyos-win>.cyos-bar{text-shadow:0 0 1px color-mix(in srgb,var(--fg) 40%,transparent)}
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
.cyos-box[data-a="zoom"]{box-shadow:inset 0 0 0 2px var(--bg),inset 0 0 0 4px var(--fg)}
.cyos-box[data-a="zoom"]:hover{box-shadow:inset 0 0 0 2px var(--fg),inset 0 0 0 4px var(--bg)}
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
.cyos-flag:empty{display:none}
.cyos-flag b{font-weight:700}
#cyos-terminal .cyos-term-status{flex:0 0 auto;padding:2px 8px;border-bottom:2px solid var(--fg);font:11px/1.3 Monaco,Menlo,Consolas,monospace;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cyos-terminal .cyos-term-status b{font-weight:700}
.cyos-icons{position:absolute;top:${MB + 14}px;right:10px;width:64px;display:flex;flex-direction:column;gap:14px}
.cyos-ico{all:unset;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-weight:700;font-size:11px;text-align:center}
@media (max-height:640px){
  .cyos-icons{gap:6px;top:${MB + 6}px}
  .cyos-ico{font-size:10px;gap:1px}
  .cyos-ico b{height:26px!important;font-size:15px!important}
}
.cyos-icons{max-height:calc(100vh - ${MB + 10}px);overflow-y:auto;scrollbar-width:none}
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
.cyos-pal .cyos-pal-row{display:flex;align-items:stretch;border-bottom:2px solid var(--fg)}
.cyos-pal .cyos-pal-row input{flex:1 1 auto;width:auto;min-width:0;border-bottom:0}
.cyos-pal .cyos-pal-go{display:none;flex:none;border:0;border-left:2px solid var(--fg);background:var(--bg);color:var(--fg);font:700 13px/1 Geneva,"Helvetica Neue",Arial,sans-serif;
  padding:0 14px;cursor:pointer;border-radius:0}
@media (pointer:coarse),(max-width:759px){.cyos-pal .cyos-pal-go{display:block}}
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
#cyos-terminal .cyos-term-go{display:none;flex:none;border:2px solid var(--fg);background:var(--bg);color:var(--fg);font:inherit;
  font-weight:700;padding:2px 10px;margin:0;cursor:pointer;border-radius:0}
@media (pointer:coarse),(max-width:759px){#cyos-terminal .cyos-term-go{display:inline-block}}
#cyos-terminal .cyos-term-l{margin:0 0 2px}
#cyos-terminal .cyos-term-l.echo{font-weight:700}
#cyos-terminal .cyos-term-l.err{text-decoration:underline}
#cyos-terminal .cyos-term-l.sys{opacity:.75;font-style:italic}


#cyos-win-notes .cyos-body{padding:0;overflow:hidden}
.cyos-body>textarea.cyos-notes{flex:1 1 auto;width:100%!important;min-height:0;box-sizing:border-box;resize:none;border:0!important;
  outline:none!important;background:transparent!important;color:var(--fg)!important;padding:8px 10px!important;
  font:12px/1.5 Monaco,Menlo,Consolas,"Courier New",monospace}
.cyos-body>.cyos-notes-st{flex:0 0 auto;padding:2px 8px;border-top:2px solid var(--fg);font:11px/1.3 Monaco,Menlo,Consolas,monospace;opacity:.8}
.cyos-body>.cyos-sched{flex:1 1 auto;min-height:0;overflow:auto;padding:8px 10px;box-sizing:border-box;font:12px/1.45 Monaco,Menlo,Consolas,monospace}
.cyos-sched-meta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:0 0 8px;padding:0 0 6px;border-bottom:2px solid var(--fg)}
.cyos-sched-meta label{display:flex;align-items:center;gap:4px;font-weight:700}
.cyos-sched-meta input[type=text]{border:2px solid var(--fg);background:var(--bg);color:var(--fg);font:inherit;padding:2px 6px;min-width:8em;border-radius:0}
.cyos-sched-meta input[type=checkbox]{accent-color:var(--fg)}
.cyos-sched-tools{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 8px}
.cyos-sched-tools button{border:2px solid var(--fg);background:var(--bg);color:var(--fg);font:700 11px/1.2 Geneva,"Helvetica Neue",Arial,sans-serif;padding:3px 8px;cursor:pointer;border-radius:0}
.cyos-sched-tools button:hover{outline:1px dotted var(--fg)}
.cyos-sched-table{width:100%;border-collapse:collapse;font:inherit}
.cyos-sched-table th,.cyos-sched-table td{border:1px solid var(--fg);padding:3px 5px;text-align:left;vertical-align:top}
.cyos-sched-table th{font-weight:700;background:color-mix(in srgb,var(--fg) 12%,var(--bg))}
.cyos-sched-table input,.cyos-sched-table select{width:100%;box-sizing:border-box;border:1px solid var(--fg);background:var(--bg);color:var(--fg);font:inherit;padding:1px 3px;border-radius:0}
.cyos-sched-table .cyos-sched-rm{border:2px solid var(--fg);background:var(--bg);color:var(--fg);font:700 11px/1 Geneva,sans-serif;padding:1px 6px;cursor:pointer}
.cyos-sched-foot{margin-top:8px;opacity:.8;font-size:11px;white-space:pre-wrap}

.cyos-bc-stage{position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden;border:2px solid var(--fg);box-sizing:border-box}
.cyos-bc-yt,.cyos-bc-stage video{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}
.cyos-bc-yt iframe{width:100%;height:100%;border:0}
.cyos-bc-stage video{display:none;object-fit:contain}
.cyos-bc-shield{position:absolute;inset:0}
.cyos-bc-slate{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:10px;
  background:rgba(0,0,0,.88);color:#fff;font:700 13px/1.4 Monaco,Menlo,Consolas,monospace}
.cyos-bc-slate button,.cyos-bc-ctl button{border:2px solid var(--fg);background:var(--bg);color:var(--fg);font:700 12px/1.2 Geneva,"Helvetica Neue",Arial,sans-serif;padding:4px 12px;cursor:pointer;border-radius:0}
.cyos-bc-slate button{border-color:#fff;background:#000;color:#fff;font-size:14px;padding:6px 16px}
.cyos-bc-ctl{display:flex;gap:6px;align-items:center;margin:6px 0 8px}
.cyos-bc-ctl input[type=range]{flex:1 1 auto;min-width:60px;accent-color:var(--fg)}
.cyos-body>.cyos-bc{flex:1 1 auto;min-height:0;overflow:auto;padding:8px 10px;box-sizing:border-box;font:12px/1.5 Monaco,Menlo,Consolas,monospace}
.cyos-bc-head{font-weight:700;border-bottom:2px solid var(--fg);padding-bottom:4px;margin-bottom:8px}
.cyos-bc-now b{display:block;font-size:14px}
.cyos-bc-bar{height:10px;border:2px solid var(--fg);margin:6px 0 10px}
.cyos-bc-bar i{display:block;height:100%;width:0;background:var(--fg)}
.cyos-bc-list{margin:0;white-space:pre-wrap;font:inherit}
.cyos-bc-foot{margin-top:10px;opacity:.75;font-size:11px;white-space:pre-wrap}
.cyos-bc-dial{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 8px;padding:0 0 6px;border-bottom:2px solid var(--fg)}
.cyos-bc-dial button{border:2px solid var(--fg);background:var(--bg);color:var(--fg);font:700 11px/1.2 Geneva,"Helvetica Neue",Arial,sans-serif;padding:3px 8px;cursor:pointer;border-radius:0}
.cyos-bc-dial button.on{background:var(--fg);color:var(--bg)}
.cyos-bc-dial button:hover{outline:1px dotted var(--fg)}
.cyos-bc-guide-mark{font-weight:700}
.cyos-bc-guide-now{background:var(--fg);color:var(--bg);padding:0 3px}
@media (max-width:759px){
  body.cyos .cyos-win>.cyos-bar,body.cyos .cyos-grow,body.cyos .cyos-icons,.cyos-menu .nm{display:none!important}
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
    // Preserve open state of built-ins we care about, and any registered windows
    const prevOpen = Object.assign({}, S.open);
    const keepConsole = !!prevOpen.console, keepHelp = !!prevOpen.help, keepTerm = !!prevOpen.terminal;
    S.open = { chat: true, video: true, playlist: true, console: keepConsole, terminal: keepTerm, help: keepHelp };
    // Re-attach any registered (non-core) windows that were open
    DEFS.forEach((d) => {
      const id = defId(d);
      if (["chat","video","playlist","console","terminal","help"].indexOf(id) >= 0) return;
      if (prevOpen[id]) S.open[id] = true;
    });
    S.min = {};
    R.console = { x: G, y: MB + H - 200 - G, w: Math.min(620, W - 2 * G), h: 200 };
    R.terminal = { x: Math.max(G, W - 520 - G), y: MB + H - 280 - G, w: Math.min(520, W - 2 * G), h: 260 };
    R.help = { x: Math.max(G, Math.round((innerWidth - 560) / 2)), y: MB + 40, w: Math.min(560, innerWidth - 2 * G), h: Math.max(160, Math.min(540, H - 60)) };
    if (m === "theater") {
      const cw = clamp(Math.round(innerWidth * 0.34), 300, 460), ch = Math.round(H * 0.62);
      R.video = { x: 0, y: MB, w: W, h: H };          // W excludes the icon strip, so the icons stay visible
      R.chat = { x: Math.max(0, W - cw - 12), y: MB + H - ch - 12, w: cw, h: ch };
      R.playlist = { x: G, y: MB + G, w: 360, h: 260 };
      S.open.playlist = false;
    } else if (m === "pip") {
      const w = clamp(Math.round(W * 0.28), 260, 380), h = Math.round(w * 9 / 16) + TB;
      R.chat = { x: G, y: MB + G, w: W - 2 * G, h: H - 2 * G };
      R.video = { x: W - w - G, y: MB + H - h - G, w, h };
      R.playlist = { x: G + 40, y: MB + G + 40, w: Math.min(420, W - 80), h: Math.min(360, H - 80) };
      S.open.playlist = false;
    } else {
      const vw = Math.round(clamp(W * 0.6, 320, Math.max(320, W - 300)));
      const vh = Math.round(vw * 9 / 16) + TB + 4;
      R.video = { x: G, y: MB + G, w: vw, h: vh };
      R.playlist = { x: G, y: MB + vh + 2 * G, w: vw, h: Math.max(120, H - vh - 3 * G) };
      R.chat = { x: vw + 2 * G, y: MB + G, w: Math.max(260, W - vw - 3 * G), h: H - 2 * G };
    }
  }

  // Layout presets (split, theater, pip, tile) are plain geometry applied through the same path. Each one
  // remembers the layout before it, and `dock` goes back to that.
  function snapshotLayout() { S.saved = clone({ r: S.rects, o: S.open }); }

  function setMode(m) {
    snapshotLayout();
    layout(m);
    S.mode = m;
    focusWin("chat");
    save();
  }

  function undoLayout() {
    if (!S.saved) return note("No earlier layout to go back to.", "err");
    S.rects = S.saved.r; S.open = S.saved.o; S.min = {}; S.saved = null; S.mode = "custom";
    refresh();
    focusWin(S.focus && WIN[S.focus] ? S.focus : "chat");
    save();
  }

  function tileWindows(all) {
    if (mobile()) return note("Tiling is for the desktop layout.", "err");
    const ids = DEFS.map(defId).filter((id) => WIN[id]);
    const first = ["video", "chat", "playlist"];
    const rank = (id) => { const i = first.indexOf(id); return i < 0 ? first.length : i; };
    const pick = ids.filter((id) => all || S.open[id]).sort((a, b) => rank(a) - rank(b) || ids.indexOf(a) - ids.indexOf(b));
    if (!pick.length) return note("No open windows to tile.", "err");
    snapshotLayout();
    const W = innerWidth - ICON - 8, H = innerHeight - MB, n = pick.length;
    let cols = 1, best = Infinity;
    for (let c = 1; c <= n; c++) {   // the column count whose cells look most like windows (about 4:3)
      const rows = Math.ceil(n / c);
      const cw = (W - G * (c + 1)) / c, ch = (H - G * (rows + 1)) / rows;
      const score = Math.abs(Math.log(Math.max(cw, 1) / Math.max(ch, 1) / (4 / 3)));
      if (score < best) { best = score; cols = c; }
    }
    const rows = Math.ceil(n / cols), ch = Math.floor((H - G * (rows + 1)) / rows);
    pick.forEach((id, i) => {
      const row = Math.floor(i / cols), inRow = row === rows - 1 ? n - cols * (rows - 1) : cols, col = i % cols;
      const cw = Math.floor((W - G * (inRow + 1)) / inRow);   // a short last row widens its windows to fill the width
      const r = S.rects[id] || (S.rects[id] = { x: 0, y: MB, w: 300, h: 200 });
      delete r.sn; delete r.pv; delete r.pz;
      r.x = G + col * (cw + G); r.y = MB + G + row * (ch + G); r.w = cw; r.h = ch;
      S.open[id] = true;
    });
    S.min = {};
    S.mode = "tile";
    refresh();
    focusWin(S.focus && S.open[S.focus] ? S.focus : pick[0]);
    save();
    note("Tiled " + n + " window" + (n === 1 ? "" : "s") + (all ? " (all)" : "") + ".");
  }

  const LAYOUT_CYCLE = ["split", "theater", "pip", "tile"];
  function cycleLayout() {
    const next = LAYOUT_CYCLE[(LAYOUT_CYCLE.indexOf(S.mode) + 1) % LAYOUT_CYCLE.length];
    if (next === "tile") tileWindows(false); else setMode(next);
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
  }

  function playlistLockLabel() {
    if (!window.CHANNEL || typeof CHANNEL.openqueue !== "boolean") return "";
    return CHANNEL.openqueue ? "pl:open" : "pl:lock";
  }

  function statusHints() {
    if (S.pending) return "y/n confirm";
    if (S.move) return "arrows move · Esc";
    if (S.desk) return "m move · j/k pl · Esc chat · ^K";
    if (S.focus === "terminal") return "cmds · man · Esc desk";
    if (S.focus === "notes") return "typing · Esc chat · ^K";
    if (S.focus === "playlist") return "j/k · Enter jump · Del · Esc desk";
    if (S.focus === "broadcast") return "1-9 ch · t tune · m mute · g guide · Esc desk";
    if (S.focus === "scheduler") return "sched add · export · clear · Esc desk";
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
      ui.flag.textContent = S.move ? "MOVE" : S.desk ? "DESK" : "";
      ui.flag.title = S.move ? "Move mode: arrows move, Shift+arrows resize, Enter or M to finish" : "Desk mode: keys act on windows. Esc returns to chat";
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
    b.toggle("cyos-term", S.theme === "term");
    b.toggle("cyos-amber", S.theme === "amber");
    b.toggle("cyos-cyan", S.theme === "cyan");
    b.toggle("cyos-users", S.users);
    b.toggle("cyos-nav", S.nav);
    Object.keys(WIN).forEach(place);
    applyAlpha();
    flag();
    tabs();
  }

  function focusWin(n) {
    if (!WIN[n]) return;
    if (mobile()) S.tab = n; else { S.open[n] = true; S.min[n] = false; }
    S.focus = n;
    raiseWin(n);
    refresh();
    rebuildWindowMenus();
    if (n === "notes" && ui.notesInput && !mobile()) {
      setTimeout(() => { if (document.activeElement !== ui.notesInput) { try { ui.notesInput.focus({ preventScroll: true }); } catch (_) {} } }, 0);
    }
    if (n === "terminal" && ui.termInput && !mobile()) {
      setTimeout(() => { try { ui.termInput.focus({ preventScroll: true }); } catch (_) {} }, 0);
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
    save();
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
    bar.innerHTML = '<button type="button" class="cyos-box" data-a="close" aria-label="Close ' + title + '" title="Close (hides the window; reopen from its desktop icon or the Window menu)"></button>' +
      "<i></i><span>" + title + "</span><i></i>" +
      '<button type="button" class="cyos-box" data-a="zoom" aria-label="Zoom ' + title + ' (maximize or restore)" title="Zoom: maximize / restore (Z)"></button>';
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
    el.style.zIndex = String(++S.z);
    WIN[name] = { name, el, bar, grow, title, icon, mount };

    el.addEventListener("pointerdown", () => { if (S.focus !== name) focusWin(name); }, true);
    bar.addEventListener("pointerdown", (e) => { if (!e.target.closest(".cyos-box")) drag(e, name, "move"); });
    bar.addEventListener("dblclick", (e) => { if (!e.target.closest(".cyos-box")) zoom(name); });
    bar.addEventListener("click", (e) => {
      const b = e.target.closest(".cyos-box");
      if (!b) return;
      if (b.dataset.a === "zoom") zoom(name); else closeWin(name);
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
    "Y              Terminal    O Console    H Help    E Notes    B Broadcast",
    "C V P          Chat / Video / Playlist",
    "",
    "Desk mode: m move, [ ] snap halves, 1-4 quarters, z zoom, w close,",
    "  t theater, x pip, s split, g tile (G tile all), d previous layout, l cycle layout, Tab cycle windows,",
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
    "Windows   focus|show|hide <name>  max  snap <side>  cycle  desk   (close hides; windows are never destroyed)",
    "  wins  split|theater|pip|tile|tileall|dock  theme mac|term|amber|cyan",
    "  alpha                  list all window alphas",
    "  alpha [win|all] on|off|0|0.7  set glass (0=clear fill, text stays solid)",
    "",
    "Room      who  say|me|msg|sp  afk  poll|hpoll|vote  lock|unlock",
    "Mod       kick ban unban ipban kickanons  mute smute unmute  clearchat",
    "          clean <user>  cleantitle <title>  rank  shout",
    "Site      a <text>  siterank <user> <n>  (rank ≥ 255)",
    "Fun       roll [NdM]  pick a|b|c  countdown <sec>  drink  mcdonalds",
    "Broadcast bcast [ch|tune|guide|load|sample|…]   multi-channel fixed-time TV; HLS/mp4/webm/yt; desk: 1-9 t m g",
    "Notes     notes [add <text>|show|clear]   scratch pad, saved in this browser per channel",
    "Scheduler sched [add|list|rm|clear|export|dur|apply|…]  draft broadcast schedule (IDB + export)",
    "Storage   store [ls [prefix]|persist]     IndexedDB status; persist asks the browser to keep it",
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
    if (id === "broadcast") {
      return [
        [bc.tuned ? "Tune out" : "Tune in", "bcast", bc.tuned ? "untune" : "tune", "", "t"],
        [bcp.muted ? "Unmute" : "Mute", "bcast", bcp.muted ? "unmute" : "mute", "", "m"],
        ["Channels…", "bcast", "ch", "", "c"],
        ["TV guide (Terminal)", "bcast", "guide", "", "g"],
        ["Reload schedule", "bcast", "reload", "", "r"],
        ["Sample channel", "bcast", "sample", "", "s"],
        ["What's next (Terminal)", "bcast", "next", "", "n"],
        [topLabel, "win.top", "broadcast", "", "o"]
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
      ["Close", "win.close", id, "W", "c"],
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
      case "win.close": dispatch("hide", arg ? [arg] : [S.focus], "", false); break;
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
    const iconTips = {chat:'Open and focus Chat (C)',video:'Toggle Video window (V)',playlist:'Toggle Playlist window (P)',console:'Toggle Console window (O)',terminal:'Toggle Terminal window (Y)',help:'Toggle Help window (H or ?)'};
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
      menuMarkup("View", "v", [["Cycle layout", "layout.cycle", "", "L", "c"], ["Split", "split", "", "", "s"], ["Theater", "theater", "", "", "t"], ["Picture in Picture", "pip", "", "", "p"], ["Tile open windows", "tile", "", "G", "w"], ["Tile all windows", "tileall", "", "Shift+G", "l"], ["Previous layout", "dock", "", "", "d"], ["Toggle theme", "theme", "", "", "h"], ["Focused glass", "alpha", "on", "", "a"], ["Focused solid", "alpha", "off", "", "o"], ["Focused 70%", "alpha", "0.7", "", ""], ["List alphas", "alpha", "", "", ""], ["Menu: focused window", "menumode", "focus", "", ""], ["Menu: all open windows", "menumode", "open", "", ""]]) +
      menuMarkup("Window", "w", [["Chat", "win.open", "chat", "C", "c"], ["Video", "video", "", "V", "v"], ["Playlist", "list", "", "P", "p"], ["Console", "console", "", "O", "o"], ["Terminal", "terminal", "", "Y", "e"], ["Help", "help.toggle", "", "H", "h"], ["Notes", "win.open", "notes", "E", "n"], ["Broadcast", "win.open", "broadcast", "B", "d"], ["Scheduler", "win.open", "scheduler", "", ""], ["Close window", "win.close", "", "W", "w"], ["Maximize / restore", "win.max", "", "Z", "x"], ["Always on top", "win.top", "", "", "a"], ["Snap left half", "win.snap", "l", "[", "l"], ["Snap right half", "win.snap", "r", "]", "r"], ["Top left quarter", "win.snap", "tl", "1", "t"], ["Top right quarter", "win.snap", "tr", "2", "i"], ["Bottom left quarter", "win.snap", "bl", "3", "b"], ["Bottom right quarter", "win.snap", "br", "4", "u"]]) +
      '<span class="cyos-winmenus" id="cyos-winmenus"></span>' +
      menuMarkup("Help", "h", [["Keyboard reference", "help.toggle", "", "H", "k"], ["Command palette…", "palette.toggle", "", "Ctrl+K", "p"]]) +
      '<button type="button" class="cyos-legacy" data-m="pal" title="Open command palette (Ctrl+K)">Commands <kbd>Ctrl+K</kbd></button>' +
      '<span class="cyos-confirm"><span></span><button type="button" data-c="y">Yes</button><button type="button" data-c="n">No</button></span>' +
      '<span class="cyos-note"></span><span class="cyos-flag">Chat</span><span class="cyos-clock"></span></nav>' +
      '<div class="cyos-tabs">' + DEFS.map((d) => '<button type="button" data-w="' + defId(d) + '" title="Switch to ' + defTitle(d) + ' window">' + defTitle(d) + "</button>").join("") + "</div>" +
      '<div class="cyos-pal" role="dialog" aria-label="CyTube OS command palette"><div class="cyos-pal-row"><input type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" aria-label="Command palette" title="Type a command; Enter runs it, Up/Down recalls history, Tab completes" placeholder="Type a command (help)"><button type="button" class="cyos-pal-go" aria-label="Run command" title="Run">Run</button></div><div class="cyos-hint"></div></div>';
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
    if (n === "dock" || n === "back") undoLayout();
    else if (n === "split" || n === "theater" || n === "pip") setMode(n);
    else if (n === "tile") tileWindows(false);
    else if (n === "tileall") tileWindows(true);
    else note("Layouts: split, theater, pip, tile, tileall, dock (back)", "err");
  };

  cmd("trace", "trace [clear]", "Show the last palette/Terminal input events (for diagnosing a keyboard)", "local", (a) => {
    if ((a[0] || "").toLowerCase() === "clear") { TRACE.length = 0; return note("Trace cleared."); }
    if (!TRACE.length) return note("No input events recorded yet. Use the palette, then run trace.");
    TRACE.slice(-40).forEach((ln) => termOut("ok", ln));
    note(Math.min(40, TRACE.length) + " of " + TRACE.length + " event(s) shown.");
  });
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
    if (m !== "focus" && m !== "open") return note("Usage: menumode focus|open  (now: " + S.menuWins + ")", "err");
    S.menuWins = m;
    rebuildWindowMenus();
    save();
    note("Menu bar shows " + (m === "focus" ? "the focused window only." : "every open window."));
  });
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
  cmd("wins", "wins", "List windows and open/closed/alpha state", "local", () => {
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
  cmd("theater", "theater", "Layout preset: big video with chat floating over it", "local", () => setLayout("theater"));
  cmd("pip", "pip", "Layout preset: small video over big chat", "local", () => setLayout("pip"));
  cmd("dock", "dock", "Go back to the layout before the last preset (split, theater, pip or tile)", "local", () => setLayout("dock"));
  cmd("split", "split", "Layout preset: the default split", "local", () => setLayout("split"));
  cmd("tile", "tile", "Tile the open windows in a grid", "local", () => tileWindows(false));
  cmd("tileall", "tileall", "Open every window and tile them in a grid", "local", () => tileWindows(true));
  cmd("layout.set", "layout.set <name>", "split, theater, pip, tile, tileall or dock", "local", (a) => setLayout(a[0]));
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
  cmd(["theme", "sys.theme"], "theme [mac|term|amber|cyan]", "UI theme (CRT amber/cyan, light, dark)", "local", (a) => {
    const THEMES = ["mac", "term", "amber", "cyan"];
    const arg = (a[0] || "").toLowerCase();
    if (THEMES.includes(arg)) S.theme = arg;
    else {
      const i = THEMES.indexOf(S.theme);
      S.theme = THEMES[(i < 0 ? 0 : i + 1) % THEMES.length];
    }
    refresh(); save();
    note("Theme: " + S.theme);
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

  cmd("min", "min", "Same as close: windows are hidden, never destroyed", "local", () => closeWin(S.focus));
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



  /* ---------- local storage layer (v0.6.0) ---------- */
  // One IndexedDB database ("cyos", object store "kv"). Every key is scoped to the current channel path, so
  // channels on the same site never mix. If IndexedDB is missing or fails (private mode, blocked, quota),
  // the layer silently falls back to an in-memory map for this page load and status() says so.
  // It never asks the browser for anything on its own; `store persist` is the only thing that requests durability.
  const kv = (() => {
    const DB = "cyos", OS = "kv", mem = new Map();
    let dbp = null, backend = "pending", lastErr = "";
    const scope = () => location.pathname + "::";
    const fk = (k) => scope() + String(k);
    function open() {
      if (dbp) return dbp;
      dbp = new Promise((resolve) => {
        let req;
        try { req = window.indexedDB.open(DB, 1); } catch (err) { backend = "memory"; lastErr = String(err && err.message || err); return resolve(null); }
        req.onupgradeneeded = () => { try { req.result.createObjectStore(OS, { keyPath: "k" }); } catch (_) {} };
        req.onsuccess = () => {
          const db = req.result;
          db.onversionchange = () => { try { db.close(); } catch (_) {} dbp = null; };
          backend = "idb";
          resolve(db);
        };
        req.onerror = req.onblocked = () => { backend = "memory"; lastErr = String(req.error && req.error.message || "open failed"); resolve(null); };
      });
      return dbp;
    }
    // Runs fn(objectStore) in one transaction; resolves with the request result, or rejects on abort/error.
    const tx = (mode, fn) => open().then((db) => !db ? undefined : new Promise((resolve, reject) => {
      let r;
      try {
        const t = db.transaction(OS, mode);
        r = fn(t.objectStore(OS));
        t.oncomplete = () => resolve(r && r.result);
        t.onerror = t.onabort = () => reject(t.error || new Error("transaction failed"));
      } catch (err) { reject(err); }
    }));
    const fail = (err) => { backend = "memory"; lastErr = String(err && err.message || err); };
    const api = {
      get: (k) => tx("readonly", (s) => s.get(fk(k))).then((rec) => backend === "idb" ? (rec ? rec.v : undefined) : mem.get(fk(k)), (e) => { fail(e); return mem.get(fk(k)); }),
      set: (k, v) => {
        mem.set(fk(k), v);   // always mirrored in memory so a failed write is still readable this session
        return tx("readwrite", (s) => s.put({ k: fk(k), v: v, t: Date.now() })).then(() => backend === "idb", (e) => { fail(e); return false; });
      },
      del: (k) => { mem.delete(fk(k)); return tx("readwrite", (s) => s.delete(fk(k))).then(() => true, (e) => { fail(e); return false; }); },
      list: (prefix) => {
        const lo = fk(prefix || ""), cut = scope().length;
        return tx("readonly", (s) => s.getAll(IDBKeyRange.bound(lo, lo + "\uffff"))).then((rows) => {
          if (backend !== "idb") return [...mem.keys()].filter((k) => k.startsWith(lo)).map((k) => ({ key: k.slice(cut), bytes: String(mem.get(k)).length, t: 0 }));
          return (rows || []).map((r) => ({ key: r.k.slice(cut), bytes: typeof r.v === "string" ? r.v.length : JSON.stringify(r.v).length, t: r.t }));
        }, (e) => { fail(e); return []; });
      },
      status: () => open().then(() => Promise.all([
        navigator.storage && navigator.storage.persisted ? navigator.storage.persisted().catch(() => null) : null,
        navigator.storage && navigator.storage.estimate ? navigator.storage.estimate().catch(() => null) : null,
        kv_count()
      ])).then(([persisted, est, keys]) => ({ backend, persisted, usage: est && est.usage, quota: est && est.quota, keys, error: lastErr })),
      persist: () => navigator.storage && navigator.storage.persist ? navigator.storage.persist().catch(() => false) : Promise.resolve(false)
    };
    const kv_count = () => api.list("").then((r) => r.length);
    return api;
  })();

  /* ---------- Notes window (scratch pad) ---------- */
  let notesApi = null;
  function mountNotes(body) {
    body.innerHTML = '<textarea class="cyos-notes" spellcheck="false" autocomplete="off" aria-label="Notes" placeholder="Scratch notes. Saved in this browser for this channel."></textarea><div class="cyos-notes-st" aria-live="polite"></div>';
    const ta = body.querySelector("textarea"), st = body.querySelector(".cyos-notes-st");
    ui.notesInput = ta;
    ta.readOnly = true;   // until the saved text has loaded, so early typing can't be overwritten
    let timer = 0, dirty = false, loaded = false, mem = false;
    const paint = (txt) => { st.textContent = txt; };
    const idle = () => paint((ta.value.length ? ta.value.length + " chars" : "empty") + (mem ? " · NOT saved: browser storage unavailable (kept until you close this page)" : " · saved"));
    const flush = () => {
      clearTimeout(timer);
      if (!loaded || !dirty) return Promise.resolve();
      dirty = false;
      paint("saving…");
      return kv.set("notes", ta.value).then((okIdb) => { mem = !okIdb; if (dirty) paint("unsaved changes…"); else idle(); });
    };
    const touch = () => { dirty = true; paint("unsaved changes…"); clearTimeout(timer); timer = setTimeout(flush, 500); };
    const pull = () => kv.get("notes").then((v) => {
      if (typeof v === "string" && !dirty && v !== ta.value) ta.value = v;
      mem = false;
      kv.status().then((s) => { mem = s.backend !== "idb"; if (!dirty) idle(); });
    });
    pull().then(() => { loaded = true; ta.readOnly = false; if (!dirty) idle(); });
    ta.addEventListener("input", touch);
    ta.addEventListener("blur", flush);
    // Another browser tab may have saved newer text; refresh on focus when we have nothing unsaved.
    ta.addEventListener("focus", () => { if (loaded && !dirty) pull(); });
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); flush(); ta.blur(); exitDesk(); }
    });
    addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
    notesApi = {
      text: () => ta.value,
      append: (t) => { ta.value += (ta.value && !ta.value.endsWith("\n") ? "\n" : "") + t + "\n"; touch(); flush(); },
      clear: () => { ta.value = ""; touch(); flush(); }
    };
  }

  cmd(["notes", "pad"], "notes [add <text>|show|clear]", "Scratch notes window (saved in this browser, per channel)", "local", (a, raw) => {
    const sub = (a[0] || "").toLowerCase();
    if (!sub) return toggleWin("notes");
    if (!notesApi) return note("Notes are not ready yet.", "err");
    if (sub === "add") {
      const t = (raw || "").replace(/^\s*add\s*/i, "").trim();
      if (!t) return note("Usage: notes add <text>", "err");
      notesApi.append(t);
      return note("Added to notes.");
    }
    if (sub === "show") {
      const lines = notesApi.text().split("\n");
      while (lines.length && !lines[lines.length - 1]) lines.pop();
      if (!lines.length) return note("Notes are empty.");
      lines.slice(-40).forEach((ln, i) => termOut("ok", ln));
      return note(lines.length + " line(s)" + (lines.length > 40 ? " (last 40 shown)" : "") + ".");
    }
    if (sub === "clear") {
      if (!notesApi.text()) return note("Notes are already empty.");
      return ask("Clear all notes?", () => { notesApi.clear(); note("Notes cleared."); });
    }
    note("Usage: notes [add <text>|show|clear]", "err");
  });

  cmd(["store", "storage"], "store [ls [prefix]|persist]", "Local storage status (IndexedDB, per channel)", "local", (a) => {
    const sub = (a[0] || "").toLowerCase();
    if (sub === "ls") {
      return kv.list(a[1] || "").then((rows) => {
        if (!rows.length) return note("No stored keys" + (a[1] ? ' under "' + a[1] + '"' : "") + ".");
        rows.forEach((r) => termOut("ok", r.key.padEnd(24) + String(r.bytes).padStart(8) + " chars" + (r.t ? "  " + new Date(r.t).toLocaleString() : "")));
        note(rows.length + " key(s).");
      });
    }
    if (sub === "persist") {
      return kv.persist().then((ok) => note(ok ? "The browser agreed to keep CyTube OS storage." : "The browser did not grant persistent storage; data may still be cleared under storage pressure.", ok ? undefined : "err"));
    }
    if (sub) return note("Usage: store [ls [prefix]|persist]", "err");
    kv.status().then((s) => {
      const mb = (n) => typeof n === "number" ? (n / 1048576).toFixed(1) + " MB" : "?";
      [
        "backend: " + s.backend + (s.backend !== "idb" ? " (data is not saved between page loads)" : ""),
        "persistent: " + (s.persisted === null ? "unknown" : s.persisted ? "yes" : "no (store persist to ask)"),
        "site usage: " + mb(s.usage) + " of " + mb(s.quota),
        "keys in this channel: " + s.keys + (s.error ? "   last error: " + s.error : "")
      ].forEach((ln) => termOut("ok", ln));
      note("storage: " + s.backend + ", " + s.keys + " key(s) in this channel");
    });
  });

  /* ---------- Broadcast: schedule engine (v0.8.0) ---------- */
  // A schedule is a list of entries. Everything on air is a pure function of (schedule, clock): nobody syncs
  // with anybody, each viewer just computes what should be on right now and how far into it we are.
  //   entry: { id, title, kind, src: "yt:VIDEOID" | "https://…", dur: media length in seconds,
  //            at: fixed start (ISO time WITH Z or UTC offset, or epoch seconds), offset: start this far in,
  //            resume: id of an earlier entry: continue that media where it was last cut }
  //   entries without "at" start when the previous one ends; an entry with "at" starts exactly then and cuts
  //   whatever is running. Optional top level: title, start (anchor for a first entry without "at"), loop.
  /* BCAST-ENGINE-START */
  const BC = (() => {
    const EPS = 0.001;
    const parseTime = (v) => {
      if (typeof v === "number") return isFinite(v) && v > 1e9 ? v : NaN;
      if (typeof v !== "string") return NaN;
      const t = v.trim();
      if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(t)) return NaN;   // a time zone is required: never guess local time
      const ms = Date.parse(t);
      return isFinite(ms) ? ms / 1000 : NaN;
    };
    const parseSrc = (v) => {
      if (typeof v !== "string" || !v.trim()) return null;
      const t = v.trim();
      let m = t.match(/^yt:([\w-]{6,20})$/i);
      if (m) return { type: "yt", id: m[1], raw: t };
      m = t.match(/^hls:(https?:\/\/.+)$/i);
      if (m) return { type: "hls", url: m[1], raw: t };
      m = t.match(/^(?:file|url|mp4|webm|video):(https?:\/\/.+)$/i);
      if (m) return { type: /\.m3u8(\?|$)/i.test(m[1]) ? "hls" : "file", url: m[1], raw: t };
      m = t.match(/^(https?:\/\/.+)$/i);
      if (m) {
        const u = m[1];
        if (/\.m3u8(\?|$)/i.test(u) || /\/manifest(\.m3u8)?(\?|$)/i.test(u)) return { type: "hls", url: u, raw: t };
        if (/\.(mp4|webm|ogv|ogg|mov|m4v)(\?|$)/i.test(u)) return { type: "file", url: u, raw: t };
        // bare https without extension: treat as file (direct progressive); HLS needs .m3u8 or hls:
        return { type: "file", url: u, raw: t };
      }
      return null;
    };
    function build(json) {
      const errors = [], warnings = [];
      const out = { ok: false, errors, warnings, title: "", loop: false, segments: [], period: 0, t0: 0, tEnd: 0, entries: 0 };
      if (!json || typeof json !== "object" || !Array.isArray(json.entries)) { errors.push('The schedule needs an "entries" list.'); return out; }
      out.title = typeof json.title === "string" ? json.title.slice(0, 80) : "";
      out.loop = json.loop === true;
      out.entries = json.entries.length;
      let top = null;
      if (json.start != null) {
        top = parseTime(json.start);
        if (isNaN(top)) { errors.push('"start" needs a time with Z or a UTC offset, e.g. 2026-11-03T09:00:00Z.'); top = null; }
      }
      const E = [], byId = {};
      json.entries.forEach((raw, i) => {
        const tag = "entry " + (i + 1) + (raw && raw.id != null ? ' ("' + raw.id + '")' : "");
        if (!raw || typeof raw !== "object") { errors.push(tag + " is not an object."); return; }
        let id = raw.id != null ? String(raw.id).slice(0, 40) : "e" + (i + 1);
        if (byId[id]) { warnings.push(tag + ": duplicate id, renamed."); id += "#" + (i + 1); }
        const en = { i, id, tag, at: null, offset0: 0, resume: null, program: id,
          kind: typeof raw.kind === "string" ? raw.kind.slice(0, 20) : "", title: typeof raw.title === "string" ? raw.title.slice(0, 120) : "" };
        if (raw.at != null) {
          const t = parseTime(raw.at);
          if (isNaN(t)) { errors.push(tag + ': "at" needs a time with Z or a UTC offset (or epoch seconds).'); return; }
          en.at = t;
        }
        if (raw.resume != null) {
          const base = byId[String(raw.resume)];
          if (!base) { errors.push(tag + ': resume "' + raw.resume + '" must be the id of an earlier entry.'); return; }
          en.resume = base.id; en.program = base.program; en.src = base.src; en.dur = base.dur;
          if (!en.title) en.title = base.title;
          if (!en.kind) en.kind = base.kind;
        } else {
          if (raw.offset != null) {
            const o = Number(raw.offset);
            if (!(o >= 0)) { errors.push(tag + ': "offset" must be seconds, 0 or more.'); return; }
            en.offset0 = o;
          }
          const src = parseSrc(raw.src);
          if (!src) { errors.push(tag + ': "src" must be yt:VIDEOID or an https link.'); return; }
          const dur = Number(raw.dur);
          if (!(dur > 0)) { errors.push(tag + ': "dur" (media length in seconds) must be more than 0.'); return; }
          en.src = src; en.dur = dur;
          if (!en.title) en.title = id;
        }
        byId[id] = en;
        E.push(en);
      });
      if (errors.length) return out;
      if (!E.length) { errors.push("The schedule has no entries."); return out; }
      if (E[0].at == null) {
        if (top == null) { errors.push('The first entry needs "at" (or set a top-level "start").'); return out; }
        E[0].at = top;
      }
      let last = -Infinity;
      for (const en of E) {
        if (en.at == null) continue;
        if (en.at < last - EPS) { errors.push(en.tag + ': "at" is earlier than a previous fixed time; list entries in time order.'); return out; }
        last = en.at;
      }
      const nextFixed = new Array(E.length).fill(null);
      let nf = null;
      for (let k = E.length - 1; k >= 0; k--) { nextFixed[k] = nf; if (E[k].at != null) nf = E[k].at; }
      const segs = [], pos = {};
      let cursor = null;
      for (let k = 0; k < E.length; k++) {
        const en = E[k];
        let s = en.at != null ? en.at : cursor;
        if (cursor != null && s < cursor) s = cursor;
        const base = en.resume ? (pos[en.program] != null ? pos[en.program] : 0) : en.offset0;
        const remaining = en.dur - base;
        if (remaining <= EPS) { warnings.push(en.tag + ": that media is already finished; skipped."); continue; }
        let end = s + remaining, cut = false;
        if (nextFixed[k] != null && nextFixed[k] < end - EPS) { end = nextFixed[k]; cut = true; }
        if (end - s <= EPS) { warnings.push(en.tag + ": no airtime before the next fixed entry; skipped."); continue; }
        if (cursor != null && s > cursor + EPS) segs.push({ gap: true, start: cursor, end: s });
        segs.push({ gap: false, id: en.id, program: en.program, title: en.title, kind: en.kind, src: en.src,
          start: s, end, offset: base, dur: en.dur, cut, resumed: !!en.resume });
        pos[en.program] = base + (end - s);
        cursor = end;
      }
      if (!segs.length) { errors.push("Nothing in the schedule has any airtime."); return out; }
      out.segments = segs; out.t0 = segs[0].start; out.tEnd = segs[segs.length - 1].end;
      out.period = out.tEnd - out.t0; out.ok = true;
      return out;
    }
    const wrap = (tl, t) => {
      if (!tl.loop || tl.period <= EPS) return { tt: t, shift: 0 };
      const k = Math.floor((t - tl.t0) / tl.period);
      return { tt: t - k * tl.period, shift: k * tl.period };
    };
    function at(tl, t) {
      if (!tl || !tl.ok) return { state: "none" };
      if (t < tl.t0 - EPS) return { state: "before", next: tl.segments[0], startsIn: tl.t0 - t };
      if (!tl.loop && t >= tl.tEnd - EPS) return { state: "ended" };
      const w = wrap(tl, t);
      for (let i = 0; i < tl.segments.length; i++) {
        const s = tl.segments[i];
        if (w.tt >= s.start - EPS && w.tt < s.end - EPS) {
          return { state: s.gap ? "gap" : "on", seg: s, index: i, shift: w.shift, elapsed: w.tt - s.start, slotLeft: s.end - w.tt,
            mediaPos: s.gap ? 0 : s.offset + (w.tt - s.start) };
        }
      }
      return { state: "none" };
    }
    function upcoming(tl, t, n) {
      const out = [];
      if (!tl || !tl.ok) return out;
      const now = at(tl, t);
      let idx, shift;
      if (now.state === "before") { idx = 0; shift = 0; }
      else if (now.state === "on" || now.state === "gap") { idx = now.index + 1; shift = now.shift; }
      else return out;
      let guard = 0;
      while (out.length < n && guard++ < n + tl.segments.length * 2 + 4) {
        if (idx >= tl.segments.length) { if (!tl.loop) break; idx = 0; shift += tl.period; }
        const s = tl.segments[idx++];
        out.push({ seg: s, start: s.start + shift, end: s.end + shift });
      }
      return out;
    }
    return { parseTime, parseSrc, build, at, upcoming, EPS };
  })();
  /* BCAST-ENGINE-END */

  /* ---------- Broadcast window + player ---------- */
  const bc = { tl: null, url: "", fetchedAt: 0, error: "", ui: null, fetching: false, source: "", tuned: false, lastBad: null, failed: {},
    ch: "sample", custom: [] };
  // Player state. The video plays inside the Broadcast window, separate from CyTube's own synced player.
  const bcp = { yt: null, ytReady: false, ytWait: [], ytLoading: false, ytState: -2, cur: null, graceUntil: 0,
    vol: 80, muted: false, failed: {}, duck: false, roomVol: null, msg: "", tap: false,
    hls: null, hlsLoading: false, hlsWait: [], fileKind: "" };

  /* --- multi-channel directory (v0.10.0) ---
     Built-in channels generate demo schedules client-side so the feature works offline.
     Real stations publish a schedule JSON at a public URL (GitHub raw, Gist, static host)
     and are added with:  bcast ch add <name> <url>
     A future channel-directory.json can also be loaded with:  bcast dir <url>
  */
  const BC_CDN = "https://cdn.jsdelivr.net/gh/duckwerks/cyos-channels@main";
  const BC_BUILTIN = [
    { id: "liquid",  title: "Liquid TV",  kind: "remote", icon: "◈", url: BC_CDN + "/schedule-liquid.json" },
    { id: "ball",    title: "Ball World", kind: "remote", icon: "◎", url: BC_CDN + "/schedule-ball.json" },
    { id: "fish",    title: "FISH ON!",   kind: "remote", icon: "≈", url: BC_CDN + "/schedule-fish.json" },
    { id: "cynews",  title: "CyNews",     kind: "remote", icon: "▣", url: BC_CDN + "/schedule-cynews.json" },
    { id: "sample",  title: "Sample",     kind: "demo",   icon: "◉" },
    { id: "stream",  title: "HLS Test",   kind: "demo",   icon: "▣" }
  ];
  function bcAllChannels() {
    // built-ins first, then user custom (no id collision)
    const seen = new Set(BC_BUILTIN.map((c) => c.id));
    const extra = (bc.custom || []).filter((c) => c && c.id && !seen.has(c.id));
    return BC_BUILTIN.concat(extra);
  }
  function bcFindCh(q) {
    if (q == null || q === "") return null;
    const list = bcAllChannels();
    const s = String(q).toLowerCase().trim();
    // numeric 1-based index
    if (/^\d+$/.test(s)) {
      const i = parseInt(s, 10) - 1;
      return list[i] || null;
    }
    return list.find((c) => c.id === s || c.title.toLowerCase() === s || c.title.toLowerCase().replace(/\s+/g, "") === s.replace(/\s+/g, "")) || null;
  }
  function bcDemoSchedule(chId) {
    // Distinct looping demos so flipping channels feels different. All use public/embeddable YT ids.
    // Times are relative to "now" so the demo is always on-air.
    const now = Math.floor(Date.now() / 1000);
    // Shared catalog of short public clips (title, yt id, duration seconds)
    const C = {
      rick:   { title: "Never Gonna Give You Up", src: "yt:dQw4w9WgXcQ", dur: 213 },
      zoo:    { title: "Me at the zoo",           src: "yt:jNQXAC9IVRw", dur: 19 },
      freib:  { title: "Freiburger Münster",      src: "yt:aqz-KE-bpKQ", dur: 60 },  // Big Buck Bunny trailer-ish; may vary
      // fallback short public domain-ish
      clock:  { title: "Station Clock",           src: "yt:jNQXAC9IVRw", dur: 19 },
      id:     { title: "Station ID",              src: "yt:jNQXAC9IVRw", dur: 19 }
    };
    // Per-channel program patterns (start offset into the loop so channels aren't in lockstep)
    const patterns = {
      sample: {
        title: "Sample channel",
        offset: 30,
        entries: (t0) => [
          { id: "show", title: "Sample Show", kind: "show", src: C.rick.src, dur: C.rick.dur, at: t0 },
          { id: "ad",   title: "Sample Ad",   kind: "ad",   src: C.zoo.src,  dur: C.zoo.dur,  at: t0 + 60 },
          { id: "show2", resume: "show" }
        ]
      },
      liquid: {
        title: "Liquid TV",
        offset: 90,
        entries: (t0) => [
          { id: "a", title: "Liquid Hour", kind: "show", src: C.rick.src, dur: C.rick.dur, at: t0 },
          { id: "b", title: "Liquid ID",   kind: "id",   src: C.id.src,   dur: C.id.dur,   at: t0 + 120 },
          { id: "c", resume: "a" }
        ]
      },
      ball: {
        title: "Ball World",
        offset: 15,
        entries: (t0) => [
          { id: "g1", title: "Warm-up",     kind: "show", src: C.rick.src, dur: C.rick.dur, at: t0 },
          { id: "g2", title: "Ball Break",  kind: "ad",   src: C.zoo.src,  dur: C.zoo.dur,  at: t0 + 45 },
          { id: "g3", resume: "g1" }
        ]
      },
      fish: {
        title: "FISH ON!",
        offset: 200,
        entries: (t0) => [
          { id: "f1", title: "Morning Cast", kind: "show", src: C.rick.src, dur: C.rick.dur, at: t0 },
          { id: "f2", title: "Tackle Tip",   kind: "ad",   src: C.zoo.src,  dur: C.zoo.dur,  at: t0 + 90 },
          { id: "f3", resume: "f1" }
        ]
      },
      cynews: {
        title: "CyNews",
        offset: 5,
        entries: (t0) => [
          { id: "n1", title: "Top Stories",  kind: "show", src: C.rick.src, dur: C.rick.dur, at: t0 },
          { id: "n2", title: "Weather Break",kind: "ad",   src: C.zoo.src,  dur: C.zoo.dur,  at: t0 + 30 },
          { id: "n3", resume: "n1" }
        ]
      },
      // Public Mux HLS test stream (Big Buck Bunny style). Duration is approximate for the guide clock.
      stream: {
        title: "HLS Test",
        offset: 10,
        entries: (t0) => [
          { id: "h1", title: "Mux HLS Demo", kind: "show",
            src: "hls:https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", dur: 600, at: t0 },
          { id: "h2", title: "Station Break", kind: "ad", src: C.zoo.src, dur: C.zoo.dur, at: t0 + 120 },
          { id: "h3", resume: "h1" }
        ]
      }
    };
    const pat = patterns[chId] || patterns.sample;
    const t0 = now - (pat.offset || 30);
    return {
      title: pat.title,
      loop: true,
      start: t0,
      entries: pat.entries(t0)
    };
  }
  function bcSaveChannels() {
    try {
      kv.set("bcast-channels", JSON.stringify({ ch: bc.ch, custom: bc.custom || [] }));
    } catch (_) {}
  }
  function bcLoadChannel(ch, opts) {
    opts = opts || {};
    const c = typeof ch === "string" ? bcFindCh(ch) : ch;
    if (!c) return note("Unknown channel. Try: bcast ch", "err");
    const prevTuned = bc.tuned;
    if (bc.tuned) { bc.tuned = false; bcStopMedia(); }
    bc.ch = c.id;
    bc.failed = {};
    bcSaveChannels();
    if (c.kind === "demo" || !c.url) {
      bcSet(bcDemoSchedule(c.id), { source: "built-in · " + c.title, fetchedAt: Date.now() });
      bc.url = "";
      note("Channel: " + c.title + (prevTuned || opts.tune ? " — retuning…" : ""));
      if (prevTuned || opts.tune) bcTune();
      else renderBC();
      rebuildWindowMenus();
      return;
    }
    // Shared schedule from cyos-channels (or any remote JSON URL on the dial)
    note("Loading " + c.title + "…");
    rebuildWindowMenus();
    bcFetch(c.url, false).then((ok) => {
      if (!ok) return;
      note("Channel: " + c.title + (prevTuned || opts.tune ? " — tuning…" : ""));
      if (prevTuned || opts.tune) bcTune();
      else renderBC();
      rebuildWindowMenus();
    });
  }
  function bcRenderDial() {
    const u = bc.ui;
    if (!u || !u.dial) return;
    const list = bcAllChannels();
    u.dial.innerHTML = list.map((c, i) => {
      const on = c.id === bc.ch ? " on" : "";
      return '<button type="button" data-ch="' + c.id + '" class="' + on.trim() + '" title="' + c.title + ' (' + (i + 1) + ')">' +
        (c.icon ? c.icon + " " : "") + c.title + "</button>";
    }).join("");
  }
  const BC_DRIFT = 4;   // seconds of difference tolerated before we seek back to live
  const YT_ERR = { 2: "that video id is not valid", 5: "this video can't play in an embedded player", 100: "the video was not found or is private",
    101: "the owner doesn't allow embedding", 150: "the owner doesn't allow embedding" };
  const bcHMS = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(s).padStart(2, "0");
  };
  const bcIn = (sec) => {
    sec = Math.max(0, Math.round(sec));
    if (sec < 90) return sec + "s";
    if (sec < 5400) return Math.floor(sec / 60) + "m " + String(sec % 60).padStart(2, "0") + "s";
    return Math.floor(sec / 3600) + "h " + String(Math.floor(sec / 60) % 60).padStart(2, "0") + "m";
  };
  const bcClock = (sec) => {
    const d = new Date(sec * 1000), t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toDateString() === new Date().toDateString() ? t : d.toLocaleDateString([], { weekday: "short" }) + " " + t;
  };
  const bcTag = (seg) => (seg.kind ? " [" + seg.kind + "]" : "") + (seg.resumed ? " (resumed)" : "") + (seg.cut ? " (cut short)" : "");
  const bcKey = (a) => a.seg.id + "|" + a.shift;

  function bcNow(t) {
    if (!bc.tl || !bc.tl.ok) return { title: bc.error ? "Schedule error" : "No schedule loaded", meta: bc.error || "Try: bcast sample   (a demo)   or   bcast load <url>", pct: 0 };
    const a = BC.at(bc.tl, t);
    if (a.state === "on") {
      return { title: "ON AIR  " + a.seg.title + bcTag(a.seg),
        meta: bcHMS(a.mediaPos) + " / " + bcHMS(a.seg.dur) + "   ends in " + bcIn(a.slotLeft),
        pct: Math.min(100, (a.mediaPos / a.seg.dur) * 100) };
    }
    if (a.state === "gap") return { title: "OFF AIR", meta: "next program in " + bcIn(a.slotLeft), pct: 0 };
    if (a.state === "before") return { title: "NOT STARTED", meta: "first program in " + bcIn(a.startsIn), pct: 0 };
    if (a.state === "ended") return { title: "SCHEDULE ENDED", meta: "load a newer schedule: bcast load <url>", pct: 100 };
    return { title: "Nothing on", meta: "", pct: 0 };
  }
  function bcUpLines(t, n) {
    return BC.upcoming(bc.tl, t, n).map((u) =>
      bcClock(u.start).padEnd(10) + (u.seg.gap ? "off air" : u.seg.title + bcTag(u.seg)) + "  in " + bcIn(u.start - t));
  }
  function bcFootText() {
    const bits = [];
    bits.push("source: " + (bc.source || "none"));
    if (bc.tl && bc.tl.ok) bits.push(bc.tl.entries + " entries, " + bc.tl.warnings.length + " warning(s)" + (bc.tl.loop ? ", looping" : ""));
    if (bc.fetchedAt) bits.push("fetched " + new Date(bc.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    if (bcp.cur && bcp.cur.type) bits.push("playing via " + bcp.cur.type);
    return bits.join(" · ") + (bc.error && bc.tl ? "\nlast reload failed: " + bc.error : "");
  }
  function bcVisible() {
    const w = WIN.broadcast;
    if (!w || !w.el) return false;
    const r = w.el.getBoundingClientRect();
    return r.width > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0;
  }

  /* --- media control --- */
  function bcApplyVol() {
    try {
      if (bcp.yt && bcp.ytReady) { bcp.yt.setVolume(bcp.vol); if (bcp.muted) bcp.yt.mute(); else bcp.yt.unMute(); }
    } catch (_) {}
    if (bc.ui && bc.ui.vid) { bc.ui.vid.volume = bcp.vol / 100; bc.ui.vid.muted = bcp.muted; }
  }
  function bcShow(type) {
    if (!bc.ui) return;
    const useVid = type === "file" || type === "hls";
    bc.ui.ytBox.style.visibility = type === "yt" ? "visible" : "hidden";
    bc.ui.vid.style.display = useVid ? "block" : "none";
  }
  function bcStopMedia() {
    try { if (bcp.yt && bcp.ytReady) bcp.yt.stopVideo(); } catch (_) {}
    if (bcp.hls) {
      try { bcp.hls.destroy(); } catch (_) {}
      bcp.hls = null;
    }
    if (bc.ui && bc.ui.vid) {
      const v = bc.ui.vid;
      try { v.pause(); v.removeAttribute("src"); v.removeAttribute("srcObject"); v.load(); } catch (_) {}
    }
    bcp.cur = null; bcp.tap = false; bcp.fileKind = "";
  }
  function bcFail(msg) {
    if (bcp.cur) bc.failed[bcp.cur.key] = msg;
    bcStopMedia();
    bcSlate();
  }
  function bcWithYT(cb) {
    if (window.YT && typeof window.YT.Player === "function") return cb(null);
    bcp.ytWait.push(cb);
    if (bcp.ytLoading) return;
    bcp.ytLoading = true;
    const prev = window.onYouTubeIframeAPIReady;
    const done = (err) => { bcp.ytLoading = false; bcp.ytWait.splice(0).forEach((f) => f(err)); };
    window.onYouTubeIframeAPIReady = function () {   // chain CyTube's own handler, if it has one
      try { if (typeof prev === "function") prev.apply(this, arguments); } catch (_) {}
      done(null);
    };
    const sc = document.createElement("script");
    sc.src = "https://www.youtube.com/iframe_api"; sc.async = true;
    sc.onerror = () => done("The YouTube player could not be loaded (blocked or offline).");
    document.head.appendChild(sc);
    setTimeout(() => { if (bcp.ytLoading && !(window.YT && window.YT.Player)) done("The YouTube player took too long to load."); }, 15000);
  }
  function bcWithHls(cb) {
    if (window.Hls && typeof window.Hls === "function") return cb(null);
    if (window.Hls && window.Hls.isSupported) return cb(null);
    bcp.hlsWait.push(cb);
    if (bcp.hlsLoading) return;
    bcp.hlsLoading = true;
    const done = (err) => { bcp.hlsLoading = false; bcp.hlsWait.splice(0).forEach((f) => f(err)); };
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";
    s.async = true;
    s.onload = () => done(window.Hls ? null : "hls.js loaded but Hls is missing");
    s.onerror = () => done("Could not load hls.js from the CDN.");
    document.head.appendChild(s);
    setTimeout(() => { if (bcp.hlsLoading) done("hls.js took too long to load."); }, 15000);
  }
  function bcNativeHls() {
    const v = bc.ui && bc.ui.vid;
    return !!(v && v.canPlayType && v.canPlayType("application/vnd.apple.mpegurl"));
  }
  function bcEnsureYT() {
    if (bcp.yt || !bc.ui) return;
    bcp.yt = {};   // placeholder so we only start once
    bcWithYT((err) => {
      if (err) { bcp.yt = null; bcp.msg = err; bcSlate(); return; }
      bcp.ytReady = false;
      bcp.yt = new window.YT.Player(bc.ui.ytTarget, {
        width: "100%", height: "100%",
        playerVars: { controls: 0, disablekb: 1, rel: 0, modestbranding: 1, playsinline: 1, fs: 0, iv_load_policy: 3, origin: location.origin },
        events: {
          onReady: () => { bcp.ytReady = true; bcp.msg = ""; bcApplyVol(); },
          onStateChange: (e) => { bcp.ytState = e.data; },
          onError: (e) => bcFail(YT_ERR[e.data] || ("player error " + e.data))
        }
      });
    });
  }
  function bcPlayVidAt(key, a) {
    const v = bc.ui.vid;
    if (!bcp.cur || bcp.cur.key !== key) return;
    const now = BC.at(bc.tl, Date.now() / 1000);
    const pos = now.state === "on" && bcKey(now) === key ? now.mediaPos : a.mediaPos;
    try { if (isFinite(pos) && pos >= 0) v.currentTime = pos; } catch (_) {}
    bcApplyVol();
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => { bcp.tap = true; bcSlate(); });
  }
  function bcLoadFile(a, key, src) {
    bcShow("file");
    const v = bc.ui.vid;
    // tear previous hls if any
    if (bcp.hls) { try { bcp.hls.destroy(); } catch (_) {} bcp.hls = null; }
    bcp.cur = { key, type: "file", at: Date.now() };
    bcp.msg = ""; bcp.tap = false; bcp.graceUntil = Date.now() + 5000;
    bcp.fileKind = "file";
    v.onerror = () => {
      if (bcp.cur && bcp.cur.key === key)
        bcFail("the video file could not be loaded (format, CORS, or network)");
    };
    v.src = src.url;
    if (v.readyState >= 1) bcPlayVidAt(key, a);
    else v.addEventListener("loadedmetadata", () => bcPlayVidAt(key, a), { once: true });
  }
  function bcLoadHls(a, key, src) {
    bcShow("hls");
    const v = bc.ui.vid;
    bcp.cur = { key, type: "hls", at: Date.now() };
    bcp.msg = ""; bcp.tap = false; bcp.graceUntil = Date.now() + 8000;
    bcp.fileKind = "hls";
    // Safari / iOS: native HLS
    if (bcNativeHls() && !(window.Hls && window.Hls.isSupported && window.Hls.isSupported())) {
      if (bcp.hls) { try { bcp.hls.destroy(); } catch (_) {} bcp.hls = null; }
      v.onerror = () => { if (bcp.cur && bcp.cur.key === key) bcFail("native HLS failed to load this stream"); };
      v.src = src.url;
      if (v.readyState >= 1) bcPlayVidAt(key, a);
      else v.addEventListener("loadedmetadata", () => bcPlayVidAt(key, a), { once: true });
      return;
    }
    const startWithHls = (err) => {
      if (err) return bcFail(err);
      if (!bcp.cur || bcp.cur.key !== key) return;
      if (!window.Hls || !window.Hls.isSupported || !window.Hls.isSupported()) {
        // last resort: try native tag anyway
        if (bcNativeHls()) {
          v.src = src.url;
          if (v.readyState >= 1) bcPlayVidAt(key, a);
          else v.addEventListener("loadedmetadata", () => bcPlayVidAt(key, a), { once: true });
          return;
        }
        return bcFail("HLS is not supported in this browser");
      }
      if (bcp.hls) { try { bcp.hls.destroy(); } catch (_) {} bcp.hls = null; }
      const hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        startPosition: Math.max(0, a.mediaPos || 0)
      });
      bcp.hls = hls;
      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (!data || !bcp.cur || bcp.cur.key !== key) return;
        if (data.fatal) {
          const detail = (data.type || "") + (data.details ? ": " + data.details : "");
          bcFail("HLS error" + (detail ? " (" + detail + ")" : ""));
        }
      });
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        if (!bcp.cur || bcp.cur.key !== key) return;
        try {
          const pos = Math.max(0, a.mediaPos || 0);
          if (pos > 0.5) hls.startLoad(pos);
        } catch (_) {}
        bcPlayVidAt(key, a);
      });
      hls.loadSource(src.url);
      hls.attachMedia(v);
      bcp.msg = "Loading HLS stream…";
      bcSlate();
    };
    if (window.Hls && window.Hls.isSupported && window.Hls.isSupported()) startWithHls(null);
    else {
      bcp.msg = "Loading hls.js…";
      bcSlate();
      bcWithHls(startWithHls);
    }
  }
  function bcLoad(a, key) {
    const src = a.seg.src;
    if (src.type === "yt") {
      bcShow("yt");
      if (!bcp.ytReady) { bcEnsureYT(); if (!bcp.msg) bcp.msg = "Loading the YouTube player…"; bcSlate(); return; }
      try { bcp.yt.loadVideoById({ videoId: src.id, startSeconds: Math.max(0, a.mediaPos) }); }
      catch (e) { bcp.cur = { key, type: "yt", at: Date.now() }; return bcFail("player error: " + (e && e.message || e)); }
      bcp.cur = { key, type: "yt", at: Date.now() };
      bcp.msg = ""; bcp.tap = false; bcp.graceUntil = Date.now() + 5000;
      bcApplyVol();
    } else if (src.type === "file") {
      bcLoadFile(a, key, src);
    } else if (src.type === "hls") {
      bcLoadHls(a, key, src);
    } else {
      bcp.cur = { key, type: src.type, at: Date.now() };
      bcFail("this kind of source (" + src.type + ") is not supported yet");
    }
  }
  function bcDrift(a) {
    const now = Date.now(), c = bcp.cur;
    if (c.type === "yt") {
      if (!bcp.ytReady) return;
      let st, pos;
      try { pos = bcp.yt.getCurrentTime(); st = bcp.yt.getPlayerState(); } catch (_) { return; }
      if (st === 1) {
        bcp.tap = false;
        if (bcp.msg === "Still buffering…") bcp.msg = "";
        if (now > bcp.graceUntil && Math.abs(pos - a.mediaPos) > BC_DRIFT) { try { bcp.yt.seekTo(a.mediaPos, true); } catch (_) {} bcp.graceUntil = now + 4000; }
      } else if (st === 3) {   // buffering: not the same as being blocked, so no tap button, just say so if it drags on
        if (!bcp.tap) bcp.msg = now - c.at > 8000 ? "Still buffering…" : "";
      } else if (st === 2 || st === 5 || st === -1) {
        if (now - c.at > 6000) bcp.tap = true;
        else { try { bcp.yt.playVideo(); } catch (_) {} }
      }
    } else if (c.type === "file" || c.type === "hls") {
      const v = bc.ui && bc.ui.vid;
      if (!v) return;
      if (v.paused) {
        if (now - c.at > 1500 && v.readyState >= 2) {
          const pr = v.play();
          if (pr && pr.catch) pr.catch(() => { bcp.tap = true; });
        } else if (now - c.at > 10000) {
          bcp.msg = bcp.msg || "Still buffering…";
        }
      } else {
        bcp.tap = false;
        if (bcp.msg === "Still buffering…" || bcp.msg === "Loading HLS stream…" || bcp.msg === "Loading hls.js…") bcp.msg = "";
        // Live HLS often has no meaningful seek; only drift-correct VOD-like media
        const canSeek = c.type === "file" || (v.duration && isFinite(v.duration) && v.duration < 86400);
        if (canSeek && now > bcp.graceUntil && Math.abs(v.currentTime - a.mediaPos) > BC_DRIFT) {
          try { v.currentTime = a.mediaPos; } catch (_) {}
          bcp.graceUntil = now + 4000;
        }
      }
    }
  }
  function bcControl() {
    if (!bc.tuned) return;
    const a = BC.at(bc.tl, Date.now() / 1000);
    if (a.state !== "on") { if (bcp.cur) bcStopMedia(); bcSlate(); return; }
    const key = bcKey(a);
    if (bc.failed[key]) { if (bcp.cur) bcStopMedia(); bcSlate(); return; }
    if (!bcp.cur || bcp.cur.key !== key) bcLoad(a, key);
    else bcDrift(a);
    bcSlate();
  }
  function bcSlate() {
    const u = bc.ui;
    if (!u) return;
    let msg = "", btn = "", show = true;
    if (!bc.tuned) {
      msg = "The broadcast plays here, in this window."; btn = "\u25B6 Tune in";
    } else {
      const a = bc.tl && bc.tl.ok ? BC.at(bc.tl, Date.now() / 1000) : { state: "none" };
      if (a.state === "gap") msg = "OFF AIR\nnext program in " + bcIn(a.slotLeft);
      else if (a.state === "before") msg = "NOT STARTED\nfirst program in " + bcIn(a.startsIn);
      else if (a.state === "ended") msg = "SCHEDULE ENDED";
      else if (a.state === "none") msg = "Nothing on. Load a schedule: bcast load <url>";
      else if (bc.failed[bcKey(a)]) msg = "Can't play this one:\n" + bc.failed[bcKey(a)] + "\nthe next program will start on time";
      else if (bcp.msg) msg = bcp.msg;
      else if (bcp.tap) { msg = "The browser is waiting for a tap to start playback."; btn = "\u25B6 Start"; }
      else show = false;
    }
    u.slate.style.display = show ? "flex" : "none";
    u.slateMsg.textContent = msg;
    u.slateBtn.style.display = btn ? "" : "none";
    u.slateBtn.textContent = btn;
  }
  function bcDuck(on) {   // optional: silence CyTube's own player while tuned in (bcast duck on)
    const P = window.PLAYER;
    if (!P || typeof P.setVolume !== "function") return;
    try {
      if (on) {
        const mute = (v) => { if (bcp.roomVol == null) bcp.roomVol = v; P.setVolume(0); };
        if (typeof P.getVolume === "function") P.getVolume(mute); else mute(1);
      } else if (bcp.roomVol != null) { P.setVolume(bcp.roomVol); bcp.roomVol = null; }
    } catch (_) {}
  }
  function bcTune() {
    if (!bc.tl || !bc.tl.ok) return note("Nothing to tune in to yet. Try: bcast sample   or   bcast load <url>", "err");
    bc.tuned = true; bcp.msg = ""; bcp.tap = false; bcp.cur = null;
    openWin("broadcast");
    if (bcp.duck) bcDuck(true);
    bcEnsureYT();
    bcControl();
    renderBC(); rebuildWindowMenus();
    note("Tuned in.");
  }
  function bcUntune() {
    bc.tuned = false;
    bcStopMedia();
    bcDuck(false);
    bcSlate(); renderBC(); rebuildWindowMenus();
    note("Tuned out.");
  }

  /* --- window --- */
  function renderBC() {
    const u = bc.ui;
    if (!u) return;
    const t = Date.now() / 1000, n = bcNow(t);
    const ch = bcFindCh(bc.ch);
    const chLabel = ch ? ch.title : (bc.ch || "Broadcast");
    u.head.textContent = chLabel + (bc.tl && bc.tl.title && bc.tl.title !== chLabel ? " · " + bc.tl.title : "") + " · " + new Date().toLocaleTimeString();
    u.nowT.textContent = n.title;
    u.nowM.textContent = n.meta;
    u.bar.style.width = n.pct.toFixed(1) + "%";
    if (bc.tl && bc.tl.ok) {
      const lines = BC.upcoming(bc.tl, t, 12).map((u2) => {
        const mark = (u2.start - t) < 1 ? "▶ " : "  ";
        return mark + bcClock(u2.start).padEnd(10) + (u2.seg.gap ? "off air" : u2.seg.title + bcTag(u2.seg)) + "  in " + bcIn(u2.start - t);
      });
      u.list.textContent = lines.join("\n") || "(nothing after this)";
    } else {
      u.list.textContent = "";
    }
    u.foot.textContent = bcFootText() + (ch ? "\nchannel: " + ch.title + (ch.url ? " · " + ch.url : " · built-in demo") : "");
    u.tuneBtn.textContent = bc.tuned ? "Tune out" : "Tune in";
    u.muteBtn.textContent = bcp.muted ? "Unmute" : "Mute";
    bcRenderDial();
    bcSlate();
  }
  function mountBroadcast(body) {
    body.innerHTML = '<div class="cyos-bc">' +
      '<div class="cyos-bc-dial" role="tablist" aria-label="Broadcast channels"></div>' +
      '<div class="cyos-bc-stage"><div class="cyos-bc-yt"><div class="cyos-bc-ytp"></div></div><video playsinline preload="auto"></video><div class="cyos-bc-shield"></div>' +
      '<div class="cyos-bc-slate"><div class="cyos-bc-slatemsg"></div><button type="button">Tune in</button></div></div>' +
      '<div class="cyos-bc-ctl"><button type="button" data-a="tune">Tune in</button><button type="button" data-a="mute">Mute</button>' +
      '<input type="range" min="0" max="100" value="80" aria-label="Broadcast volume"></div>' +
      '<div class="cyos-bc-head"></div><div class="cyos-bc-now"><b></b><div></div></div>' +
      '<div class="cyos-bc-bar"><i></i></div><pre class="cyos-bc-list"></pre><div class="cyos-bc-foot"></div></div>';
    const r = body.firstChild;
    bc.ui = { head: q(".cyos-bc-head", r), nowT: q(".cyos-bc-now b", r), nowM: q(".cyos-bc-now div", r), bar: q(".cyos-bc-bar i", r),
      list: q(".cyos-bc-list", r), foot: q(".cyos-bc-foot", r), ytBox: q(".cyos-bc-yt", r), ytTarget: q(".cyos-bc-ytp", r), vid: q("video", r),
      slate: q(".cyos-bc-slate", r), slateMsg: q(".cyos-bc-slatemsg", r), slateBtn: q(".cyos-bc-slate button", r),
      tuneBtn: q('.cyos-bc-ctl [data-a="tune"]', r), muteBtn: q('.cyos-bc-ctl [data-a="mute"]', r), vol: q('.cyos-bc-ctl input', r),
      dial: q(".cyos-bc-dial", r) };
    bc.ui.slate.style.whiteSpace = "pre-line";
    bc.ui.slateBtn.addEventListener("click", () => {
      if (!bc.tuned) return bcTune();
      if (bcp.tap) {
        bcp.tap = false; bcp.msg = "";
        try {
          if (bcp.cur && bcp.cur.type === "yt") bcp.yt.playVideo();
          else if (bc.ui && bc.ui.vid) bc.ui.vid.play();
        } catch (_) {}
        bcSlate();
      }
    });
    bc.ui.tuneBtn.addEventListener("click", () => (bc.tuned ? bcUntune() : bcTune()));
    bc.ui.muteBtn.addEventListener("click", () => { bcp.muted = !bcp.muted; bcApplyVol(); renderBC(); rebuildWindowMenus(); });
    bc.ui.vol.addEventListener("input", () => { bcp.vol = parseInt(bc.ui.vol.value, 10) || 0; if (bcp.vol > 0) bcp.muted = false; bcApplyVol(); renderBC(); });
    bc.ui.dial.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-ch]");
      if (!btn) return;
      bcLoadChannel(btn.getAttribute("data-ch"));
    });
    bc.ui.vol.value = String(bcp.vol);
    bcRenderDial();
    renderBC();
  }
  function bcSet(json, opt) {
    opt = opt || {};
    const tl = BC.build(json);
    if (!tl.ok) { bc.error = tl.errors[0] + (tl.errors.length > 1 ? " (+" + (tl.errors.length - 1) + " more; bcast log)" : ""); bc.lastBad = tl; renderBC(); return tl; }
    bc.tl = tl; bc.error = ""; bc.lastBad = null;
    bc.source = opt.source || bc.source;
    if (opt.fetchedAt) bc.fetchedAt = opt.fetchedAt;
    renderBC();
    return tl;
  }
  const bcUrl = (v) => {
    try {
      const u = new URL(String(v || "").trim(), location.href);
      if (u.protocol === "https:" || (u.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname))) return u.href;
    } catch (_) {}
    return null;
  };
  function bcFetch(url, silent) {
    const u = bcUrl(url);
    if (!u) { if (!silent) note("Schedule links must be https (http only for localhost).", "err"); return Promise.resolve(false); }
    if (bc.fetching) return Promise.resolve(false);
    bc.fetching = true;
    return fetch(u, { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then((text) => {
        let json;
        try { json = JSON.parse(text); } catch (e) { throw new Error("not valid JSON (" + e.message + ")"); }
        const tl = bcSet(json, { source: u, fetchedAt: Date.now() });
        if (!tl.ok) { if (!silent) note("Schedule problem: " + bc.error, "err"); return false; }
        bc.url = u;
        kv.set("bcast", { url: u, text: text, fetchedAt: bc.fetchedAt });
        if (!silent) note("Schedule loaded: " + tl.entries + " entries, " + tl.warnings.length + " warning(s).");
        return true;
      })
      .catch((e) => {
        const m = String(e && e.message || e);
        bc.error = "could not load (" + (/Failed to fetch|NetworkError|Load failed/i.test(m) ? "blocked or offline: CORS or the page's security policy?" : m) + ")";
        if (!silent) note("Broadcast: " + bc.error, "err");
        renderBC();
        return false;
      })
      .then((ok) => { bc.fetching = false; renderBC(); return ok; });
  }
  function bcSample() {
    bcLoadChannel("sample");
    note("Sample channel loaded (3½-min show, short ad cut, then resume, loops). Run: bcast tune");
  }
  function bcTick() {
    if (bc.tuned) { try { bcControl(); } catch (_) {} }
    if (!bcVisible()) return;
    renderBC();
    if (bc.url && !bc.fetching && Date.now() - bc.fetchedAt > 300000) bcFetch(bc.url, true);
  }
  const bcApi = { set: (obj, opt) => bcSet(obj, opt), build: BC.build, at: (t) => BC.at(bc.tl, t == null ? Date.now() / 1000 : t), timeline: () => bc.tl,
    tune: () => bcTune(), untune: () => bcUntune(), isTuned: () => bc.tuned,
    channels: () => bcAllChannels().map((c) => ({ id: c.id, title: c.title, url: c.url || null, kind: c.kind || "remote" })),
    channel: () => bc.ch, loadChannel: (id) => bcLoadChannel(id) };

  cmd(["bcast", "broadcast"], "bcast [ch|tune|untune|mute|vol|duck|load|reload|now|next|guide|sample|log|status|clear]", "Multi-channel fixed-time broadcast + TV guide", "local", (a) => {
    const sub = (a[0] || "").toLowerCase();
    if (!sub) return toggleWin("broadcast");
    if (sub === "tune") return bcTune();
    if (sub === "untune") return bcUntune();
    if (sub === "mute" || sub === "unmute") { bcp.muted = sub === "mute"; bcApplyVol(); renderBC(); rebuildWindowMenus(); return note(bcp.muted ? "Broadcast muted." : "Broadcast unmuted."); }
    if (sub === "vol") {
      const v = parseInt(a[1], 10);
      if (!(v >= 0 && v <= 100)) return note("Usage: bcast vol <0-100>", "err");
      bcp.vol = v; if (v > 0) bcp.muted = false;
      if (bc.ui) bc.ui.vol.value = String(v);
      bcApplyVol(); renderBC();
      return note("Broadcast volume " + v + "%.");
    }
    if (sub === "duck") {
      const on = (a[1] || "").toLowerCase();
      if (on !== "on" && on !== "off") return note("Usage: bcast duck on|off   (silence the room's own player while tuned in)", "err");
      bcp.duck = on === "on";
      if (bc.tuned) bcDuck(bcp.duck);
      return note(bcp.duck ? "The room's player will be silenced while you are tuned in (if CyTube allows it)." : "The room's player is left alone.");
    }
    if (sub === "ch" || sub === "channel" || sub === "channels") {
      const arg = (a[1] || "").toLowerCase();
      if (!arg || arg === "ls" || arg === "list") {
        const list = bcAllChannels();
        list.forEach((c, i) => {
          const mark = c.id === bc.ch ? "●" : "○";
          termOut("ok", mark + " " + String(i + 1).padStart(2) + "  " + c.title.padEnd(14) + (c.url ? c.url : "(built-in demo)"));
        });
        return note(list.length + " channel(s). Switch: bcast ch <name|n>");
      }
      if (arg === "add") {
        const name = (a[2] || "").trim();
        const url = a[3] || "";
        if (!name || !url) return note("Usage: bcast ch add <name> <https://…/schedule.json>", "err");
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "ch";
        if (BC_BUILTIN.some((c) => c.id === id)) return note("'" + id + "' is a built-in channel name.", "err");
        const u = bcUrl(url);
        if (!u) return note("Schedule URL must be https.", "err");
        bc.custom = (bc.custom || []).filter((c) => c.id !== id);
        bc.custom.push({ id, title: name.slice(0, 32), url: u, kind: "remote" });
        bcSaveChannels();
        bcRenderDial();
        return note("Channel added: " + name + " → " + u + "  (bcast ch " + id + ")");
      }
      if (arg === "rm" || arg === "del" || arg === "remove") {
        const name = (a[2] || "").toLowerCase();
        if (!name) return note("Usage: bcast ch rm <name>", "err");
        if (BC_BUILTIN.some((c) => c.id === name || c.title.toLowerCase() === name)) return note("Built-in channels can't be removed.", "err");
        const before = (bc.custom || []).length;
        bc.custom = (bc.custom || []).filter((c) => c.id !== name && c.title.toLowerCase() !== name);
        if (bc.custom.length === before) return note("No custom channel named \"" + name + "\".", "err");
        if (bc.ch === name) bc.ch = "sample";
        bcSaveChannels();
        bcRenderDial();
        return note("Removed channel \"" + name + "\".");
      }
      // switch
      return bcLoadChannel(a.slice(1).join(" ") || a[1]);
    }
    if (sub === "guide") {
      if (!bc.tl || !bc.tl.ok) return note("No schedule loaded. Try: bcast ch sample", "err");
      const n = Math.max(1, Math.min(40, parseInt(a[1], 10) || 12));
      const t = Date.now() / 1000;
      const ch = bcFindCh(bc.ch);
      termOut("ok", "— " + (ch ? ch.title : "Broadcast") + " guide —");
      const cur = bcNow(t);
      termOut("ok", "NOW  " + cur.title + (cur.meta ? "  " + cur.meta : ""));
      BC.upcoming(bc.tl, t, n).forEach((u2) => {
        termOut("ok", bcClock(u2.start).padEnd(10) + (u2.seg.gap ? "off air" : u2.seg.title + bcTag(u2.seg)) + "  in " + bcIn(u2.start - t));
      });
      return note(n + " upcoming on " + (ch ? ch.title : "this channel") + ".");
    }
    if (sub === "load") {
      if (!a[1]) return note("Usage: bcast load <url to a schedule .json>", "err");
      // treat as one-shot custom load on current dial slot (does not add a permanent channel)
      return bcFetch(a[1], false);
    }
    if (sub === "reload") return bc.url ? bcFetch(bc.url, false) : note("No schedule link to reload. Use bcast load <url> or bcast ch <name>.", "err");
    if (sub === "sample") return bcSample();
    if (sub === "now") {
      const n = bcNow(Date.now() / 1000);
      termOut("ok", n.title);
      if (n.meta) termOut("ok", n.meta);
      return note(n.title);
    }
    if (sub === "next") {
      if (!bc.tl || !bc.tl.ok) return note("No schedule loaded.", "err");
      const lines = bcUpLines(Date.now() / 1000, Math.max(1, Math.min(30, parseInt(a[1], 10) || 5)));
      if (!lines.length) return note("Nothing after the current program.");
      lines.forEach((ln) => termOut("ok", ln));
      return note(lines.length + " upcoming.");
    }
    if (sub === "log") {
      const tl = bc.lastBad || bc.tl;
      if (!tl) return note("No schedule loaded.");
      const all = tl.errors.map((m) => "error: " + m).concat(tl.warnings.map((m) => "warning: " + m));
      if (!all.length) return note("No errors or warnings.");
      all.forEach((m) => termOut("ok", m));
      return note(all.length + " message(s).");
    }
    if (sub === "status") {
      const ch = bcFindCh(bc.ch);
      termOut("ok", "channel: " + (ch ? ch.title + " (" + ch.id + ")" : bc.ch || "none"));
      bcFootText().split("\\n").forEach((ln) => termOut("ok", ln));
      termOut("ok", "tuned: " + (bc.tuned ? "yes" : "no") + " · volume " + bcp.vol + "%" + (bcp.muted ? " (muted)" : "") + " · room player " + (bcp.duck ? "silenced while tuned" : "left alone"));
      return note(bc.tl && bc.tl.ok ? "Schedule loaded." : "No schedule loaded.");
    }
    if (sub === "clear") {
      if (bc.tuned) bcUntune();
      bc.tl = null; bc.url = ""; bc.error = ""; bc.source = ""; bc.fetchedAt = 0; bc.failed = {}; kv.del("bcast"); renderBC();
      return note("Schedule cleared.");
    }
    note("Usage: bcast [ch|tune|untune|mute|vol|duck|load|reload|now|next|guide|sample|log|status|clear]", "err");
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
        y: MB + G + Math.floor(Math.random() * 40),
        w: W, h: H
      };
    }
  }

  function addDesktopIcon(def) {
    const desktop = ui.desktop || q("#cyos-desktop");
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

  /* ---------- Scheduler (v0.12.0) ---------- */
  const sched = {
    title: "Untitled station",
    loop: true,
    start: "",
    entries: [],
    createdBy: "",
    createdAt: "",
    updatedAt: "",
    ui: null,
    probing: false
  };
  let schedApi = null;
  const schedAuthor = () => {
    try {
      if (window.CLIENT && typeof CLIENT.name === "string" && CLIENT.name && CLIENT.name !== "Anonymous")
        return CLIENT.name;
    } catch (_) {}
    return "";
  };
  const schedIsoNow = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const schedEnsureMeta = () => {
    if (!sched.createdAt) sched.createdAt = schedIsoNow();
    const who = schedAuthor();
    if (who) sched.createdBy = who;
    sched.updatedAt = schedIsoNow();
  };
  const schedNewId = () => "e" + Date.now().toString(36) + Math.floor(Math.random() * 36).toString(36);
  function schedEmpty() {
    sched.title = "Untitled station";
    sched.loop = true;
    sched.start = "";
    sched.entries = [];
    sched.createdBy = "";
    sched.createdAt = "";
    sched.updatedAt = "";
  }
  function schedToJson() {
    schedEnsureMeta();
    const out = {
      title: String(sched.title || "Untitled station").slice(0, 80),
      loop: !!sched.loop,
      entries: sched.entries.map((e) => {
        const row = {
          id: e.id || schedNewId(),
          title: String(e.title || "").slice(0, 80),
          kind: e.kind || "show",
          src: e.src,
          dur: Math.max(1, Math.round(Number(e.dur) || 0) || 1)
        };
        if (e.at) row.at = e.at;
        return row;
      })
    };
    if (sched.start) out.start = sched.start;
    if (sched.createdBy) out.createdBy = sched.createdBy;
    if (sched.createdAt) out.createdAt = sched.createdAt;
    if (sched.updatedAt) out.updatedAt = sched.updatedAt;
    return out;
  }
  function schedFromJson(json) {
    if (!json || typeof json !== "object") return false;
    sched.title = typeof json.title === "string" ? json.title.slice(0, 80) : "Untitled station";
    sched.loop = json.loop !== false;
    sched.start = typeof json.start === "string" ? json.start : (json.start != null ? String(json.start) : "");
    sched.createdBy = typeof json.createdBy === "string" ? json.createdBy : "";
    sched.createdAt = typeof json.createdAt === "string" ? json.createdAt : "";
    sched.updatedAt = typeof json.updatedAt === "string" ? json.updatedAt : "";
    const entries = Array.isArray(json.entries) ? json.entries : [];
    sched.entries = entries.filter((e) => e && e.src).map((e) => ({
      id: e.id || schedNewId(),
      title: e.title || "",
      kind: e.kind || "show",
      src: e.src || "",
      dur: Math.max(0, Number(e.dur) || 0),
      at: e.at || ""
    }));
    return true;
  }
  function schedPersist() {
    const blob = schedToJson();
    return kv.set("sched-draft", blob).then(() => true, () => false);
  }
  function schedLoadDraft() {
    return kv.get("sched-draft").then((v) => {
      if (v && typeof v === "object") schedFromJson(v);
      renderSched();
      return !!v;
    }, () => false);
  }
  function schedAdd(srcRaw, title) {
    const raw = String(srcRaw || "").trim();
    if (!raw) return { ok: false, err: "need a media URL or yt:ID" };
    const parsed = BC.parseSrc(raw);
    if (!parsed) return { ok: false, err: "could not parse source (use yt:ID, https://….mp4, or .m3u8)" };
    const src = parsed.raw || raw;
    const entry = {
      id: schedNewId(),
      title: (title && String(title).trim()) || (parsed.type === "yt" ? ("yt:" + parsed.id) : "Untitled"),
      kind: "show",
      src,
      dur: 0,
      at: ""
    };
    sched.entries.push(entry);
    schedEnsureMeta();
    schedPersist();
    renderSched();
    return { ok: true, entry };
  }
  function schedRm(n) {
    const i = parseInt(n, 10) - 1;
    if (!(i >= 0 && i < sched.entries.length)) return false;
    sched.entries.splice(i, 1);
    schedEnsureMeta();
    schedPersist();
    renderSched();
    return true;
  }
  function schedClear() {
    schedEmpty();
    return kv.del("sched-draft").then(() => { renderSched(); return true; }, () => { renderSched(); return true; });
  }
  function schedExport(name) {
    if (!sched.entries.length) return note("Draft is empty — nothing to export.", "err");
    const json = schedToJson();
    const bad = json.entries.filter((e) => !(e.dur > 0));
    const text = JSON.stringify(json, null, 2) + "\n";
    const slug = String(name || json.title || "schedule").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "schedule";
    const filename = "schedule-" + slug + ".json";
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (_) {} }, 2000);
    } catch (e) {
      return note("Export failed: " + (e && e.message || e), "err");
    }
    schedPersist();
    note("Exported " + filename + " (" + json.entries.length + " entries)" + (bad.length ? "; " + bad.length + " missing duration(s)" : "") +
      (json.createdBy ? " · by " + json.createdBy : ""));
  }
  function schedProbeOne(entry) {
    return new Promise((resolve) => {
      const parsed = BC.parseSrc(entry.src);
      if (!parsed || parsed.type === "yt" || parsed.type === "hls") return resolve(false);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        try { v.removeAttribute("src"); v.load(); } catch (_) {}
        resolve(ok);
      };
      const tmo = setTimeout(() => finish(false), 12000);
      v.onloadedmetadata = () => {
        clearTimeout(tmo);
        if (isFinite(v.duration) && v.duration > 0) {
          entry.dur = Math.round(v.duration);
          finish(true);
        } else finish(false);
      };
      v.onerror = () => { clearTimeout(tmo); finish(false); };
      v.src = parsed.url || entry.src;
    });
  }
  function schedDur() {
    if (sched.probing) return note("Already probing durations…");
    const need = sched.entries.filter((e) => !(e.dur > 0));
    if (!need.length) return note("All rows already have a duration.");
    sched.probing = true;
    note("Probing " + need.length + " duration(s)…");
    let i = 0, ok = 0;
    const next = () => {
      if (i >= need.length) {
        sched.probing = false;
        schedEnsureMeta();
        schedPersist();
        renderSched();
        return note("Duration probe done: " + ok + "/" + need.length + " updated.");
      }
      const e = need[i++];
      schedProbeOne(e).then((yes) => { if (yes) ok++; renderSched(); next(); });
    };
    next();
  }
  function schedApply() {
    if (!sched.entries.length) return note("Draft is empty.", "err");
    const json = schedToJson();
    const tl = bcSet(json, { source: "scheduler draft", fetchedAt: Date.now() });
    if (!tl || !tl.ok) return note("Draft is not a valid schedule: " + (bc.error || "unknown"), "err");
    bc.url = "";
    note("Draft applied to Broadcast (local preview — not published). Use bcast tune to play.");
    openWin("broadcast");
  }
  function renderSched() {
    const u = sched.ui;
    if (!u) return;
    if (u.title) u.title.value = sched.title || "";
    if (u.loop) u.loop.checked = !!sched.loop;
    if (u.start) u.start.value = sched.start || "";
    if (u.tbody) {
      u.tbody.innerHTML = sched.entries.map((e, i) => {
        return "<tr data-i=\"" + i + "\">" +
          "<td>" + (i + 1) + "</td>" +
          "<td><input data-f=\"title\" value=\"" + String(e.title || "").replace(/"/g, "&quot;") + "\" /></td>" +
          "<td><input data-f=\"src\" value=\"" + String(e.src || "").replace(/"/g, "&quot;") + "\" /></td>" +
          "<td><input data-f=\"dur\" style=\"width:4.5em\" value=\"" + (e.dur > 0 ? e.dur : "") + "\" placeholder=\"?\" /></td>" +
          "<td><select data-f=\"kind\">" +
            ["show", "ad", "id", "break"].map((k) => "<option value=\"" + k + "\"" + (e.kind === k ? " selected" : "") + ">" + k + "</option>").join("") +
          "</select></td>" +
          "<td><button type=\"button\" class=\"cyos-sched-rm\" data-rm=\"" + (i + 1) + "\">×</button></td>" +
          "</tr>";
      }).join("") || "<tr><td colspan=\"6\" style=\"opacity:.7\">No rows. sched add &lt;url&gt; [title]</td></tr>";
    }
    if (u.foot) {
      const total = sched.entries.reduce((s, e) => s + (Number(e.dur) || 0), 0);
      const bits = [];
      bits.push(sched.entries.length + " entr" + (sched.entries.length === 1 ? "y" : "ies"));
      bits.push("~" + Math.round(total / 60) + " min");
      if (sched.createdBy) bits.push("by " + sched.createdBy);
      if (sched.createdAt) bits.push("created " + sched.createdAt);
      if (sched.updatedAt) bits.push("updated " + sched.updatedAt);
      u.foot.textContent = bits.join(" · ");
    }
  }
  function mountScheduler(body) {
    body.innerHTML =
      '<div class="cyos-sched">' +
        '<div class="cyos-sched-meta">' +
          '<label>Title <input type="text" data-m="title" maxlength="80" /></label>' +
          '<label><input type="checkbox" data-m="loop" /> loop</label>' +
          '<label>Start <input type="text" data-m="start" placeholder="2026-11-03T00:00:00Z" style="min-width:14em" /></label>' +
        '</div>' +
        '<div class="cyos-sched-tools">' +
          '<button type="button" data-a="add">Add URL…</button>' +
          '<button type="button" data-a="dur">Probe durs</button>' +
          '<button type="button" data-a="export">Export JSON</button>' +
          '<button type="button" data-a="apply">Apply → Broadcast</button>' +
          '<button type="button" data-a="clear">Clear</button>' +
        '</div>' +
        '<table class="cyos-sched-table"><thead><tr><th>#</th><th>Title</th><th>Source</th><th>Dur s</th><th>Kind</th><th></th></tr></thead><tbody></tbody></table>' +
        '<div class="cyos-sched-foot"></div>' +
      '</div>';
    const r = body.firstChild;
    sched.ui = {
      title: q('[data-m="title"]', r),
      loop: q('[data-m="loop"]', r),
      start: q('[data-m="start"]', r),
      tbody: q("tbody", r),
      foot: q(".cyos-sched-foot", r)
    };
    const metaSave = () => {
      sched.title = sched.ui.title.value;
      sched.loop = !!sched.ui.loop.checked;
      sched.start = sched.ui.start.value.trim();
      schedEnsureMeta();
      schedPersist();
      renderSched();
    };
    sched.ui.title.addEventListener("change", metaSave);
    sched.ui.loop.addEventListener("change", metaSave);
    sched.ui.start.addEventListener("change", metaSave);
    r.querySelector(".cyos-sched-tools").addEventListener("click", (e) => {
      const a = e.target && e.target.getAttribute && e.target.getAttribute("data-a");
      if (!a) return;
      if (a === "add") {
        const url = window.prompt("Media URL or yt:VIDEOID");
        if (!url) return;
        const title = window.prompt("Title (optional)", "") || "";
        const res = schedAdd(url, title);
        if (!res.ok) note(res.err, "err");
        else note("Added row " + sched.entries.length + ".");
      } else if (a === "dur") schedDur();
      else if (a === "export") schedExport();
      else if (a === "apply") schedApply();
      else if (a === "clear") ask("Clear scheduler draft?", () => { schedClear(); note("Scheduler draft cleared."); });
    });
    sched.ui.tbody.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-rm]");
      if (!btn) return;
      schedRm(btn.getAttribute("data-rm"));
    });
    sched.ui.tbody.addEventListener("change", (e) => {
      const tr = e.target.closest("tr[data-i]");
      if (!tr) return;
      const i = parseInt(tr.getAttribute("data-i"), 10);
      const row = sched.entries[i];
      if (!row) return;
      const f = e.target.getAttribute("data-f");
      if (f === "title") row.title = e.target.value;
      else if (f === "src") row.src = e.target.value.trim();
      else if (f === "dur") row.dur = Math.max(0, parseInt(e.target.value, 10) || 0);
      else if (f === "kind") row.kind = e.target.value;
      schedEnsureMeta();
      schedPersist();
      renderSched();
    });
    schedLoadDraft();
  }
  schedApi = {
    add: schedAdd, list: () => sched.entries.slice(), rm: schedRm, clear: schedClear,
    export: schedExport, toJson: schedToJson, render: renderSched
  };
  cmd(["sched", "scheduler", "schedule"], "sched [add|list|rm|clear|export|dur|apply|set|load|status]", "Draft broadcast schedule (IndexedDB + export JSON)", "local", (a, raw) => {
    const sub = (a[0] || "").toLowerCase();
    if (!sub) return toggleWin("scheduler");
    if (sub === "add") {
      const url = a[1];
      if (!url) return note("Usage: sched add <url|yt:ID> [title]", "err");
      const title = a.slice(2).join(" ").trim();
      const res = schedAdd(url, title);
      if (!res.ok) return note(res.err, "err");
      return note("Added #" + sched.entries.length + ": " + (res.entry.title || res.entry.src));
    }
    if (sub === "list") {
      if (!sched.entries.length) return note("Draft empty.");
      sched.entries.forEach((e, i) => note((i + 1) + ". [" + (e.dur || "?") + "s] " + (e.title || "") + "  " + e.src));
      return;
    }
    if (sub === "rm" || sub === "del") {
      if (!schedRm(a[1])) return note("Usage: sched rm <n>", "err");
      return note("Removed row.");
    }
    if (sub === "clear") {
      if (!sched.entries.length && !sched.createdAt) return note("Draft already empty.");
      return ask("Clear scheduler draft?", () => { schedClear(); note("Scheduler draft cleared."); });
    }
    if (sub === "export") return schedExport(a[1]);
    if (sub === "dur" || sub === "probe") return schedDur();
    if (sub === "apply") return schedApply();
    if (sub === "status") {
      const j = schedToJson();
      return note("Scheduler: \"" + j.title + "\" · " + j.entries.length + " entries · loop=" + j.loop +
        (j.createdBy ? " · by " + j.createdBy : " · (not logged in)") +
        (j.createdAt ? " · " + j.createdAt : ""));
    }
    if (sub === "set") {
      const key = (a[1] || "").toLowerCase();
      const val = a.slice(2).join(" ").trim();
      if (key === "title") {
        if (!val) return note("Usage: sched set title <name>", "err");
        sched.title = val.slice(0, 80);
      } else if (key === "loop") {
        if (/^(off|0|false|no)$/i.test(val)) sched.loop = false;
        else if (/^(on|1|true|yes)$/i.test(val) || val === "") sched.loop = true;
        else return note("Usage: sched set loop on|off", "err");
      } else if (key === "start") {
        if (val && !/(Z|[+-]\d{2}:?\d{2})$/i.test(val) && !/^\d+(\.\d+)?$/.test(val))
          return note("Start needs Z or a UTC offset, e.g. 2026-11-03T00:00:00Z", "err");
        sched.start = val;
      } else {
        return note("Usage: sched set title|loop|start …", "err");
      }
      schedEnsureMeta();
      schedPersist();
      renderSched();
      return note("Updated " + key + ".");
    }
    if (sub === "load") {
      const u = a[1];
      if (!u) return note("Usage: sched load <https://…/schedule.json>", "err");
      const href = bcUrl(u);
      if (!href) return note("Need an https schedule URL.", "err");
      note("Loading into scheduler…");
      return fetch(href, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      }).then((text) => {
        let json;
        try { json = JSON.parse(text); } catch (e) { throw new Error("not JSON"); }
        if (!schedFromJson(json)) throw new Error("bad schedule");
        if (!sched.createdAt) sched.createdAt = schedIsoNow();
        const who = schedAuthor();
        if (who) sched.createdBy = who;
        sched.updatedAt = schedIsoNow();
        schedPersist();
        renderSched();
        openWin("scheduler");
        note("Loaded " + sched.entries.length + " entries into scheduler draft.");
      }).catch((e) => note("sched load failed: " + (e && e.message || e), "err"));
    }
    note("Usage: sched [add|list|rm|clear|export|dur|apply|set|load|status]", "err");
  });


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
      openWin, closeWin, toggleWin, focusWin,
      getAlpha, setAlpha, applyAlpha,
      note, log, run, dispatch,
      store: kv, trace: () => TRACE.slice(), broadcast: bcApi,
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
    trace("pal", "open");
    S.desk = false; S.move = false; flag();
    pal.on = true;
    pal.el.classList.add("on");
    pal.input.value = pre || "";
    pal.input.focus();
    hints();
  }

  function closePalette() {
    trace("pal", "close");
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
    // Close on an outside tap (not on every blur: Android soft keyboards can blur an input without the user leaving it).
    document.addEventListener("pointerdown", (e) => {
      if (pal.on && pal.el && !pal.el.contains(e.target) && !(e.target.closest && e.target.closest('[data-m="pal"]'))) { trace("pal", "close:outside-tap"); closePalette(); }
    }, true);
    ["focus", "blur"].forEach((t) => pal.input.addEventListener(t, (e) => trace("pal", t, e)));
    ["compositionstart", "compositionend"].forEach((t) => pal.input.addEventListener(t, (e) => trace("pal", t, e)));
    pal.input.addEventListener("beforeinput", (e) => trace("pal", "beforeinput", e));
    const goBtn = pal.el.querySelector(".cyos-pal-go");
    if (goBtn) {
      goBtn.addEventListener("pointerdown", (e) => e.preventDefault());   // keep the keyboard and focus in the input
      goBtn.addEventListener("click", () => { trace("pal", "go-button"); if (pal.input.value.trim()) submit(); });
    }
    let downAt = 0;   // last handled Enter keydown, so its keyup does not run the command twice
    const submit = () => {
      const v = pal.input.value;
      trace("pal", "submit len=" + v.length);
      closePalette();
      if (v.trim()) pal.hist.push(v);
      pal.hi = pal.hist.length;
      run(v);
      exitDesk();
    };
    pal.input.addEventListener("keyup", (e) => {
      trace("pal", "keyup", e);
      if (!isEnterKey(e)) return;
      e.stopPropagation();
      if (downAt && Date.now() - downAt < 1500) { downAt = 0; return; }
      downAt = 0;
      if (pal.on && pal.input.value.trim()) { e.preventDefault(); submit(); }
    });
    pal.input.addEventListener("keydown", (e) => {
      trace("pal", "keydown", e);
      e.stopPropagation();
      downAt = isEnterKey(e) ? Date.now() : 0;
      if (e.key === "Escape") { e.preventDefault(); closePalette(); exitDesk(); }
      else if (isEnterKey(e)) {
        e.preventDefault();
        submit();
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

    // Broadcast-focused shortcuts (before global snap digits)
    if (w === "broadcast" && !S.move) {
      if (/^[1-9]$/.test(lk)) {
        const list = bcAllChannels();
        const ch = list[parseInt(lk, 10) - 1];
        if (ch) { bcLoadChannel(ch.id); e.preventDefault(); e.stopPropagation(); return; }
      }
      if (lk === "t") { bc.tuned ? bcUntune() : bcTune(); e.preventDefault(); e.stopPropagation(); return; }
      if (lk === "m") {
        bcp.muted = !bcp.muted; bcApplyVol(); renderBC(); rebuildWindowMenus();
        note(bcp.muted ? "Broadcast muted." : "Broadcast unmuted.");
        e.preventDefault(); e.stopPropagation(); return;
      }
      if (lk === "g") { dispatch("bcast", ["guide"], "", false); e.preventDefault(); e.stopPropagation(); return; }
    }

    switch (lk) {
      case "c": dispatch("chat", [], "", false); exitDesk(); break;
      case "v": dispatch("video", [], "", false); break;
      case "p": dispatch("list", [], "", false); break;
      case "o": dispatch("console", [], "", false); break;
      case "y": dispatch("terminal", [], "", false); break;
      case "e": dispatch("notes", [], "", false); break;
      case "b": dispatch("bcast", [], "", false); break;
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
      case "w": closeWin(w); break;
      case "g": dispatch(e.shiftKey ? "tileall" : "tile", [], "", false); break;
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
    const typing = !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || "") || t.isContentEditable);
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
      '<input type="text" class="cyos-term-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send" ' +
      'aria-label="Terminal command" placeholder="cmd · help · cmds · status" />' +
      '<button type="button" class="cyos-term-go" aria-label="Run command" title="Run (Enter)">Run</button>' +
      "</div>";
    document.body.appendChild(termEl);
    ui.termLog = termEl.querySelector(".cyos-term-log");
    ui.termInput = termEl.querySelector(".cyos-term-input");
    ui.termStatus = termEl.querySelector(".cyos-term-status");
    termWrite("sys", "CyTube OS Terminal " + VERSION + " — same dispatcher as Ctrl+K and /chat.");
    termWrite("sys", "Status strip above shows version · focus · layout · playlist lock. Try: status, wins, ls, cmds.");

    if (ui.termInput) {
      ui.termPs = termEl.querySelector(".cyos-term-ps");
      // keyup acts as a fallback when keydown did not already run the command (see isEnterKey).
      const isEnter = isEnterKey;
      let downAt = 0;   // time of the last Enter keydown we handled; its keyup must not run the command again
      const termEnter = () => {
        if (S.pending) {
          const v = ui.termInput.value.trim().toLowerCase();
          ui.termInput.value = "";
          if (v === "y" || v === "yes") answer(true);
          else if (v === "n" || v === "no" || v === "") answer(false);
          else termWrite("sys", "Please answer y or n.");
          return;
        }
        const v = ui.termInput.value;
        ui.termInput.value = "";
        termRun(v);
      };
      ui.termInput.addEventListener("keydown", (e) => {
        trace("term", "keydown", e);
        downAt = isEnter(e) ? Date.now() : 0;   // any other key means the previous Enter press is over
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
          if (isEnter(e)) {
            e.preventDefault();
            e.stopPropagation();
            termEnter();
            return;
          }
          // Allow typing y/n as text then Enter; block history while pending
          if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); return; }
          return;
        }
        if (isEnter(e)) {
          e.preventDefault();
          e.stopPropagation();
          termEnter();
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
      ui.termInput.addEventListener("keyup", (e) => {
        trace("term", "keyup", e);
        if (!isEnter(e)) return;
        if (downAt && Date.now() - downAt < 1500) { downAt = 0; return; }   // keydown already handled this press
        downAt = 0;
        if (!ui.termInput.value.trim()) return;
        e.preventDefault();
        termEnter();
      });
      const goBtn = termEl.querySelector(".cyos-term-go");
      if (goBtn) {
        goBtn.addEventListener("click", () => {
          if (ui.termInput.value.trim() || S.pending) termEnter();
          try { ui.termInput.focus({ preventScroll: true }); } catch (_) {}
        });
      }
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
      if (["mac", "term", "amber", "cyan"].includes(saved.theme)) S.theme = saved.theme;

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
        S.min = {};   // v0.7.0: minimize was removed; ignore any saved minimized state so no window stays hidden
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
        S.mode = ["split", "custom", "theater", "pip", "tile"].includes(saved.mode) ? saved.mode : "custom";
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
      if (S.desk && e.target && e.target.matches && e.target.matches("input,textarea")) { S.desk = false; S.move = false; flag(); }
    });
    if (!hookSocket()) { let n = 0; const t = setInterval(() => { if (hookSocket() || ++n > 40) clearInterval(t); }, 500); }

    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(refresh, 100); });

    focusWin(S.focus);
    rebuildWindowMenus();
    if (!mobile() && q("#chatline")) q("#chatline").focus({ preventScroll: true });
    publishAPI();
    // Notes is registered through the same public Window API plugins use.
    registerWindow({ id: "notes", title: "Notes", icon: "\u270E", mount: mountNotes, noCommand: true });
    registerWindow({ id: "broadcast", title: "Broadcast", icon: "\u25C9", mount: mountBroadcast, noCommand: true });
    registerWindow({ id: "scheduler", title: "Scheduler", icon: "\u2630", mount: mountScheduler, noCommand: true });
    schedLoadDraft();
    setInterval(bcTick, 1000);
    // Show the last saved schedule at once (it also works offline), then refresh it in the background.
        kv.get("bcast-channels").then((rec) => {
      if (!rec || typeof rec.text !== "string") return;
      try {
        const o = JSON.parse(rec.text);
        if (Array.isArray(o.custom)) bc.custom = o.custom.filter((c) => c && c.id && c.url);
        if (o.ch) bc.ch = String(o.ch);
      } catch (_) {}
    }).then(() => kv.get("bcast")).then((rec) => {
      // Prefer restoring the last selected channel (demo or remote). Fall back to saved schedule blob.
      const ch = bcFindCh(bc.ch);
      if (ch && ch.kind === "demo") {
        bcLoadChannel(ch.id);
        return;
      }
      if (ch && ch.url) {
        bcFetch(ch.url, true);
        return;
      }
      if (!rec || typeof rec.text !== "string") {
        // first run: land on Sample so the window isn't empty
        bcLoadChannel("sample");
        return;
      }
      let json = null;
      try { json = JSON.parse(rec.text); } catch (_) {}
      if (json) { bcSet(json, { source: rec.url || "saved copy", fetchedAt: rec.fetchedAt || 0 }); if (bc.tl) bc.url = rec.url || ""; }
      if (rec.url) bcFetch(rec.url, true);
    });
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
