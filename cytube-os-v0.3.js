/* ============================================================
   CyTube OS - v0.3
   Retro grayscale desktop + keyboard-first window manager.
   Skins CyTube's own chat / video / playlist elements (nothing is
   rebuilt, so emotes, formatting and slash commands keep working).
   Install: Channel Settings > Edit > JavaScript.
   Escape hatch: add ?plain=1 to the channel URL for the normal page.
   ============================================================ */
(() => {
  "use strict";

  const VERSION = "0.3";
  if (window.__cyos || /[?&]plain\b/.test(location.search)) return;
  window.__cyos = true;

  const MB = 24, TB = 20, ICON = 84, TAB = 38, G = 10;
  const KEY = "cyos:v1:" + location.pathname;
  const DEFS = [
    ["chat", "Chat", "#chatwrap", "\u25A4"],
    ["video", "Video", "#videowrap", "\u25B6"],
    ["list", "Playlist", "#playlistrow", "\u2630"]
  ];
  const WIN = {};
  const S = {
    mode: "split", theme: "mac", rects: {}, open: { chat: true, video: true, list: true },
    saved: null, z: 10, focus: "chat", desk: false, move: false,
    tab: "chat", sel: -1, users: false, nav: false
  };
  const ui = {};
  const pal = { el: null, input: null, hint: null, hist: [], hi: 0, on: false };
  let helpOn = false, noteTimer = 0;

  const q = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mobile = () => innerWidth < 760;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const safe = (fn, d) => { try { return fn(); } catch (_) { return d; } };

  const load = () => safe(() => JSON.parse(localStorage.getItem(KEY) || "null"), null);
  const save = () => safe(() => localStorage.setItem(KEY, JSON.stringify({
    mode: S.mode, theme: S.theme, rects: S.rects, open: S.open
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
body.cyos #videowrap #videowrapheader{flex:0 0 auto;margin:0!important;padding:2px 8px!important;border:0!important;
  border-bottom:2px solid var(--fg)!important;background:var(--bg)!important;color:var(--fg)!important;
  font:12px/1.5 Geneva,"Helvetica Neue",Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.cyos #videowrap .embed-responsive{flex:1 1 auto;height:auto!important;min-height:0;padding:0!important;position:relative}
body.cyos #videowrap #ytapiplayer,body.cyos #videowrap .embed-responsive-item,
body.cyos #videowrap iframe,body.cyos #videowrap video{width:100%!important;height:100%!important}

/* playlist */
.cyos-body{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;padding-bottom:14px}
.cyos-body>*{float:none!important;width:auto!important;margin:0!important;display:block!important}
.cyos-body #rightpane{order:1}.cyos-body #leftpane{order:2;border-top:2px solid var(--fg);padding:6px 8px}
body.cyos #queue{max-height:none!important;height:auto!important;margin:0!important;padding:0!important;list-style:none;
  background:transparent!important;border:0!important}
body.cyos #queue>li{background:transparent!important;color:var(--fg)!important;border:0!important;border-radius:0!important;
  border-bottom:1px dotted var(--fg)!important;padding:3px 8px!important;margin:0!important}
body.cyos #queue>li *{color:inherit!important}
body.cyos #queue>li.queue_active{background:var(--fg)!important;color:var(--bg)!important}
body.cyos #queue>li.cyos-sel{outline:2px solid var(--fg);outline-offset:-3px}
body.cyos #queue>li.queue_active.cyos-sel{outline-color:var(--bg)}
.cyos-body input,.cyos-body button,.cyos-body select{border-radius:0!important;border:2px solid var(--fg)!important;
  background:var(--bg)!important;color:var(--fg)!important;box-shadow:none!important}

/* desktop chrome */
#cyos-root{position:fixed;inset:0;pointer-events:none;z-index:2147483000;color:var(--fg);font:12px/1.2 Geneva,"Helvetica Neue",Arial,sans-serif}
#cyos-root>*{pointer-events:auto}
.cyos-menu{position:absolute;top:0;left:0;right:0;height:${MB}px;box-sizing:border-box;display:flex;align-items:center;gap:6px;
  padding:0 8px;background:var(--bg);border-bottom:2px solid var(--fg);font-weight:700;white-space:nowrap}
.cyos-menu button{all:unset;cursor:pointer;padding:3px 7px;font-weight:700}
.cyos-menu button:hover,.cyos-menu button:focus-visible{background:var(--fg);color:var(--bg)}
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
.cyos-pal,.cyos-help{position:absolute;left:50%;top:14%;transform:translateX(-50%);width:min(580px,94vw);display:none;
  background:var(--bg);border:2px solid var(--fg);box-shadow:4px 4px 0 var(--fg)}
.cyos-pal.on,.cyos-help.on{display:block}
.cyos-pal input{all:unset;display:block;box-sizing:border-box;width:100%;padding:9px 10px;font:14px/1.2 Monaco,Menlo,Consolas,monospace;
  border-bottom:2px solid var(--fg);color:var(--fg)}
.cyos-hint,.cyos-help pre{margin:0;padding:8px 10px;white-space:pre-wrap;font:12px/1.5 Monaco,Menlo,Consolas,monospace;max-height:50vh;overflow:auto}

@media (max-width:759px){
  body.cyos .cyos-bar,body.cyos .cyos-grow,body.cyos .cyos-icons,.cyos-menu .nm{display:none!important}
  body.cyos .cyos-win{border-width:0 0 2px!important;box-shadow:none!important}
  .cyos-tabs{display:flex}
  body.cyos #chatwrap #chatline{font-size:16px!important}
}
`;

  /* ---------- notes, chat, socket helpers ---------- */
  function note(msg, kind) {
    if (!ui.note) return;
    ui.note.textContent = msg;
    ui.note.className = "cyos-note" + (kind === "err" ? " err" : "");
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { ui.note.textContent = ""; }, 6000);
  }

  const can = (perm) => typeof hasPermission === "function" ? safe(() => hasPermission(perm), true) : true;

  function emit(ev, data) {
    if (typeof socket === "undefined" || !socket) { note("Not connected to the channel yet.", "err"); return false; }
    if (data === undefined) socket.emit(ev); else socket.emit(ev, data);
    return true;
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
    if (!url) return note("Usage: add <url>", "err");
    if (!can(pos === "next" ? "playlistnext" : "playlistadd")) return note("You don't have permission to add media.", "err");
    const m = typeof parseMediaLink === "function" ? safe(() => parseMediaLink(url)) : null;
    if (!m || !m.id || !m.type) return note("That link isn't a supported media URL.", "err");
    if (emit("queue", { id: m.id, type: m.type, pos, temp: true })) note("Queued (" + pos + "): " + m.type);
  }

  function rowAt(n) {
    const row = rows()[Number(n) - 1];
    if (!row) note("No playlist entry " + n + ".", "err");
    return row;
  }

  function jump(n) {
    if (!can("playlistjump")) return note("You don't have permission to jump.", "err");
    const row = rowAt(n);
    if (row && emit("jumpTo", uidOf(row))) note("Jumped to " + n + ".");
  }

  function del(n) {
    if (!can("playlistdelete")) return note("You don't have permission to delete.", "err");
    const row = rowAt(n);
    if (row && emit("delete", uidOf(row))) note("Removed entry " + n + ".");
  }

  /* ---------- window geometry ---------- */
  function desk() {
    return { w: innerWidth - (S.mode === "theater" ? 0 : ICON + 8), h: innerHeight - MB };
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
    S.open = { chat: true, video: true, list: true };
    if (m === "theater") {
      const cw = clamp(Math.round(innerWidth * 0.34), 300, 460), ch = Math.round(H * 0.62);
      R.video = { x: 0, y: MB, w: innerWidth, h: H };
      R.chat = { x: innerWidth - cw - 12, y: MB + H - ch - 12, w: cw, h: ch };
      R.list = { x: G, y: MB + G, w: 360, h: 260 };
      S.open.list = false;
    } else if (m === "pip") {
      const w = clamp(Math.round(W * 0.28), 260, 380), h = Math.round(w * 9 / 16) + TB + 26;
      R.chat = { x: G, y: MB + G, w: W - 2 * G, h: H - 2 * G };
      R.video = { x: W - w - G, y: MB + H - h - G, w, h };
      R.list = { x: G + 40, y: MB + G + 40, w: Math.min(420, W - 80), h: Math.min(360, H - 80) };
      S.open.list = false;
    } else {
      const vw = Math.round(clamp(W * 0.6, 320, Math.max(320, W - 300)));
      const vh = Math.round(vw * 9 / 16) + TB + 26 + 4;
      R.video = { x: G, y: MB + G, w: vw, h: vh };
      R.list = { x: G, y: MB + vh + 2 * G, w: vw, h: Math.max(120, H - vh - 3 * G) };
      R.chat = { x: vw + 2 * G, y: MB + G, w: Math.max(260, W - vw - 3 * G), h: H - 2 * G };
    }
  }

  function setMode(m, fresh) {
    const fs = ["theater", "pip"], inFs = fs.includes(S.mode);
    if (fs.includes(m) && !inFs) S.saved = clone({ r: S.rects, o: S.open });
    if (m === "split" && !fresh && inFs && S.saved) {
      S.rects = S.saved.r; S.open = S.saved.o; S.saved = null; m = "custom";
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
    else keepIn(r);
    const open = m ? S.tab === n : !!S.open[n];
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
  }

  function focusWin(n) {
    if (!WIN[n]) return;
    if (mobile()) S.tab = n; else S.open[n] = true;
    S.focus = n;
    WIN[n].el.style.zIndex = String(++S.z);
    refresh();
  }

  function openWin(n) { focusWin(n); save(); }

  function closeWin(n) {
    if (mobile() || !WIN[n]) return;
    S.open[n] = false;
    if (S.focus === n) S.focus = DEFS.map((d) => d[0]).find((k) => S.open[k] && WIN[k]) || "chat";
    refresh();
    save();
  }

  function toggleWin(n) {
    if (!WIN[n]) return;
    if (!mobile() && S.open[n] && S.focus === n) closeWin(n); else openWin(n);
  }

  function cycle(dir) {
    const names = DEFS.map((d) => d[0]).filter((k) => WIN[k] && (mobile() || S.open[k]));
    if (!names.length) return;
    const i = names.indexOf(S.focus);
    focusWin(names[(i + dir + names.length) % names.length]);
  }

  function zoom(n) {
    const r = S.rects[n];
    if (!r || mobile()) return;
    if (r.z0) { Object.assign(r, r.z0); delete r.z0; }
    else { const d = desk(); r.z0 = { x: r.x, y: r.y, w: r.w, h: r.h }; Object.assign(r, { x: 0, y: MB, w: d.w, h: d.h }); }
    place(n);
    save();
  }

  function snap(n, side) {
    const r = S.rects[n];
    if (!r || mobile()) return;
    delete r.z0;
    const d = desk(), hw = Math.floor(d.w / 2);
    if (side === "l") Object.assign(r, { x: 0, y: MB, w: hw, h: d.h });
    else Object.assign(r, { x: hw, y: MB, w: d.w - hw, h: d.h });
    if (S.mode === "split") S.mode = "custom";
    place(n);
    save();
  }

  /* ---------- mouse / touch dragging ---------- */
  function drag(e, name, kind) {
    if (mobile() || (e.button !== undefined && e.button > 0)) return;
    const r = S.rects[name];
    if (!r) return;
    e.preventDefault();
    focusWin(name);
    delete r.z0;
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
        const d = desk();
        if (ev.clientY <= MB + 6) { zoom(name); }
        else if (ev.clientX <= 6) { snap(name, "l"); }
        else if (ev.clientX >= d.w - 8) { snap(name, "r"); }
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
    const [name, title, sel] = def;
    const el = q(sel);
    if (!el) return;
    const bar = document.createElement("div");
    bar.className = "cyos-bar";
    bar.innerHTML = '<button type="button" class="cyos-box" data-a="close" aria-label="Close ' + title + '"></button>' +
      "<i></i><span>" + title + '</span><i></i><button type="button" class="cyos-box" data-a="zoom" aria-label="Zoom ' + title + '"></button>';
    const grow = document.createElement("div");
    grow.className = "cyos-grow";
    if (name === "list") {
      const body = document.createElement("div");
      body.className = "cyos-body";
      while (el.firstChild) body.appendChild(el.firstChild);
      el.appendChild(body);
    }
    el.insertBefore(bar, el.firstChild);
    el.appendChild(grow);
    el.classList.add("cyos-win");
    WIN[name] = { name, el, bar, grow };

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
    "CyTube OS " + VERSION + " - keyboard reference",
    "",
    "Esc            switch between Chat mode and Desk mode",
    "Ctrl+K         command palette (in Desk mode also / or :)",
    "",
    "Desk mode keys",
    "  c  v  p      Chat / Video / Playlist (v and p toggle)",
    "  Tab          cycle windows        i or Esc  back to chat",
    "  m            move mode: arrows move, Shift+arrows resize, Enter done",
    "  [  ]  z      snap left / right half, zoom",
    "  t  x         theater, picture-in-picture (again = back)",
    "  d  s         restore layout, reset to split layout",
    "  u  n  a      user list, site navbar, add media",
    "  j k / arrows playlist select; Enter jumps, Delete removes",
    "",
    "Palette: add URL, next URL, skip, voteskip, jump N, del N,",
    "  say TEXT, users, theme mac|term, plain. Anything starting with /",
    "  is sent to chat, so /me, /sp and moderator commands work.",
    "",
    "Mouse: drag title bars, grow box resizes, drag to a screen edge to snap.",
    "Add ?plain=1 to the URL for the normal CyTube page."
  ].join("\n");

  function showHelp() { ui.helpPre.textContent = HELP; ui.help.classList.add("on"); helpOn = true; }
  function hideHelp() { ui.help.classList.remove("on"); helpOn = false; }

  function buildRoot() {
    const r = document.createElement("div");
    r.id = "cyos-root";
    r.innerHTML =
      '<nav class="cyos-menu"><b>\u25C6 CyTube OS</b>' +
      '<button type="button" class="nm" data-w="chat">Chat</button><button type="button" class="nm" data-w="video">Video</button>' +
      '<button type="button" class="nm" data-w="list">Playlist</button><button type="button" class="nm" data-m="cycle">Layout</button>' +
      '<span class="cyos-note"></span><span class="cyos-flag">Chat</span><span class="cyos-clock"></span></nav>' +
      '<div class="cyos-icons">' +
      DEFS.map((d) => '<button type="button" class="cyos-ico" data-w="' + d[0] + '"><b>' + d[3] + "</b><span>" + d[1] + "</span></button>").join("") +
      '<button type="button" class="cyos-ico" data-m="help"><b>?</b><span>Help</span></button></div>' +
      '<div class="cyos-tabs">' + DEFS.map((d) => '<button type="button" data-w="' + d[0] + '">' + d[1] + "</button>").join("") + "</div>" +
      '<div class="cyos-pal"><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command palette" placeholder="Type a command (help)"><div class="cyos-hint"></div></div>' +
      '<div class="cyos-help"><pre></pre></div>';
    document.body.appendChild(r);
    ui.note = q(".cyos-note", r);
    ui.flag = q(".cyos-flag", r);
    ui.clock = q(".cyos-clock", r);
    ui.help = q(".cyos-help", r);
    ui.helpPre = q(".cyos-help pre", r);
    pal.el = q(".cyos-pal", r);
    pal.input = q(".cyos-pal input", r);
    pal.hint = q(".cyos-hint", r);

    r.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.w) { openWin(b.dataset.w); if (b.dataset.w === "chat") exitDesk(); }
      else if (b.dataset.m === "cycle") cycleLayout();
      else if (b.dataset.m === "help") showHelp();
    });

    const tick = () => { ui.clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };
    tick();
    setInterval(tick, 15000);
    return r;
  }

  /* ---------- palette ---------- */
  const CMD = {};
  const cmd = (names, usage, desc, fn) => {
    const list = [].concat(names);
    list.forEach((n, i) => { CMD[n] = { fn, usage: i === 0 ? usage : "", desc }; });
  };

  cmd("help", "help", "Show the keyboard reference", () => showHelp());
  cmd("chat", "chat", "Open and focus chat", () => openWin("chat"));
  cmd("video", "video", "Show or hide the video window", () => toggleWin("video"));
  cmd(["list", "pl", "playlist"], "list", "Show or hide the playlist window", () => toggleWin("list"));
  cmd("theater", "theater", "Full-screen video with chat on top", () => setMode(S.mode === "theater" ? "split" : "theater"));
  cmd("pip", "pip", "Small floating video over full-screen chat", () => setMode(S.mode === "pip" ? "split" : "pip"));
  cmd("dock", "dock", "Return to your previous layout", () => setMode("split"));
  cmd("split", "split", "Reset to the default split layout", () => setMode("split", true));
  cmd("add", "add <url>", "Add media to the end of the playlist", (a, raw) => addMedia(raw, "end"));
  cmd("next", "next <url>", "Add media to play next", (a, raw) => addMedia(raw, "next"));
  cmd("skip", "skip", "Skip to the next item", () => { if (can("playlistjump")) emit("playNext"); else note("You don't have permission to skip.", "err"); });
  cmd("voteskip", "voteskip", "Vote to skip the current item", () => { if (emit("voteskip")) note("Vote sent."); });
  cmd("jump", "jump <n>", "Play playlist entry n", (a) => jump(a[0]));
  cmd("del", "del <n>", "Remove playlist entry n", (a) => del(a[0]));
  cmd("say", "say <text>", "Send text to chat", (a, raw) => { if (raw) sendChat(raw); });
  cmd("users", "users", "Show or hide the user list in chat", () => { S.users = !S.users; refresh(); });
  cmd("nav", "nav", "Show or hide the site navbar (login, options)", () => { S.nav = !S.nav; refresh(); });
  cmd("theme", "theme [mac|term]", "Switch between light and dark", (a) => {
    S.theme = a[0] === "mac" || a[0] === "term" ? a[0] : (S.theme === "mac" ? "term" : "mac");
    refresh(); save();
  });
  cmd("plain", "plain", "Leave CyTube OS and reload the normal page", () => { location.href = location.pathname + "?plain=1"; });

  function run(text) {
    const t = text.trim();
    if (!t) return;
    if (t[0] === "/") return sendChat(t);
    const parts = t.split(/\s+/), name = parts.shift().toLowerCase();
    const c = CMD[name];
    if (!c) return note('Unknown command "' + name + '". Try help, or say <text> to chat.', "err");
    c.fn(parts, t.slice(name.length).trim());
  }

  function hints() {
    const v = pal.input.value.trim().toLowerCase(), tok = v.split(/\s+/)[0];
    const items = Object.keys(CMD).filter((n) => CMD[n].usage && (!tok || n.startsWith(tok)));
    const lines = items.slice(0, 9).map((n) => CMD[n].usage.padEnd(18) + CMD[n].desc);
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
        delete r.z0;
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
      case "c": openWin("chat"); exitDesk(); break;
      case "v": toggleWin("video"); break;
      case "p": toggleWin("list"); break;
      case "Tab": cycle(e.shiftKey ? -1 : 1); break;
      case "m": if (!mobile()) { S.move = true; flag(); } break;
      case "[": snap(w, "l"); break;
      case "]": snap(w, "r"); break;
      case "z": zoom(w); break;
      case "t": setMode(S.mode === "theater" ? "split" : "theater"); break;
      case "x": setMode(S.mode === "pip" ? "split" : "pip"); break;
      case "d": setMode("split"); break;
      case "s": setMode("split", true); break;
      case "u": S.users = !S.users; refresh(); break;
      case "n": S.nav = !S.nav; refresh(); break;
      case "a": openPalette("add "); break;
      case "/": case ":": openPalette(); break;
      case "?": case "h": showHelp(); break;
      case "i": exitDesk(); break;
      case "Enter": if (w === "list" && S.sel >= 0) jump(S.sel + 1); else exitDesk(); break;
      case "ArrowDown": case "j": if (w === "list") select(1); else used = false; break;
      case "ArrowUp": case "k": if (w === "list") select(-1); else used = false; break;
      case "Delete": case "Backspace": if (w === "list" && S.sel >= 0) del(S.sel + 1); else used = false; break;
      default: used = false;
    }
    if (used) { e.preventDefault(); e.stopPropagation(); }
  }

  function onKey(e) {
    if (helpOn) {
      if (!["Shift", "Control", "Alt", "Meta"].includes(e.key)) { hideHelp(); e.preventDefault(); e.stopPropagation(); }
      return;
    }
    if (pal.on) return;
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

    DEFS.forEach(makeWindow);
    carve();
    buildRoot();
    wirePalette();

    layout("split");
    const saved = load();
    if (saved) {
      if (saved.theme === "mac" || saved.theme === "term") S.theme = saved.theme;
      if (saved.rects && saved.open) {
        Object.assign(S.rects, saved.rects);
        Object.assign(S.open, saved.open);
        S.mode = ["split", "custom", "theater", "pip"].includes(saved.mode) ? saved.mode : "custom";
      }
    }
    if (!WIN.chat) S.focus = Object.keys(WIN)[0] || "chat";
    if (!WIN[S.tab]) S.tab = S.focus;

    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", (e) => {
      if (S.desk && e.target && e.target.matches && e.target.matches("input,textarea")) { S.desk = false; S.move = false; flag(); }
    });
    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(refresh, 100); });

    focusWin(S.focus);
    if (!mobile() && q("#chatline")) q("#chatline").focus({ preventScroll: true });
    note("CyTube OS " + VERSION + ": Esc for desk keys, Ctrl+K for commands, ? for help.");
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
