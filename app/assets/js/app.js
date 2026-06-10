/* ============================================================================
   Neoflo · B2B Cash Application — SPA router + screen views
   Pure vanilla JS. Hash routing (#/dashboard, #/workspace, …). No build step.
   ========================================================================== */
(function () {
  "use strict";
  const D = window.DATA;
  const $ = (sel, root = document) => root.querySelector(sel);
  const content = $("#content");
  const topbar = $("#topbar");

  // ── Org context (entity drives currency; bank chosen in the left nav) ──────
  let selectedEntityId = D.entities[0].id;
  let selectedBankId = D.banks[0].id;
  const currentEntity = () => D.entities.find((e) => e.id === selectedEntityId) || D.entities[0];
  const banksForEntity = () => D.banks.filter((b) => b.entity === selectedEntityId);

  // ── Icons (inline SVG, currentColor) ─────────────────────────────────────
  const icon = (name) => {
    const p = {
      dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="11" width="7" height="10" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/>',
      workspace: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
      unapplied: '<path d="M12 1v22M5 8h9a3 3 0 0 1 0 6H7"/>',
      deductions: '<path d="M4 7h16M4 12h10M4 17h7"/><circle cx="18" cy="16" r="3"/>',
      customers: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6"/>',
      reports: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
      reporting: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
      forecast: '<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v5h-5"/>',
      cashapp: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
      freight: '<rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/>',
      ask: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 17h.01"/>',
      vendor: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
      driver: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',
      finance: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    }[name] || "";
    return `<svg class="navlink__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  };

  // ── Routes (the functional Cash Application sub-pages) ─────────────────────
  const routes = [
    { id: "dashboard",  label: "Dashboard",   render: viewDashboard },
    { id: "workspace",  label: "Apply cash",  render: viewWorkspace },
    { id: "customers",  label: "Customers 360", render: viewCustomers },
  ];
  function buildNav() {
    const nav = $("#sidebar-nav");
    const subs = routes.map((r) =>
      `<button class="navsub" data-route="${r.id}" title="${r.label}"><span class="navsub__dot"></span><span>${r.label}</span></button>`).join("");
    nav.innerHTML = `
      <div class="navgroup" id="navgroup-cashapp">
        <button class="navlink navlink--group is-open" id="cashapp-toggle">
          ${icon("cashapp")}<span>Cash Application - B2B</span>
          <svg class="navlink__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="navsubs" id="cashapp-subs">${subs}</div>
      </div>`;
    nav.querySelectorAll(".navsub").forEach((a) => { a.onclick = () => { location.hash = "#/" + a.dataset.route; }; });
    const grp = nav.querySelector("#cashapp-toggle");
    grp.onclick = () => { nav.querySelector("#navgroup-cashapp").classList.toggle("collapsed"); grp.classList.toggle("is-open"); };
  }
  function setActiveNav(id) {
    document.querySelectorAll(".navsub").forEach((a) => a.classList.toggle("is-active", a.dataset.route === id));
  }

  // ── Topbar helper ───────────────────────────────────────────────────────
  function setTopbar(title, subtitle, metaHtml = "", actionsHtml = "") {
    topbar.innerHTML = `
      <div class="topbar__titles">
        <div class="topbar__title">${title}</div>
        ${subtitle ? `<div class="topbar__subtitle">${subtitle}</div>` : ""}
      </div>
      <div class="topbar__spacer"></div>
      <div class="topbar__meta">${metaHtml}${actionsHtml}</div>`;
  }

  // ── small render helpers ──────────────────────────────────────────────────
  const fmt = D.fmt;
  const pill = (text, tone) => `<span class="pill pill--${tone}">${text}</span>`;
  function dc(id, label) { return `data-comment="${id}" data-comment-label="${label}"`; }
  function escapeAttr(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function emptyState(title, hint) {
    return `<div class="empty-state"><div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M3 12l9 4 9-4"/></svg></div><div class="empty-state__title">${title}</div>${hint ? `<div class="empty-state__hint">${hint}</div>` : ""}</div>`;
  }
  function svgLine(vals, stroke) {
    const w = 480, h = 150, pad = 12;
    const max = Math.max(...vals), min = Math.min(...vals);
    const pts = vals.map((v, i) => [pad + i * (w - 2 * pad) / (vals.length - 1), h - pad - ((v - min) / ((max - min) || 1)) * (h - 2 * pad)]);
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = `M${pad} ${h - pad} ` + pts.map((p) => "L" + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") + ` L${w - pad} ${h - pad} Z`;
    const dots = pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="${stroke}"/>`).join("");
    return `<svg viewBox="0 0 ${w} ${h}" class="svgchart" preserveAspectRatio="none"><path d="${area}" fill="${stroke}" opacity="0.08"/><path d="${line}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/>${dots}</svg>`;
  }
  function svgMultiLine(series, labels) {
    const w = 900, h = 240, padL = 34, padR = 10, padT = 14, padB = 26;
    const all = series.flatMap((s) => s.vals); const max = Math.ceil(Math.max(...all) / 5) * 5, min = Math.floor(Math.min(...all) / 5) * 5;
    const n = labels.length;
    const X = (i) => padL + (n === 1 ? 0 : i * (w - padL - padR) / (n - 1));
    const Y = (v) => h - padB - ((v - min) / ((max - min) || 1)) * (h - padT - padB);
    const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => { const v = Math.round(min + t * (max - min)); const y = Y(v).toFixed(1); return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="#e7e6e3" stroke-width="1"/><text x="${padL - 6}" y="${(+y + 3)}" font-size="10" fill="#848076" text-anchor="end">${v}%</text>`; }).join("");
    const paths = series.map((s) => {
      const line = s.vals.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(" ");
      const dots = s.vals.map((v, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3" fill="${s.color}"/>`).join("");
      return `<path d="${line}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round"/>${dots}`;
    }).join("");
    const xl = labels.map((l, i) => `<text x="${X(i).toFixed(1)}" y="${h - 8}" font-size="10" fill="#848076" text-anchor="middle">${l}</text>`).join("");
    return `<svg viewBox="0 0 ${w} ${h}" class="svgchart svgchart--tall" preserveAspectRatio="xMidYMid meet">${grid}${paths}${xl}</svg>`;
  }
  const MONTHS12 = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  let dashTf = 12; // trend timeframe in months

  // ════════════════════════════════════════════════════════════════════════
  //  DASHBOARD
  // ════════════════════════════════════════════════════════════════════════
  let dashSort = { key: "ageDays", dir: -1 };
  function viewDashboard() {
    const db = D.dashboardFor(selectedEntityId);
    const ccy = db.ccy;
    setTopbar("Cash Application Dashboard", "Daily health — applied, identified, unapplied, exceptions",
      `<label class="topbar__chip topbar__chip--select"><span>Entity</span>
         <select id="entity-select" aria-label="Select entity">
           ${D.entities.map((e) => `<option value="${e.id}" ${e.id === selectedEntityId ? "selected" : ""}>${e.name}</option>`).join("")}
         </select>
       </label>
       <span class="topbar__chip"><span>Processed till</span> <b id="period-chip">${D.lastStatementDate}</b></span>
       <span class="topbar__chip"><span>Currency</span> <b id="currency-chip">${ccy}</b></span>`,
      "");

    const kpis = db.kpis.map((k) => `
      <div class="kpi kpi--${k.tone} kpi--accent-${k.accent || "primary"} ${k.drill ? "kpi--clickable" : ""}" ${k.drill ? `data-drill="${k.drill}"` : ""}>
        <div class="kpi__top">
          <div class="kpi__label">${k.label}</div>
          ${k.info ? `<button class="info-btn" data-info="${escapeAttr(k.info)}" aria-label="What is this metric?">i</button>` : ""}
        </div>
        <div class="kpi__value" ${k.exact ? `title="${escapeAttr(k.exact)}"` : ""}>${k.value} <span class="kpi__trend ${k.deltaTone === "up" ? "up" : "down"}">${k.delta}</span></div>
        <div class="kpi__sub">${k.sub || ""}</div>
        ${k.drill ? `<div class="kpi__drill">View breakdown →</div>` : ""}
      </div>`).join("");

    const maxAge = Math.max(...db.ageing.map((b) => b.amount));
    const ageBars = db.ageing.map((b) => `
      <div class="hbar">
        <span>${b.label}</span>
        <div class="hbar__track"><div class="hbar__fill hbar__fill--age" style="width:${maxAge ? (b.amount / maxAge) * 100 : 0}%"></div></div>
        <span class="hbar__val">${D.fmtCompact(b.amount, ccy)}</span>
      </div>`).join("");

    // exceptions by type: count + amount (both shown)
    const maxEx = Math.max(...db.byType.map((e) => e.count));
    const hbars = db.byType.map((e) => `
      <div class="hbar hbar--ex">
        <span>${e.label}</span>
        <div class="hbar__track"><div class="hbar__fill" style="width:${maxEx ? (e.count / maxEx) * 100 : 0}%"></div></div>
        <span class="hbar__val">${e.count} · ${D.fmtCompact(e.amount, ccy)}</span>
      </div>`).join("");

    // Aged unapplied — bank-statement style, full list (scrollable, sortable)
    const sortArrow = (k) => dashSort.key === k ? (dashSort.dir < 0 ? " ▾" : " ▴") : "";
    const sorted = db.list.slice().sort((a, b) => {
      const av = dashSort.key === "date" ? a.date : dashSort.key === "amount" ? a.amount : a.ageDays;
      const bv = dashSort.key === "date" ? b.date : dashSort.key === "amount" ? b.amount : b.ageDays;
      return (av < bv ? -1 : av > bv ? 1 : 0) * dashSort.dir;
    });
    const queue = sorted.map((u) => `
      <tr>
        <td class="muted" style="white-space:nowrap">${u.date}</td>
        <td><div class="cell-main" style="font-weight:var(--font-weight-medium)">${u.desc}</div><div class="cell-sub">${u.customer} · ${u.id}</div></td>
        <td class="num strong">${fmt(u.amount, ccy)}</td>
        <td>${pill(u.ageDays + "d", u.tone)}</td>
        <td>${pill(u.reason, u.tone)}</td>
      </tr>`).join("");

    // merged auto-apply + customer-identification trend (timeframe selectable)
    const endAA = parseInt(db.kpis[0].value), endID = parseInt(db.kpis[1].value);
    const genSeries = (end, span) => MONTHS12.map((_, i) => Math.min(99, Math.max(50, Math.round(end - span + span * (i / 11) + (((i * 7 + db.count) % 5) - 2)))));
    const aaS = genSeries(endAA, 14), idS = genSeries(endID, 9), keep = dashTf;
    const trendChart = svgMultiLine(
      [{ vals: aaS.slice(12 - keep), color: "var(--surface-success-default)" }, { vals: idS.slice(12 - keep), color: "var(--surface-primary-default)" }],
      MONTHS12.slice(12 - keep));

    content.innerHTML = `
      <div class="section" ${dc("dash.kpis", "Dashboard · KPI tiles")}>
        <div class="kpis">${kpis}</div>
      </div>

      <div class="section" ${dc("dash.trend", "Dashboard · Auto-apply & identification trend")}>
        <div class="card">
          <div class="card__head"><div class="card__title">Auto-apply rate &amp; customer identification — trend</div>
            <div class="seg" id="tf-seg">${[3, 6, 12].map((m) => `<button class="seg__btn ${dashTf === m ? "on" : ""}" data-tf="${m}">${m}m</button>`).join("")}</div>
          </div>
          <div class="card__body">
            <div class="legend" style="margin-bottom:6px">
              <span><i style="background:var(--surface-success-default)"></i> Auto-apply rate</span>
              <span><i style="background:var(--surface-primary-default)"></i> Customer identification</span>
            </div>
            ${trendChart}
          </div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns: 1fr 1fr; align-items:start">
        <div class="card" ${dc("dash.ageing", "Dashboard · Unapplied cash ageing")}>
          <div class="card__head"><div class="card__title">Unapplied cash ageing — ${D.fmtCompact(db.totalUnapplied, ccy)}</div></div>
          <div class="card__body"><div class="hbars hbars--age">${ageBars}</div></div>
        </div>
        <div class="card" ${dc("dash.exceptions", "Dashboard · Exceptions by type")}>
          <div class="card__head"><div class="card__title">Exceptions by type</div><span class="muted" style="font-size:12px">${db.count} total · count · amount</span></div>
          <div class="card__body"><div class="hbars">${hbars}</div></div>
        </div>
      </div>

      <div class="section" style="margin-top:var(--scale-300)" ${dc("dash.queue", "Dashboard · Aged unapplied work queue")}>
        <div class="card">
          <div class="card__head"><div class="card__title">Bank statement — aged unapplied credits (oldest first)</div><span class="muted" style="font-size:12px">${db.list.length} line items</span></div>
          <div class="card__body card__body--flush"><div class="table-wrap table-scroll"><table class="tbl tbl--fixed">
            <colgroup><col style="width:12%"><col style="width:40%"><col style="width:16%"><col style="width:12%"><col style="width:20%"></colgroup>
            <thead><tr><th class="sortable" data-sort="date">Date${sortArrow("date")}</th><th>Description</th><th class="num sortable" data-sort="amount">Amount${sortArrow("amount")}</th><th class="sortable" data-sort="ageDays">Age${sortArrow("ageDays")}</th><th>Reason / exception type</th></tr></thead>
            <tbody>${queue}</tbody>
          </table></div></div>
        </div>
      </div>`;

    const entSel = $("#entity-select");
    if (entSel) entSel.onchange = () => {
      selectedEntityId = entSel.value;
      const first = banksForEntity()[0]; if (first) selectedBankId = first.id;
      syncSidebarContext();
      viewDashboard();                 // re-render so ALL data + currency follow the entity
      if (window.COMMENTS) COMMENTS.refresh();
      toast(`Entity → ${currentEntity().name} · ${currentEntity().currency}`);
    };

    content.querySelectorAll(".kpi--clickable").forEach((tile) => {
      tile.onclick = (e) => { if (e.target.closest(".info-btn")) return; openBreakdown(tile.dataset.drill); };
    });
    content.querySelectorAll(".info-btn").forEach((b) => {
      b.onclick = (e) => { e.stopPropagation(); showInfo(b, b.dataset.info); };
    });
    content.querySelectorAll("th.sortable").forEach((th) => {
      th.onclick = () => {
        const k = th.dataset.sort;
        if (dashSort.key === k) dashSort.dir *= -1; else { dashSort.key = k; dashSort.dir = -1; }
        viewDashboard(); if (window.COMMENTS) COMMENTS.refresh();
      };
    });
    content.querySelectorAll("#tf-seg .seg__btn").forEach((b) => {
      b.onclick = () => { dashTf = +b.dataset.tf; viewDashboard(); if (window.COMMENTS) COMMENTS.refresh(); };
    });
  }

  // ── KPI breakdown modal (derived from the same entity data, always ties) ──
  function openBreakdown(key) {
    const db = D.dashboardFor(selectedEntityId), ccy = db.ccy;
    if (key === "unapplied") {
      const rows = db.list.slice().sort((a, b) => b.ageDays - a.ageDays).map((u) => `
        <tr><td class="muted" style="white-space:nowrap">${u.date}</td><td class="cell-main">${u.desc}</td><td class="muted">${u.customer}</td><td class="num strong">${fmt(u.amount, ccy)}</td></tr>`).join("");
      openModal("Unapplied cash — line by line", `
        <div class="modal-sub">All ${db.list.length} unapplied lines from the bank statement. Total ties to the tile: <b>${D.fmtCompact(db.totalUnapplied, ccy)}</b> (${fmt(db.totalUnapplied, ccy)}).</div>
        <div class="table-wrap table-scroll"><table class="tbl">
          <thead><tr><th>Value date</th><th>Description</th><th>Customer</th><th class="num">Amount</th></tr></thead>
          <tbody>${rows}<tr class="modal-total"><td colspan="3" class="num">Total</td><td class="num strong">${fmt(db.totalUnapplied, ccy)}</td></tr></tbody>
        </table></div>`);
    } else {
      // Line-by-line, same shape as the unapplied modal, with an exception-type column
      const rows = db.list.slice().sort((a, b) => b.ageDays - a.ageDays).map((u) => `
        <tr><td class="muted" style="white-space:nowrap">${u.date}</td><td class="cell-main">${u.desc}</td><td>${pill(u.reason, u.tone)}</td><td class="num strong">${fmt(u.amount, ccy)}</td></tr>`).join("");
      openModal("Open exceptions — line by line", `
        <div class="modal-sub">All ${db.count} open exceptions from the bank statement, by exception type. Total ties to <b>${D.fmtCompact(db.totalUnapplied, ccy)}</b> (${fmt(db.totalUnapplied, ccy)}).</div>
        <div class="table-wrap table-scroll"><table class="tbl">
          <thead><tr><th>Value date</th><th>Description</th><th>Exception type</th><th class="num">Amount</th></tr></thead>
          <tbody>${rows}<tr class="modal-total"><td colspan="3" class="num">Total (${db.count})</td><td class="num strong">${fmt(db.totalUnapplied, ccy)}</td></tr></tbody>
        </table></div>`);
    }
  }

  function openModal(title, html) {
    closeModal();
    const back = document.createElement("div");
    back.className = "modal-backdrop"; back.id = "app-modal";
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <div class="modal__head"><div class="modal__title">${title}</div><button class="modal__close" aria-label="Close">&times;</button></div>
      <div class="modal__body">${html}</div>
    </div>`;
    document.body.appendChild(back);
    back.onclick = (e) => { if (e.target === back) closeModal(); };
    back.querySelector(".modal__close").onclick = closeModal;
    document.addEventListener("keydown", modalEsc);
  }
  function closeModal() { const m = document.getElementById("app-modal"); if (m) m.remove(); document.removeEventListener("keydown", modalEsc); }
  function modalEsc(e) { if (e.key === "Escape") closeModal(); }

  // ── Info popover for (i) buttons ────────────────────────────────────────
  function showInfo(anchor, text) {
    const existing = document.getElementById("info-pop"); if (existing) existing.remove();
    const pop = document.createElement("div");
    pop.className = "info-pop"; pop.id = "info-pop"; pop.textContent = text;
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.left = Math.min(r.left, window.innerWidth - pop.offsetWidth - 12) + "px";
    pop.style.top = (r.bottom + 6) + "px";
    const close = (e) => { if (!pop.contains(e.target) && e.target !== anchor) { pop.remove(); document.removeEventListener("mousedown", close); } };
    setTimeout(() => document.addEventListener("mousedown", close), 0);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  WORKSPACE  (analyst cockpit + queue)
  // ════════════════════════════════════════════════════════════════════════
  let activeReceiptId = null;
  const _cockpit = {};                       // per credit, so edits persist across renders
  function bankName() { const b = D.banks.find((x) => x.id === selectedBankId); return b ? b.name : "—"; }
  function confOf(it) { return it.reason === "Unidentified customer" ? "—" : (0.72 + ((Math.abs(it.amount) % 26) / 100)).toFixed(2); }
  function getCredit(id) {
    const db = D.dashboardFor(selectedEntityId);
    const it = (id && db.list.find((x) => x.id === id)) || db.list[0];
    const key = selectedEntityId + ":" + it.id;
    if (!_cockpit[key]) {
      const cp = D.buildCockpit(it, db.ccy);
      _cockpit[key] = { id: it.id, bankRef: it.id, amount: it.amount, ccy: db.ccy, valueDate: it.date,
        narration: it.desc, bankAcct: bankName(), customer: cp.customer, invoices: cp.invoices, available: cp.available || [],
        gap: cp.gap, remittance: cp.remittance, aiConf: cp.aiConf, sla: cp.sla, reason: it.reason };
    } else { _cockpit[key].bankAcct = bankName(); }
    return _cockpit[key];
  }

  function viewWorkspace() {
    const db = D.dashboardFor(selectedEntityId), ccy = db.ccy;
    const r = getCredit(activeReceiptId); activeReceiptId = r.id;
    setTopbar("Apply cash", `Credit ${fmt(r.amount, ccy)} · ${r.valueDate} · ref ${r.bankRef}`,
      `<span class="topbar__chip"><span>Statement</span> ${currentEntity().name}</span>`,
      "");

    // Same bank-statement credits as the dashboard (consistent data + amounts)
    const queueRows = db.list.map((x) => `
      <tr class="queue-row ${x.id === r.id ? "is-active" : ""}" data-rid="${x.id}">
        <td class="muted" style="white-space:nowrap">${x.date}</td>
        <td><div class="cell-main" style="font-weight:var(--font-weight-medium)">${x.desc}</div><div class="cell-sub">${bankName()} · ref ${x.id}</div></td>
        <td class="num strong">${fmt(x.amount, ccy)}</td>
        <td>${x.customer === "— unidentified —" ? `<span class="pill pill--error">Unidentified</span>` : `<span class="cell-main">${x.customer}</span>`}</td>
        <td class="dot-conf">${confOf(x)}</td>
      </tr>`).join("");

    content.innerHTML = `
      <div class="section" ${dc("ws.queue", "Workspace · Credit queue")}>
        <div class="card">
          <div class="card__head"><div class="card__title">Bank statement — open &amp; unapplied credits</div><span class="muted" style="font-size:12px">${db.list.length} lines</span></div>
          <div class="card__body card__body--flush"><div class="table-wrap ws-queue-scroll" id="ws-queue-scroll"><table class="tbl tbl--fixed">
            <colgroup><col style="width:11%"><col style="width:45%"><col style="width:15%"><col style="width:19%"><col style="width:10%"></colgroup>
            <thead><tr><th>Date</th><th>Description</th><th class="num">Amount</th><th>Identified customer</th><th>Conf.</th></tr></thead>
            <tbody>${queueRows}</tbody>
          </table></div></div>
        </div>
      </div>
      <div id="cockpit"></div>`;

    content.querySelectorAll(".queue-row").forEach((row) => {
      row.onclick = () => { activeReceiptId = row.dataset.rid; viewWorkspace(); window.COMMENTS && COMMENTS.refresh(); };
    });
    const arow = content.querySelector(".queue-row.is-active");
    if (arow) arow.scrollIntoView({ block: "nearest" });

    renderCockpit(r);
  }

  function renderCockpit(r) {
    const cockpit = $("#cockpit");
    if (!r._orig) r._orig = JSON.parse(JSON.stringify(r.invoices));   // snapshot for "Remittance" rule
    r.adjustments = r.adjustments || [];
    // left pane
    const identified = r.customer ? `
      <div class="identified-box">
        <div class="name">${r.customer.name} &nbsp;·&nbsp; conf ${r.customer.confidence.toFixed(2)}</div>
        <div class="howline">how: ${r.customer.how}</div>
        <button class="btn btn--ghost btn--sm" id="change-customer" style="margin-top:10px">Change customer</button>
      </div>` : `
      <div class="identified-box" style="border-color:var(--border-error-default);background:var(--surface-error-subtle)">
        <div class="name" style="color:var(--text-error-hover)">No customer resolved</div>
        <div class="howline">Routed to suspense — pick the right customer.</div>
        <button class="btn btn--ghost btn--sm" id="change-customer" style="margin-top:10px">Pick customer</button>
      </div>`;

    const remit = r.remittance.listed ? `
      <div class="remit-linked"><b>RA-${r.bankRef}</b> linked · ${r.remittance.listed} invoices · parse confidence ${Math.round(r.remittance.parsed * 100)}%</div>
      <a class="remit-link" id="view-remit">View remittance advice ↗</a>`
      : `<div class="muted">No remittance advice matched to this credit yet.</div>`;

    const left = `
      <div class="ws-pane ws-pane--credit" ${dc("ws.credit", "Workspace · The credit + identified customer")}>
        <div class="credit-cols">
          <div class="credit-col">
            <div class="ws-pane__title" style="padding:0 0 var(--scale-200)">The credit</div>
            <div class="credit-amount">${fmt(r.amount, r.ccy)}<span class="credit-amount__tag">received</span></div>
            <dl class="kv">
              <dt>Value date</dt><dd>${r.valueDate}</dd>
              <dt>Bank a/c</dt><dd>${r.bankAcct}</dd>
              <dt>Narration</dt><dd class="kv__narr">${r.narration}</dd>
            </dl>
          </div>
          <div class="credit-col">
            <div class="ws-pane__title" style="padding:0 0 var(--scale-200)">Identified customer</div>
            ${identified}
          </div>
          <div class="credit-col">
            <div class="ws-pane__title" style="padding:0 0 var(--scale-200)">Remittance advice</div>
            <div class="remit-box">
              ${remit}
              <div class="remit-actions">
                <button class="btn btn--ghost btn--sm" id="upload-remit">Upload remittance</button>
                <input type="file" id="remit-file" style="display:none" accept=".pdf,.eml,.csv,.xlsx,.xls,.png,.jpg" />
              </div>
              <div class="remit-hint">Auto-matched from the connected AR mailbox; or upload a PDF/email to link a payment reference.</div>
            </div>
          </div>
        </div>
      </div>`;

    // middle pane — allocation with per-invoice WHT + discount
    const ccy = r.ccy, num = (n) => fmt(n, ccy).replace(ccy + " ", "");
    const cleared = (i) => i.apply + (i.wht || 0) + (i.discount || 0);
    const allocated = r.invoices.filter((i) => i.sel).reduce((s, i) => s + i.apply, 0);
    const whtTotal = r.invoices.filter((i) => i.sel).reduce((s, i) => s + (i.wht || 0), 0);
    const discTotal = r.invoices.filter((i) => i.sel).reduce((s, i) => s + (i.discount || 0), 0);
    const bankCharge = r.gap.bankCharge || 0;
    const onAccount = r.gap.onAccount || 0;
    const rebateTotal = r.gap.rebate || 0;
    // O2C: cash received can fall short of the invoices for legitimate reasons —
    // WHT and cash discount (taken per line, already inside `allocated`), bank charges
    // deducted in transit, and agreed rebates / deductions / claims. Each EXPLAINS part
    // of the shortfall, so each reduces the unexplained variance toward 0. An
    // overpayment (cash > invoices) is parked on-account. Every total-level field is
    // clamped so it can only ever *close* the gap — never open a new one on an
    // already-balanced receipt. → 0 = fully explained, ready to post.
    const grossGap = allocated - r.amount;                    // + short, − overpay (post per-line WHT/disc)
    const explained = bankCharge + rebateTotal + onAccount;   // total-level explanations
    const unexplained = grossGap > 0 ? Math.max(0, grossGap - explained) : Math.min(0, grossGap + explained);
    const exact = Math.abs(unexplained) < 0.5;
    const canPost = exact && r.invoices.some((i) => i.sel);
    const balText = (u, ex) => ex ? "Balanced" : (u > 0 ? num(u) + " to explain" : num(-u) + " over");
    const anyPartial = r.invoices.some((i) => i.sel && cleared(i) > 0 && cleared(i) < i.open - 0.5);
    const rows = r.invoices.length ? r.invoices.map((i, idx) => {
      const partial = i.sel && cleared(i) > 0 && cleared(i) < i.open - 0.5;
      return `
      <tr class="${partial ? "row-partial" : ""}">
        <td><span class="chk ${i.sel ? "on" : ""}" data-toggle="${idx}" role="checkbox" aria-checked="${i.sel}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span></td>
        <td class="cell-main">${i.inv}${partial ? ` <span class="pill pill--warn pill--plain" style="padding:1px 7px">Partial</span>` : ""}</td>
        <td class="muted">${i.due}</td>
        <td class="num">${num(i.open)}</td>
        <td class="num"><input class="line-in" data-i="${idx}" data-f="wht" inputmode="decimal" value="${i.wht || ""}" placeholder="0" ${i.sel ? "" : "disabled"} /></td>
        <td class="num"><input class="line-in" data-i="${idx}" data-f="discount" inputmode="decimal" value="${i.discount || ""}" placeholder="0" ${i.sel ? "" : "disabled"} /></td>
      </tr>`; }).join("") : `<tr><td colspan="6">${emptyState("No open invoices to allocate", "Identify the customer first — the credit is in suspense.")}</td></tr>`;

    const mid = `
      <div class="ws-pane" ${dc("ws.allocation", "Workspace · Open invoices & proposed allocation")}>
        <div class="ws-pane__title">Open invoices — proposed allocation</div>
        <div class="table-wrap" style="padding:12px 8px 0"><table class="tbl tbl--fixed alloc-tbl">
          <colgroup><col style="width:8%"><col style="width:28%"><col style="width:22%"><col style="width:20%"><col style="width:11%"><col style="width:11%"></colgroup>
          <thead><tr><th>✓</th><th>Invoice</th><th>Due</th><th class="num">Open</th><th class="num">WHT</th><th class="num">Disc.</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
        ${r.available && r.available.length ? `<div class="add-inv"><span>Add invoice</span>
          <select id="add-inv-sel"><option value="">— select a relevant open invoice —</option>${r.available.map((a, j) => `<option value="${j}">${a.inv} · due ${a.due} · ${num(a.open)}</option>`).join("")}</select>
          <button class="btn btn--ghost btn--sm" id="add-inv-btn">Add</button></div>` : ""}
        <div class="alloc-summary">
          <span class="as-item">Receipt <b>${num(r.amount)}</b></span>
          <span class="as-item">Applied <b class="ok">${num(allocated)}</b></span>
          ${whtTotal ? `<span class="as-item">WHT <b>${num(whtTotal)}</b></span>` : ""}
          <span class="as-grow"></span>
          <span class="bal-chip ${exact ? "ok" : "warn"}" id="alloc-var">${balText(unexplained, exact)}</span>
        </div>
        <div class="gap-note ${exact ? "is-ok" : ""}">${r.gap.note}</div>
        ${anyPartial && !r._partialOk ? `<div class="partial-banner">
          <span>⚠ <b>Partial match</b> — an invoice is only part-paid. Is this correct?</span>
          <span class="partial-banner__btns"><button class="btn btn--success btn--sm" id="partial-yes">Yes, confirm</button><button class="btn btn--ghost btn--sm" id="partial-no">No, re-work</button></span>
        </div>` : ""}
      </div>`;

    // right pane — gap: total-level adjustments grouped (bank charge, rebate, on-account).
    // WHT & discount are per-invoice (in the allocation table) and shown read-only.
    const rebateType = r.gap.rebateType || "Rebate";
    const rebTypes = ["Rebate", "Agreed deduction", "Claim", "GST/VAT"];
    const right = `
      <div class="ws-pane" ${dc("ws.gap", "Workspace · Gap classification & actions")}>
        <div class="ws-pane__title">Gap classification</div>
        <div class="ws-pane__body">
          <p class="gap-explain">WHT &amp; discount are taken <b>per invoice</b> (allocation table). Bank charge, rebate/deduction and on-account are <b>total-level</b>.</p>
          <div class="gap-group">
            <div class="gap-irow"><span class="lbl">Bank charge</span><span class="gap-input"><span class="gap-ccy">${r.ccy}</span><input class="gap-in" id="bankcharge-in" inputmode="decimal" value="${bankCharge || ""}" placeholder="0.00" /></span></div>
            <div class="gap-irow"><span class="lbl">Rebate / deduction <select id="rebate-type" class="gap-sel">${rebTypes.map((t) => `<option ${t === rebateType ? "selected" : ""}>${t}</option>`).join("")}</select></span><span class="gap-input"><span class="gap-ccy">${r.ccy}</span><input class="gap-in" id="rebate-in" inputmode="decimal" value="${rebateTotal || ""}" placeholder="0.00" /></span></div>
            <div class="gap-irow"><span class="lbl">On account ${Math.abs(unexplained) > 0.5 ? `<button class="lnk-clear" id="park-oa">park residual</button>` : (onAccount > 0 ? `<button class="lnk-clear" id="clear-oa">clear</button>` : "")}</span><span class="gap-input"><span class="gap-ccy">${r.ccy}</span><input class="gap-in ${onAccount ? "is-set" : ""}" id="onaccount-in" inputmode="decimal" value="${onAccount || ""}" placeholder="0.00" /></span></div>
          </div>
          <div class="gap-derived">
            <span>WHT (per-invoice) <b>${whtTotal ? num(whtTotal) : "—"}</b>${whtTotal ? ` <button class="lnk-clear" id="clear-wht">clear</button>` : ""}</span>
            <span>Discount (per-invoice) <b>${discTotal ? num(discTotal) : "—"}</b></span>
          </div>
          <div class="gap-unex ${exact ? "ok" : "warn"}" id="gap-unex"><span class="gap-unex__lbl">${exact ? "Receipt balanced" : "Unexplained"}</span><b>${exact ? "✓ 0.00" : (unexplained < 0 ? "+ " : "− ") + Math.abs(unexplained).toFixed(2)}</b></div>

          <button class="btn btn--ghost btn--block" id="simulate-entry" style="margin-top:14px">Simulate accounting entry</button>
          <div class="actions-grid">
            <button class="btn btn--success ws-action ws-action--primary" data-act="apply" ${canPost ? "" : "disabled"}>Apply &amp; post</button>
          </div>
          ${canPost ? "" : `<div class="post-hint">Balance the receipt before posting — explain the gap (WHT / discount / bank charge / rebate) or park the residual <b>on account</b>.</div>`}
          <div class="ws-foot"><span>AI confidence <b class="conf">${r.aiConf.toFixed(2)}</b></span><span>SLA <b class="sla">${r.sla}</b></span></div>
        </div>
      </div>`;

    cockpit.innerHTML = `<div class="workspace">${left}<div class="ws-bottom">${mid}${right}</div></div>`;

    cockpit.querySelectorAll("[data-act]").forEach((b) => {
      b.onclick = () => actionConfirm(b.dataset.act, r);
    });
    const cc = $("#change-customer");
    if (cc) cc.onclick = () => openCustomerPicker(r);
    const sim = $("#simulate-entry");
    if (sim) sim.onclick = () => simulateEntry(r);

    // per-invoice select toggle + WHT/discount editing (recompute apply)
    const recomputeLine = (i) => { i.apply = Math.max(0, Math.round((i.open - (i.wht || 0) - (i.discount || 0)) * 100) / 100); };
    cockpit.querySelectorAll(".chk[data-toggle]").forEach((el) => {
      el.onclick = () => { const i = r.invoices[+el.dataset.toggle]; i.sel = !i.sel; if (i.sel && !i.apply) recomputeLine(i); if (!i.sel) i.apply = 0; r._partialOk = false; renderCockpit(r); };
    });
    cockpit.querySelectorAll(".line-in").forEach((inp) => {
      inp.onchange = () => { const i = r.invoices[+inp.dataset.i]; i[inp.dataset.f] = Math.max(0, parseFloat(inp.value) || 0); recomputeLine(i); r._partialOk = false; renderCockpit(r); };
    });
    const clrWht = $("#clear-wht");
    if (clrWht) clrWht.onclick = () => { r.invoices.forEach((i) => { i.wht = 0; recomputeLine(i); }); renderCockpit(r); toast("Auto-applied WHT removed"); };
    // Live variance feedback as the user types in any gap field — patches the numbers
    // and the Apply button without a full re-render (so focus / caret are preserved).
    // The authoritative full re-render happens on `change` (blur) below.
    const liveGap = () => {
      const bc = Math.max(0, parseFloat(($("#bankcharge-in") || {}).value) || 0);
      const rb = Math.max(0, parseFloat(($("#rebate-in") || {}).value) || 0);
      const oaV = Math.max(0, parseFloat(($("#onaccount-in") || {}).value) || 0);
      const gg = allocated - r.amount;
      const expl = bc + rb + oaV;
      const unex = gg > 0 ? Math.max(0, gg - expl) : Math.min(0, gg + expl);
      const ok = Math.abs(unex) < 0.5;
      const av = $("#alloc-var");
      if (av) { av.className = "bal-chip " + (ok ? "ok" : "warn"); av.textContent = balText(unex, ok); }
      const gu = $("#gap-unex");
      if (gu) {
        gu.className = "gap-unex " + (ok ? "ok" : "warn");
        gu.querySelector(".gap-unex__lbl").textContent = ok ? "Receipt balanced" : "Unexplained";
        gu.querySelector("b").textContent = ok ? "✓ 0.00" : (unex < 0 ? "+ " : "− ") + Math.abs(unex).toFixed(2);
      }
      const ap = $('[data-act="apply"]');
      if (ap) ap.disabled = !(ok && r.invoices.some((i) => i.sel));
    };
    const bcIn = $("#bankcharge-in");
    if (bcIn) { bcIn.oninput = liveGap; bcIn.onchange = () => { r.gap.bankCharge = Math.max(0, parseFloat(bcIn.value) || 0); renderCockpit(r); }; }

    // add a relevant open invoice to the allocation
    const addBtn = $("#add-inv-btn"), addSel = $("#add-inv-sel");
    if (addBtn && addSel) addBtn.onclick = () => {
      const j = addSel.value; if (j === "") return;
      const a = r.available.splice(+j, 1)[0]; a.sel = true; a.apply = a.open;
      r.invoices.push(a); renderCockpit(r); toast(`Added ${a.inv} to the allocation`);
    };

    // on-account (park residual / clear / edit)
    const parkOa = $("#park-oa");
    if (parkOa) parkOa.onclick = () => { const remaining = Math.max(0, Math.abs(grossGap) - bankCharge - rebateTotal); const amt = Math.round(remaining * 100) / 100; r.gap.onAccount = amt; renderCockpit(r); toast(`Parked ${fmt(amt, r.ccy)} on account`); };
    const clrOa = $("#clear-oa");
    if (clrOa) clrOa.onclick = () => { r.gap.onAccount = 0; renderCockpit(r); };
    const oaIn = $("#onaccount-in");
    if (oaIn) { oaIn.oninput = liveGap; oaIn.onchange = () => { r.gap.onAccount = Math.max(0, parseFloat(oaIn.value) || 0); renderCockpit(r); }; }

    // real partial flow
    const py = $("#partial-yes");
    if (py) py.onclick = () => { r._partialOk = true; renderCockpit(r); toast("Partial confirmed — balance kept open on the invoice"); };
    const pn = $("#partial-no");
    if (pn) pn.onclick = () => { delete _cockpit[selectedEntityId + ":" + r.id]; activeReceiptId = r.id; viewWorkspace(); toast("Sent for re-work — allocation reset"); };

    // total-level rebate / deduction (single field, grouped with bank charge & on-account)
    const rebIn = $("#rebate-in");
    if (rebIn) { rebIn.oninput = liveGap; rebIn.onchange = () => { r.gap.rebate = Math.max(0, parseFloat(rebIn.value) || 0); renderCockpit(r); }; }
    const rebType = $("#rebate-type");
    if (rebType) rebType.onchange = () => { r.gap.rebateType = rebType.value; renderCockpit(r); };

    // remittance advice upload / view
    const up = $("#upload-remit"), rf = $("#remit-file");
    if (up && rf) {
      up.onclick = () => rf.click();
      rf.onchange = () => {
        if (!rf.files[0]) return;
        r.remittance = { listed: r.remittance.listed || 3, parsed: 0.93, file: rf.files[0].name };
        renderCockpit(r); toast(`Remittance ${rf.files[0].name} linked · payment reference matched`);
      };
    }
    const vr = $("#view-remit");
    if (vr) vr.onclick = () => viewRemittance(r);
  }

  // Re-allocate the receipt across invoices by the chosen rule (visibly changes)
  function reallocate(r, rule) {
    if (!r.invoices || !r.invoices.length) return;
    r.gap.allocRule = rule;
    if (rule === "Remittance") {                       // restore the remittance-directed snapshot
      r.invoices = JSON.parse(JSON.stringify(r._orig));
      return;
    }
    let order = r.invoices.slice();
    if (rule === "FIFO (oldest-first)" || rule === "By due date") order.sort((a, b) => (a.due < b.due ? -1 : 1));
    else if (rule === "Exact") order.sort((a, b) => Math.abs(a.open - r.amount) - Math.abs(b.open - r.amount));
    r.invoices.forEach((i) => { i.sel = false; i.apply = 0; });
    let remaining = r.amount;
    for (const i of order) {
      if (remaining <= 0.001) break;
      const ap = Math.min(i.open, remaining);
      i.apply = Math.round(ap * 100) / 100; i.sel = ap > 0; remaining -= ap;
    }
  }

  // Show the parsed remittance advice lines
  function viewRemittance(r) {
    const ccy = r.ccy, cust = r.customer ? r.customer.name : "—";
    const inv = r.invoices.filter((i) => i.sel);
    const total = inv.reduce((s, i) => s + i.open, 0);
    const rows = inv.length ? inv.map((i) => `<tr><td class="cell-main">${i.inv}</td><td class="muted">${i.due}</td><td class="num">${fmt(i.open, ccy)}</td><td class="num">${i.wht ? "− " + fmt(i.wht, ccy) : "—"}</td><td class="num strong">${fmt(i.apply, ccy)}</td></tr>`).join("")
      : `<tr><td colspan="5" class="muted">No lines parsed.</td></tr>`;
    const swift = { Singapore: "DBSSSGSG", Malaysia: "MBBEMYKL", Indonesia: "CENAIDJA", Thailand: "SICOTHBK", Philippines: "BNORPHMM" }[currentEntity().country] || "DBSSSGSG";
    openModal(`Remittance advice (PDF) — RA-${r.bankRef}`, `
      <div class="remit-doc">
        <div class="remit-doc__head">
          <div><div class="remit-doc__logo">${cust}</div><div class="remit-doc__sub">PAYMENT / REMITTANCE ADVICE</div><div class="remit-doc__addr">Generated from SAP · F110 payment run</div></div>
          <div class="remit-doc__meta">
            <div><span>Advice no.</span> RA-${r.bankRef}</div>
            <div><span>Payment date</span> ${r.valueDate}</div>
            <div><span>Value date</span> ${r.valueDate}</div>
            <div><span>Currency</span> ${ccy}</div>
            <div><span>Document type</span> Customer payment (KZ)</div>
          </div>
        </div>
        <div class="remit-doc__party">
          <div><div class="remit-doc__plabel">Remitting party (payer)</div><b>${cust}</b><div class="muted">Bank: ${r.bankAcct} · SWIFT/BIC ${swift}</div></div>
          <div><div class="remit-doc__plabel">Beneficiary</div><b>Neoflo · ${currentEntity().name}</b><div class="muted">Bank ref ${r.bankRef} · Payment reference PMT-${r.bankRef}</div></div>
        </div>
        <table class="tbl remit-doc__tbl">
          <thead><tr><th>Invoice no.</th><th>Invoice date</th><th>Due date</th><th class="num">Gross</th><th class="num">WHT</th><th class="num">Paid</th></tr></thead>
          <tbody>${inv.length ? inv.map((i) => `<tr><td class="cell-main">${i.inv}</td><td class="muted">${D.dashboardFor(selectedEntityId).list.length && i.due}</td><td class="muted">${i.due}</td><td class="num">${fmt(i.open, ccy)}</td><td class="num">${i.wht ? "− " + fmt(i.wht, ccy) : "—"}</td><td class="num strong">${fmt(i.apply, ccy)}</td></tr>`).join("") : `<tr><td colspan="6" class="muted">No lines.</td></tr>`}
            <tr class="modal-total"><td colspan="3" class="num">Total remitted</td><td class="num">${fmt(total, ccy)}</td><td class="num">${fmt(inv.reduce((s, i) => s + (i.wht || 0), 0), ccy)}</td><td class="num strong">${fmt(r.amount, ccy)}</td></tr>
          </tbody>
        </table>
        <div class="remit-doc__foot">Bank narration: <code>${r.narration}</code> · SWIFT/BIC ${swift}. ${r.remittance.file ? "Uploaded: " + escapeAttr(r.remittance.file) + "." : "Auto-matched from the connected AR mailbox."} Apply the lines via the allocation table.</div>
      </div>`);
  }

  // Reassign the credit to a different customer (lists all customers + search)
  function openCustomerPicker(r) {
    const names = D.customersPoolFor(selectedEntityId).slice().sort();
    const opts = names.map((n) => `<button class="picker-item" data-name="${escapeAttr(n)}"><span class="cell-main">${n}</span></button>`).join("");
    openModal("Change customer", `
      <div class="modal-sub">Re-attribute this credit if the suggested customer looks wrong. Your choice is logged and trains the identification model.</div>
      <input id="picker-search" placeholder="Search customers…" style="width:100%;padding:9px;border:1px solid var(--border-default-default);border-radius:var(--radius-sm);margin-bottom:10px;font-family:var(--font-family-inter);font-size:13px" />
      <div class="picker-list" id="picker-list">${opts}</div>`);
    const search = document.getElementById("picker-search");
    if (search) search.oninput = () => {
      const q = search.value.toLowerCase();
      document.querySelectorAll("#picker-list .picker-item").forEach((it) => {
        it.style.display = it.dataset.name.toLowerCase().includes(q) ? "" : "none";
      });
    };
    document.querySelectorAll(".picker-item").forEach((b) => {
      b.onclick = () => {
        const name = b.dataset.name;
        r.customer = { name, id: "manual", confidence: 1.0, how: "manually set by analyst" };
        if (!r.invoices.length) {
          // Was an unidentified credit with no invoices — now that we know the payer,
          // pull their open AR and propose a matching allocation against the receipt.
          const f = D.fetchOpenInvoices(r.amount, r.ccy);
          r.invoices = f.invoices; r.available = f.available; r._orig = null;
          r.remittance = { listed: f.invoices.length, parsed: 0 };
          r.gap.note = `Open invoices fetched for ${name} — proposed allocation matches the receipt. Review and post.`;
          closeModal(); renderCockpit(r); toast(`${name} identified — ${f.invoices.length} open invoice${f.invoices.length > 1 ? "s" : ""} fetched & proposed`);
        } else {
          closeModal(); renderCockpit(r); toast(`Customer set to ${name}`);
        }
      };
    });
  }

  // Preview the journal entry this application would post (PRD §12 conventions)
  function simulateEntry(r) {
    const ccy = r.ccy, cust = r.customer ? r.customer.name : "Unidentified";
    const sel = r.invoices.filter((i) => i.sel);
    const applied = sel.reduce((s, i) => s + i.apply, 0);
    const wht = sel.reduce((s, i) => s + (i.wht || 0), 0);
    const disc = sel.reduce((s, i) => s + (i.discount || 0), 0);
    const arCleared = applied + wht + disc;       // invoices cleared in full (Σ open of selected)
    const grossGap = applied - r.amount;          // > 0 short, < 0 overpay (post per-line WHT/disc)
    const oaEntered = r.gap.onAccount || 0;
    // Distribute the entered explanations against the gap, capped to it — excess is
    // ignored (matching the clamped variance), so a fully-explained receipt balances.
    let shortNeed = Math.max(0, grossGap);
    const bc = Math.min(r.gap.bankCharge || 0, shortNeed); shortNeed -= bc;
    const rebate = Math.min(r.gap.rebate || 0, shortNeed); shortNeed -= rebate;
    const oaDebit = Math.min(oaEntered, shortNeed); shortNeed -= oaDebit;   // residual short → suspense (Dr)
    const overpay = Math.max(0, -grossGap);
    const oaCredit = Math.min(oaEntered, overpay);                          // overpayment → advance (Cr)
    const unexplained = grossGap > 0 ? shortNeed : -(overpay - oaCredit);
    // Debits = cash + non-cash explanations (+ short parked to suspense);
    // Credits = AR cleared (+ overpayment parked as a customer advance).
    const lines = [["Bank (cash received)", r.amount, 0]];
    if (wht) lines.push(["WHT receivable (asset)", wht, 0]);
    if (disc) lines.push(["Cash discount allowed (expense)", disc, 0]);
    if (bc) lines.push(["Bank charges (expense)", bc, 0]);
    if (rebate) lines.push(["Deductions / claims (contra-AR)", rebate, 0]);
    if (oaDebit) lines.push(["On-account / unapplied cash (suspense)", oaDebit, 0]);
    if (arCleared) lines.push([`AR — ${cust} (invoices cleared)`, 0, arCleared]);
    if (oaCredit) lines.push(["Customer advances (on-account)", 0, oaCredit]);
    const body = lines.map((l) => `<tr><td class="cell-main">${l[0]}</td><td class="num">${l[1] ? fmt(l[1], ccy) : ""}</td><td class="num">${l[2] ? fmt(l[2], ccy) : ""}</td></tr>`).join("");
    const totD = lines.reduce((s, l) => s + l[1], 0), totC = lines.reduce((s, l) => s + l[2], 0);
    openModal("Simulated accounting entry", `
      <div class="modal-sub">Preview of the journal entry this application would post to the ERP. Nothing posts until you Apply &amp; post (under maker-checker).</div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>
        <tbody>${body}<tr class="modal-total"><td>Total</td><td class="num">${fmt(totD, ccy)}</td><td class="num">${fmt(totC, ccy)}</td></tr></tbody>
      </table></div>
      <div class="gap-note" style="padding:12px 0 0">${Math.abs(unexplained) < 0.5 ? "✓ Balanced — debits equal credits; ready to post." : (unexplained > 0 ? `Short by ${fmt(unexplained, ccy)} — code a deduction / rebate (or reduce the selection) so it balances.` : `Overpaid by ${fmt(-unexplained, ccy)} — park it on-account so it balances.`)}</div>`);
  }

  // Action buttons open a confirmation dialog (clear, visible feedback)
  function actionConfirm(act, r) {
    const cust = r.customer ? r.customer.name : "—";
    const map = {
      apply:     { t: "Apply & post", danger: false, body: `Post <b>${fmt(r.amount, r.ccy)}</b> for <b>${cust}</b> to the ERP under maker-checker.<div class="modal-sub" style="margin-top:10px">ERP document <b>SAP-${r.bankRef}</b> · queued for checker approval (the proposer cannot self-approve).</div>` },
      split:     { t: "Split credit", danger: false, body: `Split <b>${fmt(r.amount, r.ccy)}</b> across multiple customers / invoices before applying.` },
      park:      { t: "Park on-account", danger: false, body: `Park <b>${fmt(r.amount, r.ccy)}</b> on-account under <b>${cust}</b>, aged for follow-up — the floor outcome.` },
      deduction: { t: "Open deduction", danger: false, body: `Open a coded deduction for the short amount and route it to the claims owner.` },
      reassign:  { t: "Reassign customer", danger: false, body: `Attribute this credit to a different customer (re-runs the identification ladder).` },
      reverse:   { t: "Reverse application", danger: true, body: `Unapply the cash and reopen the invoice(s), with a full audit trail.` },
      "confirm-partial": { t: "Confirm partial match", danger: false, body: `Apply the part amount and keep the remaining balance open on the invoice.` },
      "not-correct":     { t: "Re-work allocation", danger: true, body: `Flag this proposed allocation as incorrect and send it back for re-work.` },
    };
    const m = map[act] || { t: "Action", body: "", danger: false };
    openModal(m.t, `<p style="margin:0 0 4px">${m.body}</p>
      <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn--ghost" id="ac-cancel">Cancel</button>
        <button class="btn btn--${m.danger ? "danger" : "primary"}" id="ac-confirm">Confirm</button>
      </div>`);
    document.getElementById("ac-cancel").onclick = closeModal;
    document.getElementById("ac-confirm").onclick = () => { closeModal(); toast(`${m.t} — done`); };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  UNAPPLIED / ON-ACCOUNT
  // ════════════════════════════════════════════════════════════════════════
  function viewUnapplied() {
    const db = D.dashboardFor(selectedEntityId), ccy = db.ccy;
    const list = db.list, total = db.totalUnapplied;
    setTopbar("Unapplied / on-account cash", "Identified cash with no clean match — aged and escalated, never lost",
      `<span class="topbar__chip"><span>Entity</span> ${currentEntity().name}</span><span class="topbar__chip"><span>Total</span> ${D.fmtCompact(total, ccy)}</span><span class="topbar__chip"><span>Items</span> ${list.length}</span>`,
      `<button class="btn btn--primary" id="run-aging">Run aging escalation</button>`);

    const rows = list.slice().sort((a, b) => b.ageDays - a.ageDays).map((u) => `
      <tr>
        <td class="muted" style="white-space:nowrap">${u.date}</td>
        <td><div class="cell-main">${u.customer}</div><div class="cell-sub">${u.desc} · ${u.id}</div></td>
        <td class="num strong">${fmt(u.amount, ccy)}</td>
        <td>${pill(u.ageDays + "d", u.tone)}</td>
        <td>${pill(u.reason, u.tone)}</td>
        <td class="t-right"><div class="row-actions">
          <button class="btn btn--primary btn--sm" onclick="location.hash='#/workspace'">Apply</button>
          <button class="btn btn--ghost btn--sm">Refund</button>
        </div></td>
      </tr>`).join("");

    content.innerHTML = `
      <div class="section" ${dc("ua.summary", "Unapplied · Summary tiles")}>
        <div class="kpis" style="grid-template-columns:repeat(4,1fr)">
          <div class="kpi kpi--warn"><div class="kpi__label">On-account total</div><div class="kpi__value">${D.fmtCompact(total, ccy)}</div></div>
          <div class="kpi kpi--neutral"><div class="kpi__label">Open items</div><div class="kpi__value">${list.length}</div></div>
          <div class="kpi kpi--info"><div class="kpi__label">Aged &gt; 30 days</div><div class="kpi__value">${list.filter((u) => u.ageDays > 30).length}</div></div>
          <div class="kpi kpi--good"><div class="kpi__label">Resolved this week</div><div class="kpi__value">38</div></div>
        </div>
      </div>
      <div class="section" ${dc("ua.table", "Unapplied · On-account ledger")}>
        <div class="card">
          <div class="card__head"><div class="card__title">On-account ledger — bank statement, oldest first</div><span class="muted" style="font-size:12px">${list.length} line items</span></div>
          <div class="card__body card__body--flush"><div class="table-wrap table-scroll"><table class="tbl tbl--fixed">
            <colgroup><col style="width:11%"><col style="width:34%"><col style="width:14%"><col style="width:9%"><col style="width:18%"><col style="width:14%"></colgroup>
            <thead><tr><th>Value date</th><th>Customer / description</th><th class="num">Amount</th><th>Age</th><th>Reason / exception type</th><th class="t-right">Action</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div></div>
        </div>
      </div>`;

    const ra = $("#run-aging");
    if (ra) ra.onclick = () => {
      const over30 = list.filter((u) => u.ageDays > 30).length, over90 = list.filter((u) => u.ageDays > 90).length;
      openModal("Aging escalation", `
        <div class="modal-sub">Escalate aged on-account cash to owners per policy.</div>
        <p style="margin:0">${over30} items aged &gt; 30 days will be escalated to the AR leads, and ${over90} items &gt; 90 days flagged for write-off review.</p>
        <div style="margin-top:18px;display:flex;justify-content:flex-end;gap:8px"><button class="btn btn--ghost" id="ra-cancel">Cancel</button><button class="btn btn--primary" id="ra-go">Run escalation</button></div>`);
      document.getElementById("ra-cancel").onclick = closeModal;
      document.getElementById("ra-go").onclick = () => { closeModal(); toast("Aging escalation run — owners notified"); };
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  DEDUCTIONS / CLAIMS
  // ════════════════════════════════════════════════════════════════════════
  function viewDeductions() {
    const ccy = D.dashboardFor(selectedEntityId).ccy;
    const ded = D.deductionsFor(selectedEntityId);
    const total = ded.reduce((s, d) => s + d.amount, 0);
    setTopbar("Deductions / claims", "Coded short-payments carried into the claims workflow",
      `<span class="topbar__chip"><span>Entity</span> ${currentEntity().name}</span><span class="topbar__chip"><span>Open value</span> ${D.fmtCompact(total, ccy)}</span><span class="topbar__chip"><span>Items</span> ${ded.length}</span>`,
      "");

    const rows = ded.map((d) => `
      <tr>
        <td class="cell-main">${d.id}</td>
        <td>${d.invoice}</td>
        <td>${d.customer}</td>
        <td class="num strong">${fmt(d.amount, ccy)}</td>
        <td>${d.reason} <span class="tag">${d.code}</span></td>
        <td>${pill(d.status, d.tone)}</td>
        <td class="muted">${d.owner}</td>
        <td class="t-right"><button class="btn btn--ghost btn--sm">Work claim</button></td>
      </tr>`).join("");

    content.innerHTML = `
      <div class="section" ${dc("dd.table", "Deductions · Claims table")}>
        <div class="card">
          <div class="card__head"><div class="card__title">Open deductions &amp; claims</div><span class="muted" style="font-size:12px">from Partial / short &amp; deductions · ${ded.length} items</span></div>
          <div class="card__body card__body--flush"><div class="table-wrap table-scroll"><table class="tbl">
            <thead><tr><th>ID</th><th>Invoice</th><th>Customer</th><th class="num">Amount</th><th>Reason</th><th>Status</th><th>Owner</th><th class="t-right">Action</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div></div>
        </div>
      </div>`;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CUSTOMERS 360
  // ════════════════════════════════════════════════════════════════════════
  let activeCustomerId = null, custTab = "open", custSearch = "";
  function viewCustomers() {
    const all = D.customersFor(selectedEntityId);
    const c = all.find((x) => x.id === activeCustomerId) || all[0];
    activeCustomerId = c.id;
    const ccy = c.ccy;
    setTopbar("Customers 360", "Aliases, open AR and the full SAP-style account view",
      `<span class="topbar__chip"><span>Entity</span> ${currentEntity().name}</span><span class="topbar__chip"><span>Customers</span> ${all.length}</span>`);

    const q = custSearch.toLowerCase();
    const list = all.filter((x) => x.name.toLowerCase().includes(q)).map((x) => `
      <div class="cmt-card" data-cid="${x.id}" style="${x.id === c.id ? "border-color:var(--border-primary-default);background:var(--surface-primary-subtle)" : ""}">
        <div class="cell-main">${x.name}</div>
        <div class="cell-sub">${x.country} · ${x.ccy} · ${x.terms}</div>
        <div class="cmt-card__foot"><span>Open AR ${D.fmtCompact(x.openAr, x.ccy)}</span></div>
      </div>`).join("") || emptyState("No customers found", `Nothing matches “${escapeAttr(custSearch)}”.`);

    const aliases = c.aliases.length ? c.aliases.map((a) => `
      <tr><td class="cell-main">${a.name}</td><td>${a.acct}</td><td>${pill(a.rel, "info")}</td></tr>`).join("")
      : `<tr><td colspan="3" class="muted">No aliases mapped.</td></tr>`;

    // SAP-style account line items (open / cleared / all)
    const openItems = c.invoices.map((i) => ({ doc: i.inv, date: i.due, type: "Invoice", amount: i.open, status: "Open", tone: "warn" }));
    const clDates = ["2026-05-02", "2026-04-18", "2026-03-29", "2026-05-21", "2026-04-05", "2026-03-12"];
    const cleared = clDates.map((d, j) => ({ doc: (j % 3 === 2 ? "CR-" : "INV-") + (6000 + j * 13 + c.id.length * 7), date: d, type: j % 3 === 2 ? "Credit memo" : "Invoice", amount: Math.round(c.openAr * 0.12 * (1 + (j % 4)) / 4) * (j % 3 === 2 ? -1 : 1), status: "Cleared", tone: "success" }));
    const openTotal = openItems.reduce((s, i) => s + i.amount, 0);
    const clearedTotal = cleared.reduce((s, i) => s + i.amount, 0);
    const items = custTab === "open" ? openItems : custTab === "cleared" ? cleared : openItems.concat(cleared);
    const itemRows = items.map((i) => `
      <tr><td class="cell-main">${i.doc}</td><td class="muted">${i.date}</td><td>${i.type}</td><td class="num strong">${fmt(i.amount, ccy)}</td><td>${pill(i.status, i.tone)}</td></tr>`).join("");

    content.innerHTML = `
      <div class="split">
        <div>
          <div class="card" style="margin-bottom:var(--scale-300)" ${dc("cust.header", "Customer 360 · Header & metrics")}>
            <div class="card__body">
              <div class="section__head"><div class="section__title" style="font-size:20px">${c.name}</div>${pill(c.country, "neutral")}</div>
              <div class="kpis" style="grid-template-columns:repeat(3,1fr);margin-top:var(--scale-200)">
                <div class="kpi kpi--accent-primary"><div class="kpi__label">Open AR</div><div class="kpi__value" style="font-size:22px">${D.fmtCompact(c.openAr, ccy)}</div></div>
                <div class="kpi kpi--accent-brand"><div class="kpi__label">Unapplied</div><div class="kpi__value" style="font-size:22px">${D.fmtCompact(c.unapplied, ccy)}</div></div>
                <div class="kpi kpi--accent-success"><div class="kpi__label">ID rate</div><div class="kpi__value" style="font-size:22px">${Math.round(c.idRate * 100)}%</div></div>
              </div>
            </div>
          </div>

          <div class="card" style="margin-bottom:var(--scale-300)" ${dc("cust.items", "Customer 360 · SAP account view")}>
            <div class="card__head"><div class="card__title">Account line items (SAP view)</div>
              <div class="seg" id="cust-tab-seg">
                <button class="seg__btn ${custTab === "open" ? "on" : ""}" data-tab="open">Open items</button>
                <button class="seg__btn ${custTab === "cleared" ? "on" : ""}" data-tab="cleared">Cleared</button>
                <button class="seg__btn ${custTab === "all" ? "on" : ""}" data-tab="all">All items</button>
              </div>
            </div>
            <div class="sap-totals">
              <span>Open <b>${fmt(openTotal, ccy)}</b></span>
              <span>Cleared <b>${fmt(clearedTotal, ccy)}</b></span>
              <span>Balance (open) <b>${fmt(openTotal, ccy)}</b></span>
            </div>
            <div class="card__body card__body--flush"><div class="table-wrap"><table class="tbl">
              <thead><tr><th>Document</th><th>Posting date</th><th>Type</th><th class="num">Amount</th><th>Status</th></tr></thead>
              <tbody>${itemRows}</tbody></table></div></div>
          </div>

          <div class="card" ${dc("cust.aliases", "Customer 360 · Payer aliases")}>
            <div class="card__head"><div class="card__title">Payer aliases &amp; relationships</div></div>
            <div class="card__body card__body--flush"><div class="table-wrap"><table class="tbl">
              <thead><tr><th>Payer name / account</th><th>Bank a/c</th><th>Relationship</th></tr></thead>
              <tbody>${aliases}</tbody></table></div></div>
          </div>
        </div>

        <div class="card aside-card" ${dc("cust.list", "Customer 360 · Customer picker")}>
          <div class="card__head"><div class="card__title">Customers</div></div>
          <div class="card__body">
            <input id="cust-search" placeholder="Search customers…" value="${escapeAttr(custSearch)}" style="width:100%;padding:9px;border:1px solid var(--border-default-default);border-radius:var(--radius-sm);margin-bottom:10px;font-family:var(--font-family-inter);font-size:13px" />
            <div class="detail-list" id="cust-list">${list}</div>
          </div>
        </div>
      </div>`;

    content.querySelectorAll("#cust-list .cmt-card").forEach((el) => {
      el.onclick = () => { activeCustomerId = el.dataset.cid; viewCustomers(); window.COMMENTS && COMMENTS.refresh(); };
    });
    content.querySelectorAll("#cust-tab-seg .seg__btn").forEach((b) => {
      b.onclick = () => { custTab = b.dataset.tab; viewCustomers(); window.COMMENTS && COMMENTS.refresh(); };
    });
    const cs = $("#cust-search");
    if (cs) cs.oninput = () => { custSearch = cs.value; const list2 = content.querySelector("#cust-list"); const matches = all.filter((x) => x.name.toLowerCase().includes(custSearch.toLowerCase())); list2.innerHTML = matches.length ? matches.map((x) => `<div class="cmt-card" data-cid="${x.id}" style="${x.id === c.id ? "border-color:var(--border-primary-default);background:var(--surface-primary-subtle)" : ""}"><div class="cell-main">${x.name}</div><div class="cell-sub">${x.country} · ${x.ccy} · ${x.terms}</div><div class="cmt-card__foot"><span>Open AR ${D.fmtCompact(x.openAr, x.ccy)}</span></div></div>`).join("") : `<div class="muted" style="font-size:13px;padding:8px">No customers match.</div>`; list2.querySelectorAll(".cmt-card").forEach((el) => { el.onclick = () => { activeCustomerId = el.dataset.cid; viewCustomers(); }; }); };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  REPORTS
  // ════════════════════════════════════════════════════════════════════════
  function viewReports() {
    const db = D.dashboardFor(selectedEntityId), ccy = db.ccy;
    const custs = D.customersFor(selectedEntityId);
    const autoApply = parseInt(db.kpis[0].value), custId = parseInt(db.kpis[1].value);
    setTopbar("Reports & close", "Success metrics, trends and the close pack — all in " + ccy,
      `<span class="topbar__chip"><span>Entity</span> ${currentEntity().name}</span><span class="topbar__chip"><span>Processed till</span> <b>${D.lastStatementDate}</b></span>`,
      "");

    // derive 12-week trends from the entity seed so they tie to the KPIs
    const wk = (end, span) => Array.from({ length: 12 }, (_, i) => Math.round((end - span) + span * (i / 11)));
    const aaTrend = wk(autoApply, 14), idTrend = wk(custId, 8);
    const maxBy = Math.max(...db.byType.map((b) => b.count));
    const exBars = db.byType.map((b) => `
      <div class="barcol"><div class="barpair"><div class="bar bar--applied" style="height:${(b.count / maxBy) * 100}%" title="${b.count}"></div></div><div class="barlabel" style="font-size:9px">${b.label.split(" ")[0]}</div></div>`).join("");
    const maxAge = Math.max(...db.ageing.map((a) => a.amount));
    const ageBars = db.ageing.map((a) => `
      <div class="hbar"><span>${a.label}</span><div class="hbar__track"><div class="hbar__fill hbar__fill--age" style="width:${maxAge ? (a.amount / maxAge) * 100 : 0}%"></div></div><span class="hbar__val">${D.fmtCompact(a.amount, ccy)}</span></div>`).join("");
    const topCust = custs.slice().sort((a, b) => b.openAr - a.openAr).slice(0, 8).map((c) => `
      <tr><td class="cell-main">${c.name}</td><td class="num strong">${D.fmtCompact(c.openAr, ccy)}</td><td class="num">${D.fmtCompact(c.unapplied, ccy)}</td><td class="num">${Math.round(c.idRate * 100)}%</td></tr>`).join("");
    const metrics = [
      ["Auto-apply rate", autoApply + "%", "Cash applied with no human touch"],
      ["Customer identification", custId + "%", "Credits attributed to a customer"],
      ["Unapplied cash", D.fmtCompact(db.totalUnapplied, ccy), `${db.count} on-account items`],
      ["Open exceptions", String(db.count), "Across 4 exception types"],
      ["Median time to apply", "4.2 hrs", "Credit received → applied"],
      ["WHT recovered (QTD)", D.fmtCompact(Math.round(db.totalUnapplied * 0.12), ccy), "Cleared against certificates"],
    ];
    const metricRows = metrics.map((m) => `<div class="metric-row"><div><div class="cell-main">${m[0]}</div><div class="cell-sub">${m[2]}</div></div><div class="m-val">${m[1]}</div></div>`).join("");

    content.innerHTML = `
      <div class="section" ${dc("rep.kpis", "Reports · Headline metrics")}>
        <div class="kpis">
          ${metrics.slice(0, 4).map((m, i) => `<div class="kpi kpi--accent-${["success", "primary", "brand", "error"][i]}"><div class="kpi__label">${m[0]}</div><div class="kpi__value">${m[1]}</div><div class="kpi__sub">${m[2]}</div></div>`).join("")}
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1fr 1fr;align-items:start">
        <div class="card" ${dc("rep.aatrend", "Reports · Auto-apply trend (line)")}>
          <div class="card__head"><div class="card__title">Auto-apply rate — 12-week trend</div></div>
          <div class="card__body">${svgLine(aaTrend, "var(--surface-success-default)")}<p class="muted" style="margin-top:8px">Trending up as the model learns each analyst confirmation.</p></div>
        </div>
        <div class="card" ${dc("rep.idtrend", "Reports · Customer identification trend (line)")}>
          <div class="card__head"><div class="card__title">Customer identification — 12-week trend</div></div>
          <div class="card__body">${svgLine(idTrend, "var(--surface-primary-default)")}<p class="muted" style="margin-top:8px">The O2C floor metric — share of credits attributed to a customer.</p></div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1fr 1fr;align-items:start;margin-top:var(--scale-300)">
        <div class="card" ${dc("rep.exbar", "Reports · Exceptions by type (bar)")}>
          <div class="card__head"><div class="card__title">Open exceptions by type</div><span class="muted" style="font-size:12px">${db.count} total</span></div>
          <div class="card__body"><div class="barchart">${exBars}</div></div>
        </div>
        <div class="card" ${dc("rep.agebar", "Reports · Unapplied ageing (bars)")}>
          <div class="card__head"><div class="card__title">Unapplied cash ageing — ${D.fmtCompact(db.totalUnapplied, ccy)}</div></div>
          <div class="card__body"><div class="hbars hbars--age">${ageBars}</div></div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1.3fr 1fr;align-items:start;margin-top:var(--scale-300)">
        <div class="card" ${dc("rep.topcust", "Reports · Top customers by open AR")}>
          <div class="card__head"><div class="card__title">Top customers by open AR</div></div>
          <div class="card__body card__body--flush"><div class="table-wrap"><table class="tbl">
            <thead><tr><th>Customer</th><th class="num">Open AR</th><th class="num">Unapplied</th><th class="num">ID rate</th></tr></thead>
            <tbody>${topCust}</tbody>
          </table></div></div>
        </div>
        <div class="card" ${dc("rep.metrics", "Reports · Success metrics")}>
          <div class="card__head"><div class="card__title">Success metrics &amp; close pack</div></div>
          <div class="card__body">${metricRows}</div>
        </div>
      </div>`;
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  let toastT;
  function toast(msg) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t);
      Object.assign(t.style, { position: "fixed", bottom: "76px", left: "50%", transform: "translateX(-50%)",
        background: "var(--text-color-primary-black)", color: "#fff", padding: "10px 18px", borderRadius: "999px",
        fontSize: "13px", fontWeight: "600", zIndex: 1200, boxShadow: "var(--shadow-large)", fontFamily: "var(--font-family-plus-jakarta-sans)" });
    }
    t.textContent = msg; t.style.opacity = "1";
    clearTimeout(toastT); toastT = setTimeout(() => { t.style.opacity = "0"; }, 2200);
  }

  // ── Router ────────────────────────────────────────────────────────────────
  function router() {
    const hash = (location.hash || "#/dashboard").replace("#/", "");
    const route = routes.find((r) => r.id === hash) || routes[0];
    setActiveNav(route.id);
    route.render();
    content.classList.remove("view-in"); void content.offsetWidth; content.classList.add("view-in"); // smooth view transition
    window.scrollTo(0, 0);
    if (window.COMMENTS) COMMENTS.refresh();
  }

  // ── Sidebar org-context controls (entity label + bank selector) ─────────────
  function syncSidebarContext() {
    const sbEnt = $("#sb-entity"); if (sbEnt) sbEnt.textContent = currentEntity().name;
    const bankSel = $("#bank-select");
    if (bankSel) {
      const list = banksForEntity();
      if (!list.some((b) => b.id === selectedBankId)) selectedBankId = (list[0] || {}).id;
      bankSel.innerHTML = list.map((b) => `<option value="${b.id}" ${b.id === selectedBankId ? "selected" : ""}>${b.name}</option>`).join("");
      bankSel.onchange = () => { selectedBankId = bankSel.value; };
    }
    const addBtn = $("#add-bank-btn");
    if (addBtn) addBtn.onclick = openBankManager;
  }

  // Bank account management — add multiple accounts per entity, each fed by a
  // direct MT940 feed from the bank or by manual upload.
  function openBankManager() {
    const list = banksForEntity();
    const rows = list.length
      ? list.map((b) => `<tr><td class="cell-main">${b.name}</td><td>${pill(b.feed || "MT940 direct feed", b.feed === "Manual upload" ? "warn" : "primary")}</td></tr>`).join("")
      : `<tr><td colspan="2" class="muted">No bank accounts yet for this entity.</td></tr>`;
    openModal(`Bank accounts — ${currentEntity().name}`, `
      <div class="modal-sub">Add multiple bank accounts per entity. Each account is fed either by a <b>direct MT940 feed</b> from the bank, or by <b>manual statement upload</b>.</div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>Account</th><th>Feed type</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="bankform">
        <div class="bankform__title">Add a bank account</div>
        <input id="bank-name" placeholder="e.g. UOB · …321 (SGD)" />
        <div class="bankform__feeds">
          <label><input type="radio" name="feed" value="MT940 direct feed" checked> Direct feed — MT940 from bank</label>
          <label><input type="radio" name="feed" value="Manual upload"> Manual upload</label>
        </div>
        <div id="upload-row" style="display:none;margin-top:8px;align-items:center;gap:8px">
          <input type="file" id="bank-file" accept=".mt940,.940,.txt,.csv,.xml,.sta,.camt" style="display:none">
          <button class="btn btn--ghost btn--sm" id="bank-browse">Choose statement file…</button>
          <span id="bank-filename" class="muted" style="font-size:12px">No file selected</span>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
          <button class="btn btn--ghost" id="bank-close">Close</button>
          <button class="btn btn--primary" id="bank-add">Add account</button>
        </div>
      </div>`);
    const fileInput = document.getElementById("bank-file");
    const fileLabel = document.getElementById("bank-filename");
    const uploadRow = document.getElementById("upload-row");
    document.querySelectorAll('input[name="feed"]').forEach((rb) => {
      rb.onchange = () => { uploadRow.style.display = (document.querySelector('input[name="feed"]:checked').value === "Manual upload") ? "flex" : "none"; };
    });
    document.getElementById("bank-browse").onclick = () => fileInput.click();
    fileInput.onchange = () => { fileLabel.textContent = fileInput.files[0] ? fileInput.files[0].name : "No file selected"; };
    document.getElementById("bank-close").onclick = closeModal;
    document.getElementById("bank-add").onclick = () => {
      const name = document.getElementById("bank-name").value.trim();
      if (!name) { document.getElementById("bank-name").focus(); return; }
      const feed = (document.querySelector('input[name="feed"]:checked') || {}).value || "MT940 direct feed";
      if (feed === "Manual upload" && !fileInput.files[0]) { fileInput.click(); return; } // open file system
      const fileName = fileInput.files[0] ? fileInput.files[0].name : null;
      const id = "bk-" + Date.now();
      D.banks.push({ id, entity: selectedEntityId, name, feed: feed + (fileName ? ` (${fileName})` : "") });
      selectedBankId = id;
      syncSidebarContext();
      openBankManager();
      toast(`Added ${name} · ${feed}${fileName ? " · " + fileName : ""}`);
    };
  }

  // ── Sidebar collapse + mobile drawer ───────────────────────────────────────
  function setupNavToggle() {
    const KEY = "neoflo_nav_collapsed";
    if (localStorage.getItem(KEY) === "1") document.body.classList.add("nav-collapsed");
    const toggle = $("#sidebar-toggle");
    if (toggle) {
      const sync = () => { toggle.title = document.body.classList.contains("nav-collapsed") ? "Expand menu" : "Collapse menu"; };
      sync();
      toggle.onclick = () => {
        const collapsed = document.body.classList.toggle("nav-collapsed");
        localStorage.setItem(KEY, collapsed ? "1" : "0");
        sync();
        if (window.COMMENTS) COMMENTS.refresh();
      };
    }
    const mob = $("#mobile-nav-btn");
    if (mob) mob.onclick = () => document.body.classList.toggle("nav-mobile-open");
    $("#sidebar-nav").addEventListener("click", (e) => {
      if (e.target.closest(".navlink")) document.body.classList.remove("nav-mobile-open");
    });
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  buildNav();
  setupNavToggle();
  syncSidebarContext();
  window.addEventListener("hashchange", router);
  if (!location.hash) location.hash = "#/dashboard";
  router();
  if (window.COMMENTS) COMMENTS.init();
})();
