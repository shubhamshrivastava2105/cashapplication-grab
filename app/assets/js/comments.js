/* ============================================================================
   REVIEW / COMMENT LAYER  (temporary — removable before launch)
   ----------------------------------------------------------------------------
   Frictionless review comments. The reviewer clicks the comment tool, then
   clicks ANYWHERE on the screen to drop a pin and type. Each comment is saved
   straight to GitHub via /api/comments (no "enable", no "export"). Pins are
   always visible to everyone. Claude reads comments.json from git, actions each
   open one, and marks it resolved (which the live app then reflects).

   Storage  : comments.json in the repo, written by /api/comments (GitHub API).
   Read     : GET /api/comments (live from GitHub); falls back to the static
              comments.json file for local/offline preview.
   Position : each comment stores its route, the nearest [data-comment] anchor
              (or "screen"), and an x/y % within that anchor so the pin re-lands
              in the right spot across reloads and screen sizes.

   To REMOVE before launch: delete this file, api/comments.js, comments.json,
   the <script src="assets/js/comments.js"> + <div id="review-layer"> in
   index.html, and the "REVIEW / COMMENT LAYER" CSS block in app.css. The app
   keeps working — app.js calls COMMENTS.* behind `if (window.COMMENTS)` guards.
   ========================================================================== */
window.COMMENTS = (function () {
  "use strict";

  const API = "/api/comments";
  const STATIC = "comments.json";
  const LS_NAME = "neoflo_review_author";

  let comments = [];
  let placing = false;       // comment tool armed
  let composing = false;     // a composer is open
  let showResolved = true;
  let activePopover = null;

  const route = () => location.hash || "#/dashboard";
  const author = () => localStorage.getItem(LS_NAME) || "";

  // ── API ───────────────────────────────────────────────────────────────────
  async function apiGet() {
    try { const r = await fetch(API, { cache: "no-store" }); if (r.ok) return await r.json(); } catch (_) {}
    try { const r = await fetch(STATIC, { cache: "no-store" }); if (r.ok) return await r.json(); } catch (_) {}
    return [];
  }
  async function apiSend(method, payload) {
    const r = await fetch(API, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) { let m = ""; try { m = (await r.json()).error; } catch (_) {} throw new Error(m || (method + " failed (" + r.status + ")")); }
    return await r.json();
  }

  // ── Queries ─────────────────────────────────────────────────────────────
  const onRoute = () => comments.filter((c) => c.route === route());
  const visibleOnRoute = () => onRoute().filter((c) => showResolved || c.status === "open");
  const totalOpen = () => comments.filter((c) => c.status === "open").length;

  // ── Chrome: toolbar ───────────────────────────────────────────────────────
  function buildChrome() {
    const layer = document.getElementById("review-layer");
    layer.innerHTML = `
      <div class="cmt-tools" id="cmt-tools">
        <button class="cmt-tool" id="cmt-tool-add" title="Add a comment — then click anywhere on the screen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>Comment</span>
        </button>
        <button class="cmt-tool cmt-tool--count" id="cmt-tool-list" title="Show all comments"><span id="cmt-count">0</span></button>
      </div>`;
    document.getElementById("cmt-tool-add").onclick = togglePlacing;
    document.getElementById("cmt-tool-list").onclick = toggleList;

    // global click handler for placing (capture so it beats app handlers)
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { disarm(); closePopover(); closeList(); } });
    window.addEventListener("resize", positionAll);
    window.addEventListener("scroll", positionAll, true);
  }

  function updateToolbar() {
    const c = document.getElementById("cmt-count");
    if (c) c.textContent = totalOpen();
    const add = document.getElementById("cmt-tool-add");
    if (add) add.classList.toggle("is-active", placing);
  }

  // ── Placing flow ──────────────────────────────────────────────────────────
  function togglePlacing() { placing ? disarm() : arm(); }
  function arm() { placing = true; document.body.classList.add("cmt-placing"); ensureHint(); updateToolbar(); }
  function disarm() { placing = false; document.body.classList.remove("cmt-placing"); removeHint(); updateToolbar(); }

  function ensureHint() {
    if (document.getElementById("cmt-hint-bar")) return;
    const h = document.createElement("div");
    h.id = "cmt-hint-bar"; h.className = "cmt-hint-bar";
    h.textContent = "Click anywhere on the screen to drop a comment · Esc to cancel";
    document.body.appendChild(h);
  }
  function removeHint() { const h = document.getElementById("cmt-hint-bar"); if (h) h.remove(); }

  function onDocClick(e) {
    if (!placing || composing) return;
    // ignore clicks on the toolbar / existing overlay UI
    if (e.target.closest(".cmt-tools, .cmt-pop, .cmt-list, .cmt-composer, .cmt-pin")) return;
    e.preventDefault(); e.stopPropagation();
    const content = document.getElementById("content");
    const section = e.target.closest("#content [data-comment]");
    let ctx;
    if (section) {
      const rect = section.getBoundingClientRect();
      ctx = { anchor: section.getAttribute("data-comment"), anchorLabel: section.getAttribute("data-comment-label") || "",
              xPct: ((e.clientX - rect.left) / rect.width) * 100, yPct: ((e.clientY - rect.top) / rect.height) * 100 };
    } else if (content.contains(e.target)) {
      const rect = content.getBoundingClientRect();
      ctx = { anchor: "screen", anchorLabel: routeLabel(),
              xPct: ((e.clientX - rect.left) / rect.width) * 100, yPct: ((e.clientY - rect.top) / rect.height) * 100 };
    } else {
      // clicked outside the main content (sidebar / topbar / page chrome) →
      // anchor to the viewport so the pin lands exactly where clicked
      ctx = { anchor: "page", anchorLabel: "Page / navigation",
              xPct: (e.clientX / window.innerWidth) * 100, yPct: (e.clientY / window.innerHeight) * 100 };
    }
    openComposer(e.clientX, e.clientY, { route: route(), ...ctx });
  }

  function routeLabel() {
    const a = document.querySelector('.navlink.is-active span:not(.navlink__badge)');
    return a ? a.textContent.trim() : route().replace("#/", "");
  }

  // ── Composer ──────────────────────────────────────────────────────────────
  function openComposer(clientX, clientY, ctx) {
    closePopover();
    composing = true;
    const marker = document.createElement("div");
    marker.className = "cmt-pin cmt-pin--draft"; marker.style.position = "fixed";
    marker.style.left = clientX + "px"; marker.style.top = clientY + "px";
    marker.innerHTML = "✎";
    document.body.appendChild(marker);

    const box = document.createElement("div");
    box.className = "cmt-composer";
    box.innerHTML = `
      <div class="cmt-composer__loc">${escapeHtml(ctx.anchorLabel || routeLabel())}</div>
      <input class="cmt-composer__name" id="cmt-name" placeholder="Your name" />
      <textarea class="cmt-composer__text" id="cmt-text" placeholder="Type your comment…"></textarea>
      <div class="cmt-composer__row">
        <button class="btn btn--ghost btn--sm" id="cmt-cancel">Cancel</button>
        <button class="btn btn--primary btn--sm" id="cmt-save">Comment</button>
      </div>`;
    document.body.appendChild(box);
    placeFloating(box, clientX, clientY);

    const nameI = box.querySelector("#cmt-name"); nameI.value = author();
    nameI.oninput = () => localStorage.setItem(LS_NAME, nameI.value.trim());
    const textI = box.querySelector("#cmt-text"); textI.focus();

    const cleanup = () => { composing = false; marker.remove(); box.remove(); };
    box.querySelector("#cmt-cancel").onclick = cleanup;
    box.querySelector("#cmt-save").onclick = async () => {
      const text = textI.value.trim(); if (!text) { textI.focus(); return; }
      const saveBtn = box.querySelector("#cmt-save"); saveBtn.textContent = "Saving…"; saveBtn.disabled = true;
      try {
        comments = await apiSend("POST", { ...ctx, author: nameI.value.trim() || "SME", text });
        cleanup(); refresh();
      } catch (err) {
        saveBtn.textContent = "Comment"; saveBtn.disabled = false;
        flashError(box, err.message);
      }
    };
    textI.addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") box.querySelector("#cmt-save").click(); });
    setTimeout(() => document.addEventListener("mousedown", outsideComposer), 0);
    function outsideComposer(ev) {
      if (!box.contains(ev.target) && ev.target !== marker) { cleanup(); document.removeEventListener("mousedown", outsideComposer); }
    }
  }

  function flashError(box, msg) {
    let e = box.querySelector(".cmt-err");
    if (!e) { e = document.createElement("div"); e.className = "cmt-err"; box.appendChild(e); }
    e.textContent = "Couldn't save: " + msg;
  }

  // ── Pins ────────────────────────────────────────────────────────────────
  function pageLayer() {
    let l = document.getElementById("cmt-page-layer");
    if (!l) { l = document.createElement("div"); l.id = "cmt-page-layer"; l.className = "cmt-page-layer"; document.body.appendChild(l); }
    return l;
  }

  function refresh() {
    document.querySelectorAll(".cmt-pin:not(.cmt-pin--draft)").forEach((p) => p.remove());
    visibleOnRoute().forEach((c) => {
      let anchorEl;
      if (c.anchor === "page") anchorEl = pageLayer();
      else if (c.anchor === "screen") anchorEl = document.getElementById("content");
      else anchorEl = document.querySelector(`#content [data-comment="${cssEsc(c.anchor)}"]`);
      if (!anchorEl) return;
      if (anchorEl.id !== "cmt-page-layer" && getComputedStyle(anchorEl).position === "static") anchorEl.style.position = "relative";
      const pin = document.createElement("button");
      pin.className = "cmt-pin cmt-pin--" + c.status;
      pin.dataset.id = c.id;
      pin.style.left = c.xPct + "%"; pin.style.top = c.yPct + "%";
      pin.innerHTML = c.status === "resolved" ? "✓" : "💬";
      pin.title = `${c.author}: ${c.text}`;
      pin.onclick = (e) => { e.stopPropagation(); e.preventDefault(); openPopover(c.id, pin); };
      anchorEl.appendChild(pin);
    });
    updateToolbar();
    if (document.getElementById("cmt-list-panel")) renderList();
  }
  function positionAll() { /* pins use % within anchors, so they reflow automatically; hook kept for future absolute anchors */ }

  // ── Thread popover (single comment + actions) ──────────────────────────────
  function closePopover() { if (activePopover) { activePopover.remove(); activePopover = null; document.removeEventListener("mousedown", outsidePop, true); } }
  function outsidePop(e) { if (activePopover && !activePopover.contains(e.target) && !e.target.classList.contains("cmt-pin")) closePopover(); }

  function openPopover(id, anchor) {
    closePopover();
    const c = comments.find((x) => x.id === id); if (!c) return;
    const pop = document.createElement("div");
    pop.className = "cmt-pop";
    pop.innerHTML = renderThread(c);
    document.body.appendChild(pop);
    activePopover = pop;
    const r = anchor.getBoundingClientRect();
    placeFloating(pop, r.right, r.bottom);
    bindThread(pop, c);
    setTimeout(() => document.addEventListener("mousedown", outsidePop, true), 0);
  }

  function renderThread(c) {
    const when = fmtWhen(c.createdAt);
    const res = c.status === "resolved"
      ? `<div class="cmt-item__resolution"><b>✓ Resolved</b>${c.resolvedBy ? " by " + escapeHtml(c.resolvedBy) : ""}${c.resolutionNote ? " — " + escapeHtml(c.resolutionNote) : ""}</div>`
      : "";
    const actions = c.status === "resolved"
      ? `<button class="reopen" data-act="reopen">Reopen</button><button class="del" data-act="del">Delete</button>`
      : `<button class="resolve" data-act="resolve">Mark resolved</button><button class="del" data-act="del">Delete</button>`;
    return `
      <div class="cmt-pop__head">
        <div><div class="ttl">Comment</div><div class="sub">${escapeHtml(c.anchorLabel || c.route)}</div></div>
        <button class="cmt-pop__close" title="Close">&times;</button>
      </div>
      <div class="cmt-pop__list">
        <div class="cmt-item ${c.status === "resolved" ? "resolved" : ""}">
          <div class="cmt-item__meta"><span class="cmt-item__author">${escapeHtml(c.author)}</span> · <span>${when}</span> · <span class="pill pill--plain ${c.status === "resolved" ? "pill--success" : "pill--warn"}" style="padding:0 8px">${c.status}</span></div>
          <div class="cmt-item__text">${escapeHtml(c.text)}</div>
          ${res}
          <div class="cmt-item__actions">${actions}</div>
        </div>
      </div>`;
  }

  function bindThread(pop, c) {
    pop.querySelector(".cmt-pop__close").onclick = closePopover;
    pop.querySelectorAll("[data-act]").forEach((b) => {
      b.onclick = async () => {
        b.disabled = true;
        try {
          if (b.dataset.act === "resolve") comments = await apiSend("PATCH", { id: c.id, action: "resolve", resolvedBy: author() || "reviewer" });
          if (b.dataset.act === "reopen") comments = await apiSend("PATCH", { id: c.id, action: "reopen" });
          if (b.dataset.act === "del") comments = await apiSend("DELETE", { id: c.id });
          closePopover(); refresh();
        } catch (err) { b.disabled = false; alert("Couldn't update: " + err.message); }
      };
    });
  }

  // ── All-comments list ─────────────────────────────────────────────────────
  let listBackdrop = null;
  function toggleList() { document.getElementById("cmt-list-panel") ? closeList() : openList(); }
  function openList() {
    const panel = document.createElement("div");
    panel.className = "cmt-list"; panel.id = "cmt-list-panel";
    panel.innerHTML = `
      <div class="cmt-list__head">
        <span class="ttl">Comments</span>
        <label class="cmt-list__filter"><input type="checkbox" id="cmt-show-res" ${showResolved ? "checked" : ""}/> show resolved</label>
        <button class="cmt-pop__close" id="cmt-list-close">&times;</button>
      </div>
      <div class="cmt-list__body" id="cmt-list-body"></div>`;
    document.body.appendChild(panel);
    listBackdrop = document.createElement("div"); listBackdrop.className = "overlay-backdrop"; listBackdrop.onclick = closeList;
    document.body.appendChild(listBackdrop);
    document.getElementById("cmt-list-close").onclick = closeList;
    document.getElementById("cmt-show-res").onchange = (e) => { showResolved = e.target.checked; renderList(); refresh(); };
    renderList();
  }
  function closeList() { const p = document.getElementById("cmt-list-panel"); if (p) p.remove(); if (listBackdrop) { listBackdrop.remove(); listBackdrop = null; } }

  function renderList() {
    const body = document.getElementById("cmt-list-body"); if (!body) return;
    let items = [...comments];
    if (!showResolved) items = items.filter((c) => c.status === "open");
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (!items.length) { body.innerHTML = `<div class="cmt-empty">No comments yet. Click <b>Comment</b>, then click anywhere on the screen.</div>`; return; }
    body.innerHTML = items.map((c) => `
      <div class="cmt-card" data-id="${c.id}" data-route="${escapeHtml(c.route)}">
        <div class="cmt-card__loc">${escapeHtml(c.anchorLabel || c.route)}</div>
        <div class="cmt-card__text">${escapeHtml(c.text)}</div>
        ${c.status === "resolved" && c.resolutionNote ? `<div class="cmt-item__resolution" style="margin-top:6px"><b>✓</b> ${escapeHtml(c.resolutionNote)}</div>` : ""}
        <div class="cmt-card__foot"><span class="pill pill--plain ${c.status === "resolved" ? "pill--success" : "pill--warn"}" style="padding:0 8px">${c.status}</span><span>${escapeHtml(c.author)}</span><span>·</span><span>${fmtWhen(c.createdAt)}</span></div>
      </div>`).join("");
    body.querySelectorAll(".cmt-card").forEach((card) => {
      card.onclick = () => {
        const id = card.dataset.id, rt = card.dataset.route;
        closeList();
        if (rt && rt !== route()) { location.hash = rt; setTimeout(() => focusPin(id), 250); }
        else focusPin(id);
      };
    });
  }
  function focusPin(id) {
    const pin = document.querySelector(`.cmt-pin[data-id="${cssEsc(id)}"]`);
    if (pin) { pin.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => openPopover(id, pin), 300); }
  }

  // ── helpers ─────────────────────────────────────────────────────────────
  function placeFloating(el, x, y) {
    const w = el.offsetWidth || 300, h = el.offsetHeight || 200;
    let left = Math.min(x, window.innerWidth - w - 12); left = Math.max(12, left);
    let top = y + 10; if (top + h > window.innerHeight - 12) top = Math.max(12, y - h - 10);
    el.style.left = left + "px"; el.style.top = top + "px";
  }
  function escapeHtml(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }
  function cssEsc(s) { return String(s).replace(/["\\]/g, "\\$&"); }
  function fmtWhen(iso) { try { return new Date(iso).toLocaleString("en-SG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (_) { return iso; } }

  // ── boot ────────────────────────────────────────────────────────────────
  async function init() {
    buildChrome();
    comments = await apiGet();
    refresh();
  }

  return { init, refresh, _state: () => comments };
})();
