/* ============================================================================
   TEMPORARY REVIEW / COMMENT SYSTEM
   ----------------------------------------------------------------------------
   Lets a subject-matter expert (SME) pin comments to any section of the
   prototype. Comments persist in localStorage during the SME's session and are
   exported to /comments.json, which is committed to git. Claude reads that file,
   acts on each open comment, and marks it "resolved" (with a resolutionNote)
   directly in comments.json — that is the "auto-resolve when action is taken".
   Untouched comments stay "open".

   Source of truth      : comments.json  (committed; Claude edits resolutions)
   SME working copy      : localStorage   (merged with the file on load)
   Merge rule           : later updatedAt wins; resolved beats open on a tie.

   To REMOVE this layer before launch: delete comments.js, comments.json, the
   "REVIEW / COMMENT LAYER" block in app.css, the <script src="comments.js">
   and <div id="review-layer"> in index.html, and the COMMENTS.refresh() call
   in app.js. Nothing else depends on it.
   ========================================================================== */
window.COMMENTS = (function () {
  "use strict";

  const LS_COMMENTS = "neoflo_review_comments_v1";
  const LS_NAME = "neoflo_review_author";
  const LS_REVIEW_ON = "neoflo_review_on";

  let comments = [];          // merged working set
  let reviewOn = false;
  let activePopover = null;
  let drawerFilter = "open";

  const now = () => new Date().toISOString();
  const uid = () => "c_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const author = () => localStorage.getItem(LS_NAME) || "SME";

  // ── Persistence ─────────────────────────────────────────────────────────
  function saveLocal() {
    localStorage.setItem(LS_COMMENTS, JSON.stringify(comments));
  }

  function mergeById(fileArr, localArr) {
    const map = new Map();
    const put = (c) => {
      const existing = map.get(c.id);
      if (!existing) { map.set(c.id, c); return; }
      const a = existing, b = c;
      const at = a.updatedAt || a.createdAt || "";
      const bt = b.updatedAt || b.createdAt || "";
      if (bt > at) { map.set(c.id, b); }
      else if (bt === at && b.status === "resolved" && a.status !== "resolved") { map.set(c.id, b); }
    };
    (fileArr || []).forEach(put);
    (localArr || []).forEach(put);
    return [...map.values()];
  }

  async function load() {
    let fromFile = [];
    try {
      const res = await fetch("comments.json", { cache: "no-store" });
      if (res.ok) fromFile = await res.json();
    } catch (_) { /* file:// or missing — fall back to localStorage only */ }
    let fromLocal = [];
    try { fromLocal = JSON.parse(localStorage.getItem(LS_COMMENTS) || "[]"); } catch (_) {}
    comments = mergeById(fromFile, fromLocal);
    saveLocal();
  }

  // ── Queries ─────────────────────────────────────────────────────────────
  const forSection = (id) => comments.filter((c) => c.sectionId === id);
  const openCount = (id) => forSection(id).filter((c) => c.status === "open").length;
  const totalOpen = () => comments.filter((c) => c.status === "open").length;
  const totalResolved = () => comments.filter((c) => c.status === "resolved").length;

  // ── Mutations ───────────────────────────────────────────────────────────
  function add(sectionId, sectionLabel, text) {
    const c = {
      id: uid(), sectionId, sectionLabel,
      author: author(), text: text.trim(),
      status: "open",
      createdAt: now(), updatedAt: now(),
      resolvedAt: null, resolvedBy: null, resolutionNote: null,
    };
    comments.push(c);
    saveLocal();
    return c;
  }
  function resolve(id, note, by) {
    const c = comments.find((x) => x.id === id); if (!c) return;
    c.status = "resolved"; c.resolvedAt = now(); c.updatedAt = now();
    c.resolvedBy = by || author(); c.resolutionNote = note || null;
    saveLocal();
  }
  function reopen(id) {
    const c = comments.find((x) => x.id === id); if (!c) return;
    c.status = "open"; c.resolvedAt = null; c.resolvedBy = null; c.resolutionNote = null; c.updatedAt = now();
    saveLocal();
  }
  function remove(id) {
    comments = comments.filter((x) => x.id !== id); saveLocal();
  }

  // ── Export ──────────────────────────────────────────────────────────────
  function exportJson() {
    const sorted = [...comments].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "comments.json"; a.click();
    URL.revokeObjectURL(url);
  }

  // ── UI: review bar + drawer scaffold ────────────────────────────────────
  function buildChrome() {
    const layer = document.getElementById("review-layer");
    layer.innerHTML = `
      <div class="review-bar">
        <span class="review-bar__title">Review</span>
        <span class="review-bar__stat" id="rb-open"><span class="dotw"></span> 0 open</span>
        <span class="review-bar__stat" id="rb-resolved"><span class="dotr"></span> 0 resolved</span>
        <button class="rb-toggle" id="rb-toggle">Enable comments</button>
        <button class="rb-ghost" id="rb-list">All comments</button>
        <button class="rb-ghost" id="rb-export">Export</button>
      </div>
      <div class="cmt-drawer" id="cmt-drawer">
        <div class="cmt-drawer__head">
          <span class="ttl">Comments</span>
          <button class="cmt-pop__close" id="drawer-close" style="margin-left:auto">&times;</button>
        </div>
        <div class="cmt-drawer__filters">
          <button class="cmt-filter" data-f="open">Open</button>
          <button class="cmt-filter" data-f="resolved">Resolved</button>
          <button class="cmt-filter" data-f="all">All</button>
        </div>
        <div class="cmt-drawer__list" id="drawer-list"></div>
        <div class="cmt-drawer__foot">
          <input id="reviewer-name" placeholder="Your name (saved locally)" />
          <button class="btn btn--success btn--block" id="drawer-export">Export comments.json</button>
          <p class="cmt-hint">Comments save to your browser as you type. <b>Export</b> downloads <code>comments.json</code> — commit it to git (or send it over) and Claude will action each open comment and mark it resolved.</p>
        </div>
      </div>`;

    document.getElementById("rb-toggle").onclick = toggleReview;
    document.getElementById("rb-list").onclick = openDrawer;
    document.getElementById("rb-export").onclick = exportJson;
    document.getElementById("drawer-export").onclick = exportJson;
    document.getElementById("drawer-close").onclick = closeDrawer;
    layer.querySelectorAll(".cmt-filter").forEach((b) => {
      b.onclick = () => { drawerFilter = b.dataset.f; renderDrawer(); };
    });
    const nameInput = document.getElementById("reviewer-name");
    nameInput.value = localStorage.getItem(LS_NAME) || "";
    nameInput.oninput = () => localStorage.setItem(LS_NAME, nameInput.value.trim());

    if (localStorage.getItem(LS_REVIEW_ON) === "1") toggleReview();
    updateBar();
  }

  function updateBar() {
    const o = document.getElementById("rb-open");
    const r = document.getElementById("rb-resolved");
    if (o) o.innerHTML = `<span class="dotw"></span> ${totalOpen()} open`;
    if (r) r.innerHTML = `<span class="dotr"></span> ${totalResolved()} resolved`;
  }

  function toggleReview() {
    reviewOn = !reviewOn;
    document.body.classList.toggle("review-on", reviewOn);
    const btn = document.getElementById("rb-toggle");
    btn.classList.toggle("is-on", reviewOn);
    btn.textContent = reviewOn ? "Comment mode: ON" : "Enable comments";
    localStorage.setItem(LS_REVIEW_ON, reviewOn ? "1" : "0");
    if (!reviewOn) closePopover();
    refresh();
  }

  // ── UI: pins on commentable sections ────────────────────────────────────
  function refresh() {
    // remove old pins
    document.querySelectorAll(".cmt-pin").forEach((p) => p.remove());
    if (!reviewOn) { updateBar(); return; }
    const els = document.querySelectorAll("#content [data-comment]");
    els.forEach((el) => {
      const id = el.getAttribute("data-comment");
      const label = el.getAttribute("data-comment-label") || id;
      const list = forSection(id);
      const open = list.filter((c) => c.status === "open").length;
      const state = open > 0 ? "open" : (list.length ? "resolved" : "none");
      const pin = document.createElement("button");
      pin.className = "cmt-pin";
      pin.setAttribute("data-state", state);
      pin.title = `Comment on: ${label}`;
      pin.innerHTML = `💬${list.length ? `<span class="cmt-pin__count">${list.length}</span>` : ""}`;
      pin.onclick = (e) => { e.stopPropagation(); openPopover(id, label, pin); };
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.appendChild(pin);
    });
    updateBar();
  }

  // ── UI: popover thread ──────────────────────────────────────────────────
  function closePopover() {
    if (activePopover) { activePopover.remove(); activePopover = null; }
    document.removeEventListener("keydown", escClose);
  }
  function escClose(e) { if (e.key === "Escape") closePopover(); }

  function openPopover(sectionId, label, anchor) {
    closePopover();
    const pop = document.createElement("div");
    pop.className = "cmt-pop";
    pop.innerHTML = `
      <div class="cmt-pop__head">
        <div>
          <div class="ttl">Comments</div>
          <div class="sub">${escapeHtml(label)}</div>
        </div>
        <button class="cmt-pop__close" title="Close">&times;</button>
      </div>
      <div class="cmt-pop__list" id="pop-list"></div>
      <div class="cmt-pop__form">
        <input id="pop-name" placeholder="Your name" />
        <textarea id="pop-text" placeholder="Add a comment for this section…"></textarea>
        <button class="btn btn--primary btn--block" id="pop-add">Add comment</button>
      </div>`;
    document.body.appendChild(pop);
    activePopover = pop;

    // position near anchor, kept on-screen
    const r = anchor.getBoundingClientRect();
    const w = 340;
    let left = Math.min(r.right - w, window.innerWidth - w - 12);
    left = Math.max(12, left);
    let top = r.bottom + 8;
    if (top + 360 > window.innerHeight) top = Math.max(12, r.top - 360);
    pop.style.left = left + "px";
    pop.style.top = top + "px";

    pop.querySelector(".cmt-pop__close").onclick = closePopover;
    const nameI = pop.querySelector("#pop-name");
    nameI.value = localStorage.getItem(LS_NAME) || "";
    nameI.oninput = () => localStorage.setItem(LS_NAME, nameI.value.trim());
    const textI = pop.querySelector("#pop-text");
    pop.querySelector("#pop-add").onclick = () => {
      const t = textI.value.trim(); if (!t) { textI.focus(); return; }
      add(sectionId, label, t);
      textI.value = "";
      renderPopList(sectionId);
      refresh();
    };
    textI.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") pop.querySelector("#pop-add").click();
    });

    renderPopList(sectionId);
    document.addEventListener("keydown", escClose);
    setTimeout(() => document.addEventListener("click", outsideClose), 0);
  }
  function outsideClose(e) {
    if (activePopover && !activePopover.contains(e.target) && !e.target.classList.contains("cmt-pin")) {
      closePopover(); document.removeEventListener("click", outsideClose);
    }
  }

  function renderPopList(sectionId) {
    const list = document.getElementById("pop-list"); if (!list) return;
    const items = forSection(sectionId).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    if (!items.length) { list.innerHTML = `<div class="cmt-empty">No comments yet on this section.</div>`; return; }
    list.innerHTML = items.map(renderItem).join("");
    bindItemActions(list, sectionId);
  }

  function renderItem(c) {
    const when = fmtWhen(c.createdAt);
    const res = c.status === "resolved"
      ? `<div class="cmt-item__resolution"><b>✓ Resolved</b>${c.resolvedBy ? " by " + escapeHtml(c.resolvedBy) : ""}${c.resolutionNote ? " — " + escapeHtml(c.resolutionNote) : ""}</div>`
      : "";
    const actions = c.status === "resolved"
      ? `<button class="reopen" data-act="reopen" data-id="${c.id}">Reopen</button><button class="del" data-act="del" data-id="${c.id}">Delete</button>`
      : `<button class="resolve" data-act="resolve" data-id="${c.id}">Mark resolved</button><button class="del" data-act="del" data-id="${c.id}">Delete</button>`;
    return `
      <div class="cmt-item ${c.status === "resolved" ? "resolved" : ""}">
        <div class="cmt-item__meta"><span class="cmt-item__author">${escapeHtml(c.author)}</span> · <span>${when}</span> · <span class="pill pill--plain ${c.status === "resolved" ? "pill--success" : "pill--warn"}" style="padding:0 8px">${c.status}</span></div>
        <div class="cmt-item__text">${escapeHtml(c.text)}</div>
        ${res}
        <div class="cmt-item__actions">${actions}</div>
      </div>`;
  }

  function bindItemActions(scope, sectionId) {
    scope.querySelectorAll("[data-act]").forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.id;
        if (b.dataset.act === "resolve") resolve(id, "Resolved in review", author());
        if (b.dataset.act === "reopen") reopen(id);
        if (b.dataset.act === "del") remove(id);
        if (sectionId) renderPopList(sectionId);
        renderDrawer();
        refresh();
      };
    });
  }

  // ── UI: all-comments drawer ─────────────────────────────────────────────
  let backdrop = null;
  function openDrawer() {
    document.getElementById("cmt-drawer").classList.add("open");
    backdrop = document.createElement("div");
    backdrop.className = "overlay-backdrop";
    backdrop.onclick = closeDrawer;
    document.body.appendChild(backdrop);
    renderDrawer();
  }
  function closeDrawer() {
    document.getElementById("cmt-drawer").classList.remove("open");
    if (backdrop) { backdrop.remove(); backdrop = null; }
  }
  function renderDrawer() {
    const list = document.getElementById("drawer-list"); if (!list) return;
    document.querySelectorAll(".cmt-filter").forEach((b) => b.classList.toggle("on", b.dataset.f === drawerFilter));
    let items = [...comments];
    if (drawerFilter !== "all") items = items.filter((c) => c.status === drawerFilter);
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (!items.length) { list.innerHTML = `<div class="cmt-empty">No ${drawerFilter === "all" ? "" : drawerFilter} comments.</div>`; return; }
    list.innerHTML = items.map((c) => `
      <div class="cmt-card" data-section="${c.sectionId}">
        <div class="cmt-card__loc">${escapeHtml(c.sectionLabel || c.sectionId)}</div>
        <div class="cmt-card__text">${escapeHtml(c.text)}</div>
        ${c.status === "resolved" && c.resolutionNote ? `<div class="cmt-item__resolution" style="margin-top:6px"><b>✓</b> ${escapeHtml(c.resolutionNote)}</div>` : ""}
        <div class="cmt-card__foot">
          <span class="pill pill--plain ${c.status === "resolved" ? "pill--success" : "pill--warn"}" style="padding:0 8px">${c.status}</span>
          <span>${escapeHtml(c.author)}</span><span>·</span><span>${fmtWhen(c.createdAt)}</span>
        </div>
      </div>`).join("");
    list.querySelectorAll(".cmt-card").forEach((card) => {
      card.onclick = () => {
        const sid = card.dataset.section;
        const el = document.querySelector(`#content [data-comment="${sid}"]`);
        closeDrawer();
        if (!reviewOn) toggleReview();
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => {
            const pin = el.querySelector(".cmt-pin");
            if (pin) openPopover(sid, el.getAttribute("data-comment-label") || sid, pin);
          }, 350);
        }
      };
    });
  }

  // ── helpers ─────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }
  function fmtWhen(iso) {
    try { return new Date(iso).toLocaleString("en-SG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch (_) { return iso; }
  }

  // ── boot ────────────────────────────────────────────────────────────────
  async function init() {
    await load();
    buildChrome();
    refresh();
  }

  return { init, refresh, exportJson, _state: () => comments };
})();
