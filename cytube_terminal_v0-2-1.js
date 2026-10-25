
/* ============================================================
   CYTUBE TERMINAL — v0.2.1
   Phase 2: read-only client/DOM inspection; no socket emissions.
   Install in CyTube's custom JavaScript editor.
   ============================================================ */
(() => {
  "use strict";

  const VERSION = "0.2.1";
  const ROOT_ID = "cyterm-v021-root";
  const LAUNCH_ID = "cyterm-v021-launcher";
  if (document.getElementById(ROOT_ID)) return;

  const state = {
    history: [],
    historyIndex: 0,
    theme: "cyber",
    minimized: false,
    commands: new Map()
  };

  const themes = {
    cyber: {
      bg: "#080b12", panel: "#0d1220", panel2: "#111a2a",
      text: "#d7e7ff", muted: "#8295b6", accent: "#40f6d2",
      accent2: "#ff4fd8", border: "#263956", error: "#ff718b",
      warning: "#ffc66d", success: "#8dffb5"
    },
    green: {
      bg: "#050b08", panel: "#08140d", panel2: "#0d2015",
      text: "#c8ffd8", muted: "#6da782", accent: "#61ff91",
      accent2: "#b7ff4a", border: "#1e5434", error: "#ff7777",
      warning: "#ffe27a", success: "#61ff91"
    },
    amber: {
      bg: "#100b05", panel: "#191006", panel2: "#261807",
      text: "#ffe5b7", muted: "#b99a70", accent: "#ffbd59",
      accent2: "#ff7e45", border: "#65441e", error: "#ff7777",
      warning: "#ffe27a", success: "#b8f28b"
    }
  };

  const css = `
    #${ROOT_ID}, #${ROOT_ID} * { box-sizing:border-box; }
    #${ROOT_ID} {
      position:fixed; inset:0; z-index:2147483000;
      background:var(--ct-bg); color:var(--ct-text);
      font:14px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
      display:flex; flex-direction:column; overflow:hidden;
      isolation:isolate;
    }
    #${ROOT_ID}::before {
      content:""; position:absolute; inset:0; pointer-events:none; z-index:5;
      background:repeating-linear-gradient(to bottom,
        transparent 0, transparent 3px, rgba(255,255,255,.018) 4px);
    }
    #${ROOT_ID} .ct-top {
      display:flex; align-items:center; justify-content:space-between; gap:12px;
      padding:11px 15px; border-bottom:1px solid var(--ct-border);
      background:var(--ct-panel); flex-wrap:wrap;
    }
    #${ROOT_ID} .ct-brand {display:flex;align-items:center;gap:10px;min-width:0}
    #${ROOT_ID} .ct-mark {
      color:var(--ct-accent); font-size:22px; font-weight:900;
      text-shadow:0 0 12px var(--ct-accent);
    }
    #${ROOT_ID} .ct-title {font-weight:900;letter-spacing:.14em;color:var(--ct-accent)}
    #${ROOT_ID} .ct-sub {font-size:10px;color:var(--ct-muted);letter-spacing:.12em}
    #${ROOT_ID} .ct-actions {display:flex;gap:7px;flex-wrap:wrap}
    #${ROOT_ID} button, #${ROOT_ID} input {
      font:inherit; border:1px solid var(--ct-border); border-radius:4px;
      color:var(--ct-text); background:var(--ct-panel2);
    }
    #${ROOT_ID} button {cursor:pointer;padding:6px 10px}
    #${ROOT_ID} button:hover {border-color:var(--ct-accent);color:var(--ct-accent)}
    #${ROOT_ID} .ct-main {
      display:grid; grid-template-columns:minmax(0,1fr) 245px;
      gap:12px; padding:12px; min-height:0; flex:1;
    }
    #${ROOT_ID} .ct-terminal {
      display:flex; flex-direction:column; min-height:0; min-width:0;
      border:1px solid var(--ct-border); background:var(--ct-panel);
      box-shadow:0 0 22px color-mix(in srgb,var(--ct-accent) 8%,transparent);
    }
    #${ROOT_ID} .ct-panehead {
      padding:8px 11px; color:var(--ct-muted); border-bottom:1px solid var(--ct-border);
      font-size:10px; letter-spacing:.13em; display:flex;justify-content:space-between;gap:8px
    }
    #${ROOT_ID} .ct-output {
      flex:1; min-height:100px; overflow:auto; padding:14px;
      white-space:pre-wrap; overflow-wrap:anywhere; scrollbar-color:var(--ct-border) var(--ct-bg);
    }
    #${ROOT_ID} .ct-line {margin:0 0 5px}
    #${ROOT_ID} .ct-promptline {color:var(--ct-accent)}
    #${ROOT_ID} .ct-muted {color:var(--ct-muted)}
    #${ROOT_ID} .ct-error {color:var(--ct-error)}
    #${ROOT_ID} .ct-warn {color:var(--ct-warning)}
    #${ROOT_ID} .ct-good {color:var(--ct-success)}
    #${ROOT_ID} .ct-inputrow {
      display:flex;align-items:center;gap:8px;padding:10px 12px;
      border-top:1px solid var(--ct-border);background:var(--ct-bg)
    }
    #${ROOT_ID} .ct-prompt {color:var(--ct-accent);white-space:nowrap}
    #${ROOT_ID} .ct-input {
      flex:1;min-width:0;border:0!important;outline:none!important;
      background:transparent!important;padding:5px 0!important;
      box-shadow:none!important;caret-color:var(--ct-accent)
    }
    #${ROOT_ID} .ct-side {display:flex;flex-direction:column;gap:12px;min-height:0}
    #${ROOT_ID} .ct-card {border:1px solid var(--ct-border);background:var(--ct-panel);padding:11px}
    #${ROOT_ID} .ct-cardtitle {font-size:10px;color:var(--ct-accent);letter-spacing:.14em;margin-bottom:9px}
    #${ROOT_ID} .ct-metric {display:flex;justify-content:space-between;gap:8px;margin:7px 0}
    #${ROOT_ID} .ct-metric span:first-child {color:var(--ct-muted)}
    #${ROOT_ID} .ct-chip {display:inline-block;border:1px solid var(--ct-border);padding:3px 6px;margin:2px;color:var(--ct-muted);font-size:10px}
    #${ROOT_ID} .ct-bottom {
      padding:7px 13px;border-top:1px solid var(--ct-border);color:var(--ct-muted);
      font-size:10px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap
    }
    #${LAUNCH_ID} {
      position:fixed;right:12px;bottom:12px;z-index:2147482999;
      display:none;background:#0d1220;color:#40f6d2;border:1px solid #40f6d2;
      border-radius:5px;padding:10px 13px;font:13px ui-monospace,monospace;
      box-shadow:0 0 18px #40f6d233;cursor:pointer
    }
    @media(max-width:760px) {
      #${ROOT_ID} .ct-main {grid-template-columns:minmax(0,1fr);padding:7px;gap:7px}
      #${ROOT_ID} .ct-side {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      #${ROOT_ID} .ct-card {padding:8px}
      #${ROOT_ID} .ct-top {padding:9px}
      #${ROOT_ID} .ct-output {padding:10px;font-size:12px}
      #${ROOT_ID} .ct-sub {display:none}
    }
    @media(max-width:420px) {
      #${ROOT_ID} .ct-side {grid-template-columns:1fr 1fr}
      #${ROOT_ID} .ct-title {font-size:12px;letter-spacing:.07em}
      #${ROOT_ID} .ct-actions button {padding:5px 7px;font-size:11px}
    }
  `;

  const style = document.createElement("style");
  style.id = "cyterm-v021-style";
  style.textContent = css;
  document.head.appendChild(style);

  const root = document.createElement("section");
  root.id = ROOT_ID;
  root.setAttribute("aria-label", "CyTube Terminal");
  root.innerHTML = `
    <header class="ct-top">
      <div class="ct-brand">
        <div class="ct-mark">▣</div>
        <div>
          <div class="ct-title">CYTUBE // TERMINAL</div>
          <div class="ct-sub">CYBERSPACE INTERFACE · SHELL ${VERSION}</div>
        </div>
      </div>
      <div class="ct-actions">
        <button type="button" data-action="help">F1 HELP</button>
        <button type="button" data-action="theme">THEME</button>
        <button type="button" data-action="exit">EXIT</button>
      </div>
    </header>
    <main class="ct-main">
      <section class="ct-terminal">
        <div class="ct-panehead"><span>TERMINAL SESSION</span><span>READ-ONLY CLIENT LINK</span></div>
        <div class="ct-output" role="log" aria-live="polite"></div>
        <form class="ct-inputrow">
          <span class="ct-prompt">guest@cytube:~$</span>
          <input class="ct-input" aria-label="Terminal command" autocomplete="off"
            autocapitalize="off" spellcheck="false" placeholder="type help and press Enter">
        </form>
      </section>
      <aside class="ct-side">
        <section class="ct-card">
          <div class="ct-cardtitle">SESSION</div>
          <div class="ct-metric"><span>Interface</span><b>ACTIVE</b></div>
          <div class="ct-metric"><span>Shell</span><b>v${VERSION}</b></div>
          <div class="ct-metric"><span>Theme</span><b data-value="theme">CYBER</b></div>
          <div class="ct-metric"><span>Integration</span><b>PHASE 2</b></div>
        </section>
        <section class="ct-card">
          <div class="ct-cardtitle">CHANNEL</div>
          <div class="ct-metric"><span>Path</span><b data-value="channel">—</b></div>
          <div class="ct-metric"><span>Users</span><b data-value="users">—</b></div>
          <div class="ct-metric"><span>Client data</span><b data-value="client">PROBING</b></div>
        </section>
        <section class="ct-card">
          <div class="ct-cardtitle">MEDIA SYSTEM</div>
          <div class="ct-metric"><span>Player</span><b data-value="player">PROBING</b></div>
          <div class="ct-metric"><span>Queue</span><b data-value="queue">PROBING</b></div>
          <div class="ct-metric"><span>Controls</span><b>PHASE 3</b></div>
        </section>
        <section class="ct-card">
          <div class="ct-cardtitle">QUICK KEYS</div>
          <span class="ct-chip">ENTER RUN</span>
          <span class="ct-chip">↑ ↓ HISTORY</span>
          <span class="ct-chip">TAB COMPLETE</span>
          <span class="ct-chip">CTRL+L CLEAR</span>
          <span class="ct-chip">ESC EXIT</span>
        </section>
      </aside>
    </main>
    <footer class="ct-bottom">
      <span>STATUS: <b class="ct-good" data-value="status">READ-ONLY MODE</b></span>
      <span>NO CHAT OR PLAYBACK ACTIONS ENABLED</span>
    </footer>
  `;

  const launcher = document.createElement("button");
  launcher.id = LAUNCH_ID;
  launcher.type = "button";
  launcher.textContent = "▣ OPEN CYTUBE TERMINAL";
  document.body.appendChild(root);
  document.body.appendChild(launcher);

  const output = root.querySelector(".ct-output");
  const input = root.querySelector(".ct-input");
  const form = root.querySelector("form");
  const $ = (selector) => root.querySelector(selector);

  function applyTheme(name) {
    if (!themes[name]) {
      write(`Unknown theme "${name}". Try: cyber, green, amber`, "error");
      return;
    }
    state.theme = name;
    const t = themes[name];
    const vars = {
      "--ct-bg": t.bg, "--ct-panel": t.panel, "--ct-panel2": t.panel2,
      "--ct-text": t.text, "--ct-muted": t.muted, "--ct-accent": t.accent,
      "--ct-accent2": t.accent2, "--ct-border": t.border,
      "--ct-error": t.error, "--ct-warning": t.warning, "--ct-success": t.success
    };
    for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
    $('[data-value="theme"]').textContent = name.toUpperCase();
    write(`Theme set to ${name}.`, "good");
  }

  function write(message, kind = "") {
    const line = document.createElement("div");
    line.className = "ct-line" + (kind ? " ct-" + kind : "");
    line.textContent = String(message);
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  function promptLine(command) {
    const line = document.createElement("div");
    line.className = "ct-line ct-promptline";
    line.textContent = `guest@cytube:~$ ${command}`;
    output.appendChild(line);
  }

  function register(name, usage, description, run) {
    state.commands.set(name, { usage, description, run });
  }

  function channelPath() {
    const match = location.pathname.match(/\/r\/([^/]+)/i);
    return match ? decodeURIComponent(match[1]) : "(channel path not detected)";
  }

  function safeRead(fn) {
    try { return fn(); } catch (_) { return undefined; }
  }

  function getChannelObject() {
    return safeRead(() => typeof CHANNEL !== "undefined" && CHANNEL ? CHANNEL : undefined);
  }

  function getPlayerObject() {
    return safeRead(() => typeof PLAYER !== "undefined" && PLAYER ? PLAYER : undefined);
  }

  function getPlaylistObject() {
    return safeRead(() => typeof PLAYLIST !== "undefined" && PLAYLIST ? PLAYLIST : undefined);
  }

  function readChannelName() {
    const channel = getChannelObject();
    if (channel && typeof channel.name === "string" && channel.name.trim()) return channel.name.trim();
    const title = document.querySelector("#channelname, #channel-name, .channel-name");
    if (title && title.textContent.trim()) return title.textContent.trim();
    return channelPath();
  }

  function readUserCount() {
    const channel = getChannelObject();
    if (channel && Number.isFinite(Number(channel.usercount))) return Number(channel.usercount);
    const countText = document.querySelector("#usercount");
    if (countText) {
      const match = countText.textContent.match(/\d+/);
      if (match) return Number(match[0]);
    }
    const users = document.querySelectorAll("#userlist .userlist_item, #userlist .userlistitem, #userlist [data-username]");
    return users.length || undefined;
  }

  function readUserNames() {
    const rows = [...document.querySelectorAll("#userlist .userlist_item, #userlist .userlistitem, #userlist [data-username]")];
    const names = rows.map(row => {
      // CyTube's standard .userlist_item uses child 0 for its icon
      // and child 1 for the username. Reading row.textContent also
      // captures the username again and the permission-dependent menu.
      const dataName = row.getAttribute("data-username");
      const nameNode = row.querySelector(":scope > span:nth-of-type(2)");
      const text = (dataName || nameNode?.textContent || "").replace(/\s+/g, " ").trim();
      return text;
    }).filter(Boolean);
    return [...new Set(names)];
  }

  function readMediaTitle() {
    const titleNode = document.querySelector("#currenttitle");
    if (titleNode && titleNode.textContent.trim()) return titleNode.textContent.trim();
    const player = getPlayerObject();
    if (player && typeof player.mediaId === "string" && player.mediaId) return `${player.mediaType || "media"}: ${player.mediaId}`;
    return undefined;
  }

  function readQueue() {
    const rows = [...document.querySelectorAll("#queue li")];
    return rows.map((row, index) => ({
      index: index + 1,
      active: row.classList.contains("queue_active"),
      title: (row.querySelector(".qe_title, .queue_title, .pltitle, a")?.textContent || row.textContent || "").replace(/\s+/g, " ").trim()
    })).filter(item => item.title);
  }

  function refreshSidebar() {
    const channel = getChannelObject();
    const player = getPlayerObject();
    const users = readUserCount();
    const queue = readQueue();
    $('[data-value="channel"]').textContent = readChannelName().toUpperCase();
    $('[data-value="users"]').textContent = users === undefined ? "N/A" : String(users);
    $('[data-value="client"]').textContent = channel ? "FOUND" : "DOM MODE";
    $('[data-value="player"]').textContent = player ? "FOUND" : (document.querySelector("#currenttitle") ? "DOM MODE" : "N/A");
    $('[data-value="queue"]').textContent = queue.length ? String(queue.length) : (document.querySelector("#queue") ? "0" : "N/A");
    $('[data-value="status"]').textContent = "READ-ONLY";
  }

  function help() {
    write("AVAILABLE COMMANDS");
    for (const [name, command] of state.commands) {
      write(`  ${command.usage.padEnd(24)} ${command.description}`);
    }
    write("");
    write("KEYS: Enter execute · ↑/↓ history · Tab complete · Ctrl+L clear · Esc exit", "muted");
    write("Commands are local to this interface unless explicitly connected in a later phase.", "muted");
  }

  register("help", "help", "List available commands", help);
  register("clear", "clear", "Clear terminal output", () => { output.textContent = ""; });
  register("history", "history", "Show commands entered this session", () => {
    if (!state.history.length) return write("No command history yet.", "muted");
    state.history.forEach((cmd, i) => write(`${String(i + 1).padStart(3, " ")}  ${cmd}`));
  });

  register("channel", "channel", "Show live channel name and URL/path", () => {
    refreshSidebar();
    write(`Channel: ${readChannelName()}`);
    write(`URL: ${location.href}`);
    write(`Path: ${channelPath()}`);
    const channel = getChannelObject();
    write(`CHANNEL object: ${channel ? "available" : "not exposed; using DOM/path fallback"}`, channel ? "good" : "warn");
  });

  register("media", "media", "Show current media title and player state", () => {
    refreshSidebar();
    const title = readMediaTitle();
    const player = getPlayerObject();
    write(`Current media: ${title || "unavailable"}`, title ? "good" : "warn");
    if (player) {
      write("Player object: available");
      write(`Media type: ${player.mediaType ?? "unavailable"}`);
      write(`Media ID: ${player.mediaId ?? "unavailable"}`);
      write(`Media length: ${Number.isFinite(Number(player.mediaLength)) ? player.mediaLength : "unavailable"}`);
    } else {
      write("Player object: not exposed; title read from page DOM when available", "muted");
    }
  });

  register("who", "who [list]", "Show connected-user count; add list to show visible names", (args) => {
    refreshSidebar();
    const count = readUserCount();
    const names = readUserNames();
    write(`Connected users: ${count === undefined ? "unavailable" : count}`, count === undefined ? "warn" : "good");
    if (args[0] === "list") {
      if (!names.length) return write("No readable user-name rows found in the page DOM.", "warn");
      names.forEach((name, i) => write(`${String(i + 1).padStart(2, "0")}. ${name}`));
    } else {
      write(`Visible user names: ${names.length ? names.length : "unavailable"}. Use "who list" to list names.`, "muted");
    }
  });

  register("queue", "queue [limit]", "Show current visible playlist entries (read-only)", (args) => {
    refreshSidebar();
    const rows = readQueue();
    if (!rows.length) return write("No queue rows found, or the queue is empty/not rendered.", "warn");
    const requested = Number.parseInt(args[0], 10);
    const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 100) : 10;
    write(`Visible queue entries: ${rows.length}`);
    rows.slice(0, limit).forEach(item => write(
      `${item.active ? "▶" : " "} ${String(item.index).padStart(2, "0")}. ${item.title}`,
      item.active ? "good" : ""
    ));
    if (rows.length > limit) write(`… ${rows.length - limit} more entries. Try: queue ${Math.min(rows.length, 100)}`, "muted");
  });

  register("status", "status", "Report detected CyTube data sources", () => {
    refreshSidebar();
    const channel = getChannelObject();
    const player = getPlayerObject();
    const playlist = getPlaylistObject();
    write(`Shell version: ${VERSION}`);
    write(`Theme: ${state.theme}`);
    write(`Channel path: ${channelPath()}`);
    write(`Channel name: ${readChannelName()}`);
    write(`CHANNEL object: ${channel ? "found" : "not found; DOM/path fallback active"}`);
    write(`PLAYER object: ${player ? "found" : "not found; DOM fallback active"}`);
    write(`PLAYLIST object: ${playlist ? "found" : "not found; DOM queue fallback active"}`);
    write(`User count: ${readUserCount() ?? "unavailable"}`);
    write(`Current media title: ${readMediaTitle() || "unavailable"}`);
    write(`Visible queue rows: ${readQueue().length}`);
    write("Mode: read-only; no socket events emitted and no playback/chat actions called.", "good");
  });

  register("theme", "theme <cyber|green|amber>", "Change terminal color theme", (args) => {
    if (!args[0]) return write(`Current theme: ${state.theme}. Usage: theme cyber|green|amber`);
    applyTheme(args[0].toLowerCase());
  });

  register("shortcuts", "shortcuts", "List keyboard shortcuts", () => {
    write("ENTER       Execute command");
    write("UP / DOWN   Browse command history");
    write("TAB         Complete command name");
    write("CTRL+L      Clear output");
    write("F1          Show help");
    write("ESC         Exit terminal overlay");
  });

  register("exit", "exit", "Hide terminal and reveal the original page", () => hideTerminal());
  register("about", "about", "About this build", () => {
    write(`CyTube Terminal v${VERSION}`);
    write("Phase 2: read-only inspection of known client objects and page DOM.");
    write("No chat, playlist, or playback actions are called.");
  });

  function parse(line) {
    const result = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let match;
    while ((match = re.exec(line)) !== null) result.push(match[1] ?? match[2] ?? match[3]);
    return result;
  }

  function execute(raw) {
    const line = raw.trim();
    if (!line) return;
    promptLine(line);
    state.history.push(line);
    if (state.history.length > 200) state.history.shift();
    state.historyIndex = state.history.length;

    const parts = parse(line);
    const name = (parts.shift() || "").toLowerCase();
    const command = state.commands.get(name);
    if (!command) {
      write(`Command not found: ${name}. Type "help" for available commands.`, "error");
      return;
    }
    try {
      command.run(parts);
    } catch (error) {
      write(`Command error: ${error && error.message ? error.message : String(error)}`, "error");
    }
  }

  function completeInput() {
    const value = input.value;
    if (value.includes(" ")) return;
    const matches = [...state.commands.keys()].filter(name => name.startsWith(value.toLowerCase()));
    if (matches.length === 1) input.value = matches[0] + " ";
    else if (matches.length > 1) write(matches.join("   "), "muted");
  }

  function showTerminal() {
    state.minimized = false;
    root.style.display = "flex";
    launcher.style.display = "none";
    input.focus({ preventScroll: true });
  }

  function hideTerminal() {
    state.minimized = true;
    root.style.display = "none";
    launcher.style.display = "block";
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value;
    input.value = "";
    execute(value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (state.history.length) {
        state.historyIndex = Math.max(0, state.historyIndex - 1);
        input.value = state.history[state.historyIndex] || "";
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      state.historyIndex = Math.min(state.history.length, state.historyIndex + 1);
      input.value = state.history[state.historyIndex] || "";
    } else if (event.key === "Tab") {
      event.preventDefault();
      completeInput();
    }
  });

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "help") execute("help");
    if (action === "theme") {
      const order = ["cyber", "green", "amber"];
      applyTheme(order[(order.indexOf(state.theme) + 1) % order.length]);
    }
    if (action === "exit") hideTerminal();
  });

  launcher.addEventListener("click", showTerminal);

  document.addEventListener("keydown", (event) => {
    if (state.minimized) return;
    const target = event.target;
    const editingOtherField = target instanceof HTMLElement &&
      target !== input &&
      (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (editingOtherField) return;

    if (event.key === "F1") {
      event.preventDefault();
      execute("help");
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
      event.preventDefault();
      output.textContent = "";
      input.focus({ preventScroll: true });
    } else if (event.key === "Escape") {
      event.preventDefault();
      hideTerminal();
    }
  });

  applyTheme("cyber");
  refreshSidebar();
  write(`CYTUBE TERMINAL v${VERSION} // BOOT COMPLETE`, "good");
  write("Cyberpunk shell initialized. Read-only CyTube inspection enabled.");
  write("Try: channel · who · who list · media · queue · status");
  write("Phase 2 / read-only / no server actions", "muted");
  input.focus({ preventScroll: true });
})();
