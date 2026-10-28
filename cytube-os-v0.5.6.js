/* ============================================================
   CyTube OS - v0.5.6
   Retro grayscale desktop + keyboard-first window manager.
   Skins CyTube's own chat / video / playlist elements (nothing is
   rebuilt, so emotes, formatting and slash commands keep working).
   Install: Channel Settings > Edit > JavaScript.
   Escape hatch: add ?plain=1 to the channel URL for the normal page.

   v0.5.4: public registration API (window.CyOS)
   v0.5.5: Terminal window + declarative confirm option
   v0.5.6: Terminal-native y/n confirms; more shell commands (ls, status, cmds…)
   ============================================================ */
(() => {
  "use strict";

  const VERSION = "0.5.6";
  if (window.__cyos || /[?&]plain\b/.test(location.search)) return;
  window.__cyos = true;

  const MB = 24, TB = 20, ICON = 84, TAB = 38, G = 10;
  const KEY = "cyos:v1:" + location.pathname;
  let DEFS = [
    ["chat", "Chat", "#chatwrap", "\u25A4"],
    ["video", "Video", "#videowrap", "\u25B6"],
    ["list", "Playlist", "#playlistrow", "\u2630"],
    ["console", "Console", "#cyos-console", "\u25A3"],
    ["terminal", "Terminal", "#cyos-terminal", ">"],
    ["help", "Help", "#cyos-help", "?"]
  ];
  const defId = (d) => Array.isArray(d) ? d[0] : d.id;
  const defTitle = (d) => Array.isArray(d) ? d[1] : (d.title || d.id);
  const defIcon = (d) => Array.isArray(d) ? (d[3] || "") : (d.icon || "\u25A1");
  const WIN = {};
  const S = {
    mode: "split", theme: "mac", rects: {}, open: { chat: true, video: true, list: true, console: false, terminal: false, help: false },
    sysmsg: true, pending: null, pendingT: 0, min: {},
    saved: null, z: 10, focus: "chat", desk: false, move: false,
    tab: "chat", sel: -1, users: false, nav: false
  };
  const ui = {};
  const pal = { el: null, input: null, hint: null, hist: [], hi: 0, on: false };
  const term = { hist: [], hi: 0, mirror: true };
  let noteTimer = 0;
  let termRunDepth = 0;

  const q = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mobile = () => innerWidth < 760;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const safe = (fn, d) => { try { return fn(); } catch (_) { return d; } };

  const load = () => safe(() => JSON.parse(localStorage.getItem(KEY) || "null"), null);
  const save = () => safe(() => localStorage.setItem(KEY, JSON.stringify({
    mode: S.mode, theme: S.theme, rects: S.rects, open: S.open, min: S.min, sysmsg: S.sysmsg
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

body.cyos .cyos-win{position:fixed!important;display:flex!important;flex-direction:column;box-sizing:border-box!important;
  margin:0!important;padding:0!important;max-width:none!important;max-height:none!important;min-width:0!important;float:none!important;
  overflow:hidden!important;border:2px solid var(--fg)!important;border-radius:0!important;
  background:var(--bg)!important;color:var(--fg)!important;box-shadow:3px 3px 0 var(--fg)!important}
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
body.cyos-desk .cyos-focus>.cyos-bar i{background:repeating-linear-gradient(var(--bg) 0 1px,transparent 1px 3px)}
body.cyos-desk .cyos-focus>.cyos-bar .cyos-box{border-color:var(--bg)}
.cyos-grow{position:absolute;right:0;bottom:0;width:14px;height:14px;z-index:7;cursor:nwse-resize;touch-action:none;
  background:linear-gradient(135deg,transparent 50%,var(--fg) 50% 56%,transparent 56% 70%,var(--fg) 70% 76%,transparent 76%)}

/* chat */
body.cyos #chatwrap #chatheader{display:none!important}
body.cyos #chatwrap #userlist{display:none!important}
body.cyos.cyos-users #chatwrap #userlist{display:block!important;flex:0 0 auto;float:none!important;width:auto!important;
  max-height:28%;overflow:auto;border-bottom:2px solid var(--fg);background:var(--bg)!important;color:var(--fg)!important}
body.cyos #chatwrap #messagebuffer{flex:1 1 auto!important;height:auto!important;min-height:0!important;width:auto!important;float:none!important;
  overflow-y:auto!important;margin:0!important;border:0!important;padding:6px 8px!important;font:inherit!important;
  background:var(--bg)!important;color:var(--fg)!important}
body.cyos #chatwrap #messagebuffer *{color:inherit!important;background:transparent!important;text-shadow:none!important}
body.cyos #chatwrap #messagebuffer .username{font-weight:700}
body.cyos #chatwrap #messagebuffer .timestamp{opacity:.6}
body.cyos #chatwrap #messagebuffer a{text-decoration:underline}
body.cyos #chatwrap #chatline{flex:0 0 auto;width:100%!important;height:auto!important;margin:0!important;border:0!important;
  border-top:2px solid var(--fg)!important;border-radius:0!important;box-shadow:none!important;padding:7px 8px!important;
  font:inherit!important;background:var(--bg)!important;color:var(--fg)!important}
body.cyos.cyos-theater #chatwrap,body.cyos.cyos-theater #chatwrap #messagebuffer,body.cyos.cyos-theater #chatwrap #chatline{
  background:color-mix(in srgb,var(--bg) 76%,transparent)!important}

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
.cyos-body{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;padding-bottom:14px}
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
.cyos-flag{border:2px solid var(--fg);padding:1px 6px}
body.cyos-desk .cyos-flag{background:var(--fg);color:var(--bg)}
.cyos-icons{position:absolute;top:${MB + 14}px;right:10px;width:64px;display:flex;flex-direction:column;gap:14px}
.cyos-ico{all:unset;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-weight:700;font-size:11px;text-align:center}
.cyos-ico b{width:40px;height:34px;display:grid;place-items:center;background:var(--bg);color:var(--fg);
  border:2px solid var(--fg);box-shadow:2px 2px 0 var(--fg);font-size:18px}
.cyos-ico span{background:var(--bg);padding:0 3px}
.cyos-ico:hover b,.cyos-ico:focus-visible b{background:var(--fg);color:var(--bg)}
body.cyos-theater .cyos-icons{display:none}
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
  white-space:pre-wrap;overflow-wrap:anywhere}
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
    if (ui.termLog && (termRunDepth > 0 || kind === "ask")) termWrite(kind, text);
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
    const t = String(line || "").trim();
    if (!t) return;
    term.hist.push(t);
    if (term.hist.length > 80) term.hist.shift();
    term.hi = term.hist.length;
    termWrite("echo", "$ " + t);
    termRunDepth++;
    try { run(t); } finally { termRunDepth--; }
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
    if (denyPermission(pos === "next" ? "playlistnext" : "playlistadd", "adding media")) return;
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
    S.open = { chat: true, video: true, list: true, console: keepConsole, terminal: keepTerm, help: keepHelp };
    // Re-attach any registered (non-core) windows that were open
    DEFS.forEach((d) => {
      const id = defId(d);
      if (["chat","video","list","console","terminal","help"].indexOf(id) >= 0) return;
      if (prevOpen[id]) S.open[id] = true;
    });
    S.min = {};
    R.console = { x: G, y: MB + H - 200 - G, w: Math.min(620, W - 2 * G), h: 200 };
    R.terminal = { x: Math.max(G, W - 520 - G), y: MB + H - 280 - G, w: Math.min(520, W - 2 * G), h: 260 };
    R.help = { x: Math.max(G, Math.round((innerWidth - 560) / 2)), y: MB + 40, w: Math.min(560, innerWidth - 2 * G), h: Math.max(160, Math.min(540, H - 60)) };
    if (m === "theater") {
      const cw = clamp(Math.round(innerWidth * 0.34), 300, 460), ch = Math.round(H * 0.62);
      R.video = { x: 0, y: MB, w: innerWidth, h: H };
      R.chat = { x: innerWidth - cw - 12, y: MB + H - ch - 12, w: cw, h: ch };
      R.list = { x: G, y: MB + G, w: 360, h: 260 };
      S.open.list = false;
    } else if (m === "pip") {
      const w = clamp(Math.round(W * 0.28), 260, 380), h = Math.round(w * 9 / 16) + TB;
      R.chat = { x: G, y: MB + G, w: W - 2 * G, h: H - 2 * G };
      R.video = { x: W - w - G, y: MB + H - h - G, w, h };
      R.list = { x: G + 40, y: MB + G + 40, w: Math.min(420, W - 80), h: Math.min(360, H - 80) };
      S.open.list = false;
    } else {
      const vw = Math.round(clamp(W * 0.6, 320, Math.max(320, W - 300)));
      const vh = Math.round(vw * 9 / 16) + TB + 4;
      R.video = { x: G, y: MB + G, w: vw, h: vh };
      R.list = { x: G, y: MB + vh + 2 * G, w: vw, h: Math.max(120, H - vh - 3 * G) };
      R.chat = { x: vw + 2 * G, y: MB + G, w: Math.max(260, W - vw - 3 * G), h: H - 2 * G };
    }
  }

  function setMode(m, fresh) {
    const fs = ["theater", "pip"], inFs = fs.includes(S.mode);
    if (fs.includes(m) && !inFs) S.saved = clone({ r: S.rects, o: S.open, m: S.min });
    if (m === "split" && !fresh && inFs && S.saved) {
      S.rects = S.saved.r; S.open = S.saved.o; S.min = S.saved.m || {}; S.saved = null; m = "custom";
    } else {
      if (!fs.includes(m)) S.saved = null;
      layout(m === "custom" ? "split" : m);
    }
    S.mode = m;
    focusWin("chat");
    save();
  }

  function cycleLayout() {
    setMode(S.mode === "theater" ? "pip" : S.mode === "pip" ? "split" : "theater", S.mode === "pip");
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
  }

  function flag() {
    document.body.classList.toggle("cyos-desk", S.desk);
    if (ui.flag) ui.flag.textContent = S.move ? "Move" : S.desk ? "Desk" : "Chat";
  }

  function tabs() {
    document.querySelectorAll(".cyos-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.w === S.tab));
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
    flag();
    tabs();
    renderDock();
  }

  function focusWin(n) {
    if (!WIN[n]) return;
    if (mobile()) S.tab = n; else { S.open[n] = true; S.min[n] = false; }
    S.focus = n;
    WIN[n].el.style.zIndex = String(++S.z);
    refresh();
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
    save();
  }

  function minWin(n) {
    if (!WIN[n]) return;
    if (mobile()) return note("Minimize is for the desktop layout; use the tabs.", "err");
    if (!S.open[n] || S.min[n]) return;
    S.min[n] = true;
    if (S.focus === n) S.focus = topVisible() || n;
    refresh();
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
    if (name === "list" && sel) {
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
    "CyTube OS " + VERSION + " - keyboard reference",
    "",
    "Esc            switch between Chat mode and Desk mode",
    "Ctrl+K         command palette (in Desk mode also / or :)",
    "F10            focus the menu bar; Left/Right changes menus.",
    "Menus: click a top-bar label or focus it and press Enter/Down.",
    "Inside a menu: Up/Down selects; Left/Right switches menus; Enter activates; Esc closes.",
    "Access letters open menus; Ctrl+K opens Commands. Escape returns to Chat outside menus.",
    "Hover or focus controls for tooltips; focus has a visible outline.",
    "",
    "Desk mode keys",
    "  c  v  p  o  y  h  Chat / Video / Playlist / Console / Terminal / Help",
    "  Tab          cycle windows        i or Esc  back to chat",
    "  m            move mode: arrows move, Shift+arrows resize, Enter done",
    "  [  ]         snap left / right half   1 2 3 4  four quarters",
    "  z  r  -      maximize/restore, restore size, minimize",
    "               (same snap key again = back to previous size)",
    "  t  x         theater, picture-in-picture (again = back)",
    "  d  s  l      restore layout, reset to split, cycle layouts",
    "  u  n  a      user list, site navbar, add media",
    "  j k / arrows playlist select; Enter jumps, Delete removes (scrolls this window when Help is active)",
    "",
    "Scope marks:  \u25CB local only   \u25CF room action (not public chat)   \u2709 public chat",
    "Targets:  3  .  $  +1  -1  2-5  /title text/",
    "Commands: add URL, next URL, skip, voteskip, jump T, del T (asks y/n),",
    "  say TEXT, users, sysmsg, console, terminal, clear, theme mac|term, plain,",
    "  theater, pip, dock, split.",
    "  Terminal keeps focus for y/n confirms (del, etc.). Also: Ctrl+K palette, or",
    "  in chat with a slash: /add URL, /skip, /jump 3.",
    "  Other slash commands (/me, /sp, mod commands) go to CyTube as usual.",
    "",
    "Mouse: drag title bars; grow box resizes; drop at a side edge = half, side corner = quarter,",
    "  top edge = maximize. Title-bar boxes: close (left), minimize and maximize (right).",
    "  Minimized windows appear as chips at bottom left; close reopens from icons or the Window menu.",
    "Help is a normal window: move, resize, snap, minimize or close it like the others.",
    "Add ?plain=1 to the URL for the normal CyTube page.",
    "",
    "Developers: window.CyOS.registerWindow({id,title,icon,mount}) and",
    "CyOS.registerCommand({names,usage,desc,scope,fn}) let external scripts",
    "add windows and commands without editing this file (v0.5.4+)."
  ].join("\n");

  function showHelp() { openWin("help"); }
  function hideHelp() { closeWin("help"); }

  function accessLabel(label, key) {
    const i = key ? label.toLowerCase().indexOf(key) : -1;
    return i < 0 ? label : label.slice(0, i) + "<u>" + label[i] + "</u>" + label.slice(i + 1);
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
      default: dispatch(action, arg ? [arg] : [], "", false); break;
    }
  }

  function buildRoot() {
    const iconTips = {chat:'Open and focus Chat (C)',video:'Toggle Video window (V)',list:'Toggle Playlist window (P)',console:'Toggle Console window (O)',terminal:'Toggle Terminal window (Y)',help:'Toggle Help window (H or ?)'};
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
      menuMarkup("View", "v", [["Cycle layout", "layout.cycle", "", "L", "c"], ["Split", "split", "", "", "s"], ["Theater", "theater", "", "", "t"], ["Picture in Picture", "pip", "", "", "p"], ["Dock layout", "dock", "", "", "d"], ["Toggle theme", "theme", "", "", "h"]]) +
      menuMarkup("Window", "w", [["Chat", "win.open", "chat", "C", "c"], ["Video", "video", "", "V", "v"], ["Playlist", "list", "", "P", "p"], ["Console", "console", "", "O", "o"], ["Terminal", "terminal", "", "Y", "e"], ["Help", "help.toggle", "", "H", "h"], ["Minimize", "win.min", "", "-", "m"], ["Maximize / restore", "win.max", "", "Z", "x"], ["Snap left half", "win.snap", "l", "[", "l"], ["Snap right half", "win.snap", "r", "]", "r"], ["Top left quarter", "win.snap", "tl", "1", "t"], ["Top right quarter", "win.snap", "tr", "2", "i"], ["Bottom left quarter", "win.snap", "bl", "3", "b"], ["Bottom right quarter", "win.snap", "br", "4", "u"]]) +
      menuMarkup("Chat", "c", [["Focus Chat", "chat", "", "C", "f"], ["Toggle user list", "users", "", "", "u"], ["Toggle queue notices", "sysmsg", "", "", "q"]]) +
      menuMarkup("Playlist", "p", [["Add media…", "palette.add", "", "", "a"], ["Skip current media", "skip", "", "", "s"], ["Vote to skip", "voteskip", "", "", "v"], ["Jump / delete…", "palette.toggle", "", "Ctrl+K", "j"]]) +
      menuMarkup("Help", "h", [["Keyboard reference", "help.toggle", "", "H", "k"], ["Command palette…", "palette.toggle", "", "Ctrl+K", "p"]]) +
      '<button type="button" class="cyos-legacy" data-m="pal" title="Open command palette (Ctrl+K)">Commands <kbd>Ctrl+K</kbd></button>' +
      '<span class="cyos-confirm"><span></span><button type="button" data-c="y">Yes</button><button type="button" data-c="n">No</button></span>' +
      '<span class="cyos-note"></span><span class="cyos-flag">Chat</span><span class="cyos-clock"></span></nav>' +
      '<div class="cyos-dock" aria-label="Minimized windows"></div>' +
      '<div class="cyos-tabs">' + DEFS.map((d) => '<button type="button" data-w="' + defId(d) + '" title="Switch to ' + defTitle(d) + ' window">' + defTitle(d) + "</button>").join("") + "</div>" +
      '<div class="cyos-pal" role="dialog" aria-label="CyTube OS command palette"><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command palette" title="Type a command; Enter runs it, Up/Down recalls history, Tab completes" placeholder="Type a command (help)"><div class="cyos-hint"></div></div>' +
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
  const cmd = (names, usage, desc, scope, fn, perm) => {
    let confirm = null, p = perm;
    if (perm && typeof perm === "object") {
      confirm = typeof perm.confirm === "function" ? perm.confirm : null;
      p = perm.perm || null;
    }
    const wrapped = confirm
      ? (args, raw) => {
          const prompt = confirm(args, raw);
          if (!prompt) return fn(args, raw);
          ask(prompt, () => fn(args, raw));
        }
      : fn;
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
  cmd(["list", "pl", "playlist"], "list", "Show or hide the playlist window", "local", () => toggleWin("list"));
  cmd(["console", "log"], "console", "Show or hide the Console", "local", () => toggleWin("console"));
  cmd(["terminal", "term", "shell"], "terminal", "Show or hide the Terminal", "local", () => toggleWin("terminal"));
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
    const name = (window.CLIENT && CLIENT.name) || (window.NAME) || "guest";
    const open = DEFS.map(defId).filter((id) => S.open[id] && !S.min[id]);
    const lines = [
      "CyTube OS " + VERSION,
      "user: " + name,
      "focus: " + S.focus + "  theme: " + S.theme + "  layout: " + S.mode,
      "open: " + (open.join(", ") || "(none)"),
      "desk: " + (S.desk ? "on" : "off") + "  sysmsg: " + (S.sysmsg ? "on" : "off")
    ];
    lines.forEach((ln) => { if (termRunDepth > 0 || S.focus === "terminal") termWrite("ok", ln); });
    note(lines[0] + " — " + name + " / " + S.focus);
    if (!(termRunDepth > 0 || S.focus === "terminal")) lines.forEach((ln) => log("ok", ln));
  });
  cmd(["cmds", "commands"], "cmds", "List commands available in Terminal / palette", "local", () => {
    const items = Object.keys(CMD).filter((n) => CMD[n].usage).sort();
    items.forEach((n) => {
      const c = CMD[n];
      const line = (c.usage || n).padEnd(22) + (c.desc || "");
      if (termRunDepth > 0 || S.focus === "terminal") termWrite("ok", line);
      else log("ok", line);
    });
    note(items.length + " commands. Type help for keyboard reference.");
  });
  cmd("wins", "wins", "List windows and open/minimized state", "local", () => {
    DEFS.forEach((d) => {
      const id = defId(d);
      const st = !WIN[id] ? "missing" : S.min[id] ? "min" : S.open[id] ? (S.focus === id ? "FOCUS" : "open") : "closed";
      const line = id.padEnd(12) + st.padEnd(8) + defTitle(d);
      if (termRunDepth > 0 || S.focus === "terminal") termWrite("ok", line);
      else log("ok", line);
    });
  });
  cmd("echo", "echo <text>", "Print text in Terminal / Console", "local", (a, raw) => {
    const t = raw || a.join(" ");
    if (termRunDepth > 0 || S.focus === "terminal") termWrite("ok", t);
    note(t || "(empty)");
  });
  cmd("focus", "focus <window>", "Open and focus a window (chat, video, list, …)", "local", (a) => {
    const n = (a[0] === "playlist" ? "list" : a[0] || "").toLowerCase();
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
  cmd("win.toggle", "win.toggle <name>", "chat, video, list or console", "local", (a) => {
    const n = a[0] === "playlist" ? "list" : a[0];
    if (WIN[n]) toggleWin(n); else note("Windows: chat, video, list, console, terminal, help", "err");
  });
  // UI-only actions live in the same registry/dispatcher but stay out of palette hints.
  cmd("win.open", "", "Open and focus a window", "local", (a) => {
    const n = a[0] === "playlist" ? "list" : a[0];
    if (WIN[n]) openWin(n); else note("Windows: chat, video, list, console, help", "err");
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
    if (denyPermission("playlistjump", "skipping the current item")) return;
    if (emit("playNext")) note("Skip request sent.");
  }, "playlistjump");
  cmd("voteskip", "voteskip", "Vote to skip the current item", "room", () => { if (emit("voteskip")) note("Vote sent."); });
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
  cmd("plain", "plain", "Leave CyTube OS and reload the normal page", "local", () => { location.href = location.pathname + "?plain=1"; });


  /* ---------- public registration API (v0.5.4) ---------- */
  function ensureDefaultState(id, defaultOpen) {
    if (S.open[id] === undefined) S.open[id] = !!defaultOpen;
    if (S.min[id] === undefined) S.min[id] = false;
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
    ensureDefaultState(id, entry.defaultOpen);

    // If the desktop is already built, create the window chrome + icon now
    if (ui.root) {
      makeWindow(entry);
      addDesktopIcon(entry);
      if (entry.defaultOpen) openWin(id);
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
      note, log, run, dispatch,
      getWindows: () => DEFS.map((d) => ({ id: defId(d), title: defTitle(d), icon: defIcon(d) })),
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
    if (S.focus === "list" && S.sel < 0) select(0);
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
      case "Enter": if (w === "list" && S.sel >= 0) jump(S.sel + 1); else exitDesk(); break;
      case "ArrowDown": case "j": if (w === "list") select(1); else if (w === "help") ui.helpPre.scrollTop += 60; else used = false; break;
      case "ArrowUp": case "k": if (w === "list") select(-1); else if (w === "help") ui.helpPre.scrollTop -= 60; else used = false; break;
      case "Delete": case "Backspace": if (w === "list" && S.sel >= 0) del(S.sel + 1); else used = false; break;
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
      '<div class="cyos-term-log" role="log" aria-live="polite"></div>' +
      '<div class="cyos-term-line">' +
      '<span class="cyos-term-ps" aria-hidden="true">$</span>' +
      '<input type="text" class="cyos-term-input" autocomplete="off" autocapitalize="off" spellcheck="false" ' +
      'aria-label="Terminal command" placeholder="type a command (help)" />' +
      "</div>";
    document.body.appendChild(termEl);
    ui.termLog = termEl.querySelector(".cyos-term-log");
    ui.termInput = termEl.querySelector(".cyos-term-input");
    termWrite("sys", "CyTube OS Terminal " + VERSION + " — commands go through the same dispatcher as Ctrl+K and /chat.");
    termWrite("sys", "Try: ls, status, cmds, del 1, add <url>, theme, focus chat. Up/Down history.");

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
      if (typeof saved.sysmsg === "boolean") S.sysmsg = saved.sysmsg;
      if (saved.rects && saved.open) {
        Object.assign(S.rects, saved.rects);
        Object.assign(S.open, saved.open);
        if (saved.min && typeof saved.min === "object") S.min = saved.min;
        // v0.4.x saved maximize state as z0; fold it into the shared snap model (sn = target, pv = previous geometry).
        Object.values(S.rects).forEach((r) => { if (r && r.z0) { r.pv = r.z0; r.sn = "max"; delete r.z0; } });
        S.mode = ["split", "custom", "theater", "pip"].includes(saved.mode) ? saved.mode : "custom";
      }
    }
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
        if (!m || !CMD[m[1].toLowerCase()]) return;
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
    if (!mobile() && q("#chatline")) q("#chatline").focus({ preventScroll: true });
    publishAPI();
    note("CyTube OS " + VERSION + ": Terminal ready (Y / terminal). Ctrl+K palette, ? help. CyOS.registerWindow / registerCommand available.");
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
