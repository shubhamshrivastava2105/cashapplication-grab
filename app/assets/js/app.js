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
    }[name] || "";
    return `<svg class="navlink__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  };

  // ── Routes ────────────────────────────────────────────────────────────────
  const routes = [
    { id: "dashboard",  label: "Dashboard",   render: viewDashboard },
    { id: "workspace",  label: "Apply cash",  render: viewWorkspace },
    { id: "unapplied",  label: "Unapplied / on-account", render: viewUnapplied },
    { id: "deductions", label: "Deductions / claims", render: viewDeductions },
    { id: "customers",  label: "Customers 360", render: viewCustomers },
    { id: "reports",    label: "Reports",     render: viewReports },
  ];

  function buildNav() {
    const nav = $("#sidebar-nav");
    nav.innerHTML = routes.map((r) =>
      `<button class="navlink" data-route="${r.id}" title="${r.label}">${icon(r.id)}<span>${r.label}</span></button>`
    ).join("");
    nav.querySelectorAll(".navlink").forEach((a) => {
      a.onclick = () => { location.hash = "#/" + a.dataset.route; };
    });
  }
  function setActiveNav(id) {
    document.querySelectorAll(".navlink").forEach((a) => a.classList.toggle("is-active", a.dataset.route === id));
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

  // ════════════════════════════════════════════════════════════════════════
  //  DASHBOARD
  // ════════════════════════════════════════════════════════════════════════
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
      <div class="kpi kpi--${k.tone} ${k.drill ? "kpi--clickable" : ""}" ${k.drill ? `data-drill="${k.drill}"` : ""}>
        <div class="kpi__head">
          <div class="kpi__label">${k.label}</div>
          ${k.info ? `<button class="info-btn" data-info="${escapeAttr(k.info)}" aria-label="What is this metric?">i</button>` : ""}
        </div>
        <div class="kpi__value">${k.value}</div>
        <div class="kpi__delta ${k.deltaTone ? "delta-" + k.deltaTone : "muted"}">${k.delta}</div>
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

    // Aged unapplied — bank-statement style, full 250-line list (scrollable)
    const queue = db.list.slice().sort((a, b) => b.ageDays - a.ageDays).map((u) => `
      <tr>
        <td class="muted" style="white-space:nowrap">${u.date}</td>
        <td><div class="cell-main" style="font-weight:var(--font-weight-medium)">${u.desc}</div><div class="cell-sub">${u.customer} · ${u.id}</div></td>
        <td class="num strong">${fmt(u.amount, ccy)}</td>
        <td>${pill(u.ageDays + "d", u.tone)}</td>
        <td>${pill(u.reason, u.tone)}</td>
      </tr>`).join("");

    content.innerHTML = `
      <div class="section" ${dc("dash.kpis", "Dashboard · KPI tiles")}>
        <div class="kpis">${kpis}</div>
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
            <thead><tr><th>Date</th><th>Description</th><th class="num">Amount</th><th>Age</th><th>Reason / exception type</th></tr></thead>
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
      const rows = db.byType.map((e) => `
        <tr><td class="cell-main">${e.label}</td><td class="num strong">${e.count}</td><td class="num">${fmt(e.amount, ccy)}</td></tr>`).join("");
      openModal("Open exceptions — by type", `
        <div class="modal-sub">Grouped by exception type; counts sum to the tile total <b>${db.count}</b>, amounts to <b>${D.fmtCompact(db.totalUnapplied, ccy)}</b>.</div>
        <div class="table-wrap"><table class="tbl">
          <thead><tr><th>Exception type</th><th class="num">Count</th><th class="num">Amount</th></tr></thead>
          <tbody>${rows}<tr class="modal-total"><td class="num">Total</td><td class="num strong">${db.count}</td><td class="num strong">${fmt(db.totalUnapplied, ccy)}</td></tr></tbody>
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
  let activeReceiptId = D.receipts[0].id;

  function viewWorkspace() {
    const r = D.receipts.find((x) => x.id === activeReceiptId) || D.receipts[0];
    setTopbar("Apply cash", `Credit ${fmt(r.amount, r.ccy)} · ${r.valueDate} · ref ${r.bankRef}`,
      `<span class="topbar__chip"><span>Statement</span> ${currentEntity().name}</span><span class="topbar__chip"><span>Open credits</span> ${D.receipts.length}</span>`,
      "");

    // Bank-statement style: Date · Description · Amount · Identified customer · Confidence
    const queueRows = D.receipts.map((x) => `
      <tr class="queue-row ${x.id === r.id ? "is-active" : ""}" data-rid="${x.id}">
        <td class="muted" style="white-space:nowrap">${x.valueDate}</td>
        <td><div class="cell-main" style="font-weight:var(--font-weight-medium)">${x.narration}</div><div class="cell-sub">${x.bankAcct} · ref ${x.bankRef}</div></td>
        <td class="num strong">${fmt(x.amount, x.ccy)}</td>
        <td>${x.customer ? `<span class="cell-main">${x.customer.name}</span>` : `<span class="pill pill--error">Unidentified</span>`}</td>
        <td class="dot-conf">${x.customer ? x.customer.confidence.toFixed(2) : "—"}</td>
      </tr>`).join("");

    content.innerHTML = `
      <div class="section" ${dc("ws.queue", "Workspace · Credit queue")}>
        <div class="card">
          <div class="card__head"><div class="card__title">Bank statement — open &amp; unapplied credits</div><span class="muted" style="font-size:12px">${D.receipts.length} lines</span></div>
          <div class="card__body card__body--flush"><div class="table-wrap"><table class="tbl">
            <thead><tr><th>Date</th><th>Description</th><th class="num">Amount</th><th>Identified customer</th><th>Confidence</th></tr></thead>
            <tbody>${queueRows}</tbody>
          </table></div></div>
        </div>
      </div>
      <div id="cockpit"></div>`;

    content.querySelectorAll(".queue-row").forEach((row) => {
      row.onclick = () => { activeReceiptId = row.dataset.rid; viewWorkspace(); window.COMMENTS && COMMENTS.refresh(); };
    });

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
      <div class="ws-pane" ${dc("ws.credit", "Workspace · The credit + identified customer")}>
        <div class="ws-pane__title">The credit</div>
        <div class="ws-pane__body">
          <dl class="kv">
            <dt>Amount</dt><dd>${fmt(r.amount, r.ccy)}</dd>
            <dt>Value date</dt><dd>${r.valueDate}</dd>
            <dt>Narration</dt><dd>${r.narration}</dd>
            <dt>Bank a/c</dt><dd>${r.bankAcct}</dd>
          </dl>
          <div class="ws-pane__title" style="padding-left:0">Identified customer</div>
          ${identified}
          <div class="ws-pane__title" style="padding-left:0;margin-top:12px">Remittance advice</div>
          <div class="remit-box">
            ${remit}
            <div class="remit-actions">
              <button class="btn btn--ghost btn--sm" id="upload-remit">Upload remittance</button>
              <input type="file" id="remit-file" style="display:none" accept=".pdf,.eml,.csv,.xlsx,.xls,.png,.jpg" />
            </div>
            <div class="remit-hint">Auto-matched from the connected AR mailbox; or upload a PDF/email to link a payment reference and apply to invoices.</div>
          </div>
        </div>
      </div>`;

    // middle pane — allocation
    const allocated = r.invoices.filter((i) => i.sel).reduce((s, i) => s + i.apply, 0);
    const variance = r.amount - allocated;
    const anyPartial = r.invoices.some((i) => i.sel && i.apply > 0 && i.apply < i.open);
    const rows = r.invoices.length ? r.invoices.map((i) => {
      const partial = i.sel && i.apply > 0 && i.apply < i.open;
      return `
      <tr class="${partial ? "row-partial" : ""}">
        <td><span class="chk ${i.sel ? "on" : ""}">${i.sel ? "✓" : ""}</span></td>
        <td class="cell-main">${i.inv}${partial ? ` <span class="pill pill--warn pill--plain" style="padding:1px 7px">Partial</span>` : ""}</td>
        <td class="muted">${i.due}</td>
        <td class="num">${fmt(i.open, r.ccy).replace(r.ccy + " ", "")}</td>
        <td class="num ${i.apply ? "apply-amt" : "muted"}">${i.apply ? fmt(i.apply, r.ccy).replace(r.ccy + " ", "") : "0.00"}</td>
      </tr>`; }).join("") : `<tr><td colspan="5" class="cmt-empty">No open invoices selected — identify the customer first.</td></tr>`;

    const mid = `
      <div class="ws-pane" ${dc("ws.allocation", "Workspace · Open invoices & proposed allocation")}>
        <div class="ws-pane__title">Open invoices — proposed allocation</div>
        <div class="table-wrap" style="padding:12px 8px 0"><table class="tbl">
          <thead><tr><th>✓</th><th>Invoice</th><th>Due</th><th class="num">Open</th><th class="num">Apply</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
        <div class="alloc-summary">
          <span>Allocated: <span class="ok">${fmt(allocated, r.ccy).replace(r.ccy + " ", "")}</span></span>
          <span>Variance: <span class="${Math.abs(variance) < 0.01 ? "ok" : ""}" style="${Math.abs(variance) >= 0.01 ? "color:var(--text-brand-default)" : ""}">${variance.toFixed(2)}</span></span>
        </div>
        <div class="gap-note">${r.gap.note}</div>
        ${anyPartial ? `<div class="partial-banner">
          <span>⚠ <b>Partial match</b> — an invoice is only part-paid. Is this correct?</span>
          <span class="partial-banner__btns"><button class="btn btn--success btn--sm" data-act="confirm-partial">Yes, confirm</button><button class="btn btn--ghost btn--sm" data-act="not-correct">No, re-work</button></span>
        </div>` : ""}
        <div class="alloc-rule">Allocation rule:
          <select id="alloc-rule"><option ${r.gap.allocRule === "Remittance" ? "selected" : ""}>Remittance</option><option ${r.gap.allocRule === "Subset-sum" ? "selected" : ""}>Subset-sum</option><option ${r.gap.allocRule === "Exact" ? "selected" : ""}>Exact</option><option>FIFO (oldest-first)</option><option>By due date</option><option>By PO</option><option>Manual</option></select>
        </div>
      </div>`;

    // right pane — gap & actions
    const g = r.gap;
    const gapRow = (lbl, val, cls) => `<div class="gap-row"><span class="lbl">${lbl}</span><span class="val ${cls || ""}">${val}</span></div>`;
    const moneyOrDash = (n) => (n ? (n < 0 ? "− " : "+ ") + Math.abs(n).toFixed(2) : "—");
    const sumAdj = r.adjustments.reduce((s, a) => s + a.amount, 0);
    const remainUnexplained = (g.unexplained || 0) - sumAdj;
    const adjRows = r.adjustments.map((a, idx) =>
      `<div class="gap-row"><span class="lbl">${a.type}</span><span class="val brand">− ${a.amount.toFixed(2)} <button class="adj-del" data-adj="${idx}" title="Remove">×</button></span></div>`).join("");
    const right = `
      <div class="ws-pane" ${dc("ws.gap", "Workspace · Gap classification & actions")}>
        <div class="ws-pane__title">Gap classification</div>
        <div class="ws-pane__body">
          <p class="gap-explain">The gap is <b>cash received − invoices selected</b>, classified by cause before anything posts. Account for any agreed GST, discount, rebate or deduction below.</p>
          ${gapRow("WHT", g.wht ? `${moneyOrDash(g.wht)} → receivable` : "—", g.wht ? "brand" : "")}
          ${gapRow("Discount", moneyOrDash(g.discount))}
          ${gapRow("Bank charge", moneyOrDash(g.bankCharge), g.bankCharge ? "brand" : "")}
          ${adjRows}
          ${gapRow("Unexplained", Math.abs(remainUnexplained) < 0.01 ? "0.00" : moneyOrDash(-remainUnexplained), Math.abs(remainUnexplained) < 0.01 ? "ok" : "brand")}

          <div class="adj-box">
            <div class="adj-title">Account for a difference</div>
            <div class="adj-form">
              <select id="adj-type">
                <option>GST</option><option>Cash discount</option><option>Payment discount</option>
                <option>Rebate</option><option>Agreed deduction</option><option>WHT</option>
              </select>
              <input id="adj-amt" type="number" min="0" step="0.01" placeholder="Amount (${r.ccy})" />
              <button class="btn btn--ghost btn--sm" id="adj-add">Add</button>
            </div>
          </div>

          <button class="btn btn--ghost btn--block" id="simulate-entry" style="margin-top:14px">Simulate accounting entry</button>
          <div class="ws-pane__title" style="padding-left:0;margin-top:18px">Action</div>
          <div class="actions-grid">
            <button class="btn btn--success ws-action ws-action--primary" data-act="apply">Apply &amp; post</button>
          </div>
          <div class="conf-line" style="margin-top:14px">AI confidence <span class="conf">${r.aiConf.toFixed(2)}</span></div>
          <div class="conf-line">SLA <span class="sla">${r.sla}</span></div>
        </div>
      </div>`;

    cockpit.innerHTML = `<div class="workspace">${left}${mid}${right}</div>`;

    cockpit.querySelectorAll("[data-act]").forEach((b) => {
      b.onclick = () => actionConfirm(b.dataset.act, r);
    });
    const ruleSel = $("#alloc-rule");
    if (ruleSel) ruleSel.onchange = () => { reallocate(r, ruleSel.value); renderCockpit(r); toast(`Re-allocated by: ${ruleSel.value}`); };
    const cc = $("#change-customer");
    if (cc) cc.onclick = () => openCustomerPicker(r);
    const sim = $("#simulate-entry");
    if (sim) sim.onclick = () => simulateEntry(r);

    // deduction / GST / rebate adjustments
    const adjAdd = $("#adj-add");
    if (adjAdd) adjAdd.onclick = () => {
      const type = $("#adj-type").value;
      const amt = parseFloat($("#adj-amt").value);
      if (!amt || amt <= 0) { $("#adj-amt").focus(); return; }
      r.adjustments.push({ type, amount: amt });
      renderCockpit(r); toast(`Accounted ${type}: ${fmt(amt, r.ccy)}`);
    };
    cockpit.querySelectorAll(".adj-del").forEach((b) => {
      b.onclick = () => { r.adjustments.splice(+b.dataset.adj, 1); renderCockpit(r); };
    });

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
    const cust = r.customer ? r.customer.name : "—";
    const inv = r.invoices.filter((i) => i.sel);
    const rows = inv.length ? inv.map((i) => `<tr><td class="cell-main">${i.inv}</td><td class="muted">${i.due}</td><td class="num strong">${fmt(i.apply, r.ccy)}</td></tr>`).join("")
      : `<tr><td colspan="3" class="muted">No lines parsed.</td></tr>`;
    openModal(`Remittance advice — RA-${r.bankRef}`, `
      <div class="modal-sub">${r.remittance.file ? "Uploaded file: <b>" + escapeAttr(r.remittance.file) + "</b>. " : "Auto-matched from the AR mailbox. "}Payment reference linked to <b>${cust}</b>.</div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Invoice</th><th>Due</th><th class="num">Amount advised</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`);
  }

  // Reassign the credit to a different customer
  function openCustomerPicker(r) {
    const opts = D.customers.map((c) => `<button class="picker-item" data-cid="${c.id}" data-name="${escapeAttr(c.name)}"><span class="cell-main">${c.name}</span><span class="muted"> · ${c.country} · ${c.ccy}</span></button>`).join("");
    openModal("Change customer", `
      <div class="modal-sub">Re-attribute this credit if the suggested customer looks wrong. Your choice is logged and trains the identification model.</div>
      <div class="picker-list">${opts}</div>`);
    document.querySelectorAll(".picker-item").forEach((b) => {
      b.onclick = () => {
        r.customer = { name: b.dataset.name, id: b.dataset.cid, confidence: 1.0, how: "manually set by analyst" };
        closeModal(); renderCockpit(r); toast(`Customer set to ${b.dataset.name}`);
      };
    });
  }

  // Preview the journal entry this application would post (PRD §12 conventions)
  function simulateEntry(r) {
    const g = r.gap, cust = r.customer ? r.customer.name : "Unidentified";
    const wht = Math.abs(g.wht || 0), bc = Math.abs(g.bankCharge || 0), disc = Math.abs(g.discount || 0);
    const arCredit = r.amount + wht + bc + disc;
    const lines = [["Bank", r.amount, 0]];
    if (wht) lines.push(["WHT receivable (asset)", wht, 0]);
    if (bc) lines.push(["Bank charges (expense)", bc, 0]);
    if (disc) lines.push(["Cash discount allowed", disc, 0]);
    lines.push([`AR — ${cust}`, 0, arCredit]);
    const body = lines.map((l) => `<tr><td class="cell-main">${l[0]}</td><td class="num">${l[1] ? fmt(l[1], r.ccy) : ""}</td><td class="num">${l[2] ? fmt(l[2], r.ccy) : ""}</td></tr>`).join("");
    const totD = lines.reduce((s, l) => s + l[1], 0), totC = lines.reduce((s, l) => s + l[2], 0);
    openModal("Simulated accounting entry", `
      <div class="modal-sub">Preview of the journal entry this application would post to the ERP. Nothing posts until you Apply &amp; post (under maker-checker).</div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>
        <tbody>${body}<tr class="modal-total"><td>Total</td><td class="num">${fmt(totD, r.ccy)}</td><td class="num">${fmt(totC, r.ccy)}</td></tr></tbody>
      </table></div>
      ${g.unexplained ? `<div class="gap-note" style="padding:12px 0 0">Note: ${fmt(g.unexplained, r.ccy)} is unexplained / partial — that balance stays open on the invoice.</div>` : ""}`);
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
      `<button class="btn btn--primary">Run aging escalation</button>`);

    const rows = list.slice().sort((a, b) => b.ageDays - a.ageDays).map((u) => `
      <tr>
        <td class="muted" style="white-space:nowrap">${u.date}</td>
        <td><div class="cell-main">${u.desc}</div><div class="cell-sub">${u.customer} · ${u.id}</div></td>
        <td class="num strong">${fmt(u.amount, ccy)}</td>
        <td>${pill(u.ageDays + "d", u.tone)}</td>
        <td>${pill(u.reason, u.tone)}</td>
        <td class="t-right">
          <button class="btn btn--ghost btn--sm" onclick="location.hash='#/workspace'">Apply</button>
          <button class="btn btn--ghost btn--sm">Refund</button>
        </td>
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
          <div class="card__body card__body--flush"><div class="table-wrap table-scroll"><table class="tbl">
            <thead><tr><th>Value date</th><th>Description</th><th class="num">Amount</th><th>Age</th><th>Reason / exception type</th><th class="t-right">Action</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div></div>
        </div>
      </div>`;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  DEDUCTIONS / CLAIMS
  // ════════════════════════════════════════════════════════════════════════
  function viewDeductions() {
    const total = D.deductions.reduce((s, d) => s + d.amount, 0);
    setTopbar("Deductions / claims", "Coded short-payments carried into the claims workflow",
      `<span class="topbar__chip"><span>Open value</span> ${fmt(total)}</span>`,
      `<button class="btn btn--primary">+ New deduction</button>`);

    const rows = D.deductions.map((d) => `
      <tr>
        <td class="cell-main">${d.id}</td>
        <td>${d.invoice}</td>
        <td>${d.customer}</td>
        <td class="num strong">${fmt(d.amount)}</td>
        <td>${d.reason} <span class="tag">${d.code}</span></td>
        <td>${pill(d.status, d.tone)}</td>
        <td class="muted">${d.owner}</td>
        <td class="t-right"><button class="btn btn--ghost btn--sm">Work claim</button></td>
      </tr>`).join("");

    content.innerHTML = `
      <div class="section" ${dc("dd.table", "Deductions · Claims table")}>
        <div class="card">
          <div class="card__head"><div class="card__title">Open deductions &amp; claims</div></div>
          <div class="card__body card__body--flush"><div class="table-wrap"><table class="tbl">
            <thead><tr><th>ID</th><th>Invoice</th><th>Customer</th><th class="num">Amount</th><th>Reason</th><th>Status</th><th>Owner</th><th class="t-right">Action</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div></div>
        </div>
      </div>`;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CUSTOMERS 360
  // ════════════════════════════════════════════════════════════════════════
  let activeCustomerId = D.customers[0].id;
  function viewCustomers() {
    const c = D.customers.find((x) => x.id === activeCustomerId) || D.customers[0];
    setTopbar("Customers 360", "Aliases, learned fingerprints, open AR — the evidence behind identification");

    const list = D.customers.map((x) => `
      <div class="cmt-card" data-cid="${x.id}" style="${x.id === c.id ? "border-color:var(--border-primary-default);background:var(--surface-primary-subtle)" : ""}">
        <div class="cell-main">${x.name}</div>
        <div class="cell-sub">${x.country} · ${x.ccy} · ${x.terms}</div>
        <div class="cmt-card__foot"><span>Open AR ${fmt(x.openAr, x.ccy)}</span></div>
      </div>`).join("");

    const aliases = c.aliases.length ? c.aliases.map((a) => `
      <tr><td class="cell-main">${a.name}</td><td>${a.acct}</td><td>${pill(a.rel, "info")}</td></tr>`).join("")
      : `<tr><td colspan="3" class="muted">No aliases mapped.</td></tr>`;

    const fps = c.fingerprints.length ? c.fingerprints.map((f) => `
      <tr><td><code>${f.pattern}</code></td>
        <td style="width:160px"><div class="progress"><i style="width:${f.weight * 100}%"></i></div></td>
        <td class="num">${f.weight.toFixed(2)}</td><td class="muted">${f.lastSeen}</td></tr>`).join("")
      : `<tr><td colspan="4" class="muted">No learned fingerprints yet.</td></tr>`;

    const invs = c.invoices.map((i) => `<tr><td class="cell-main">${i.inv}</td><td class="muted">${i.due}</td><td class="num strong">${fmt(i.open, c.ccy)}</td></tr>`).join("");

    content.innerHTML = `
      <div class="split">
        <div>
          <div class="card" style="margin-bottom:var(--scale-300)" ${dc("cust.header", "Customer 360 · Header & metrics")}>
            <div class="card__body">
              <div class="section__head"><div class="section__title" style="font-size:20px">${c.name}</div>${pill(c.country, "neutral")}</div>
              <div class="kpis" style="grid-template-columns:repeat(3,1fr);margin-top:var(--scale-200)">
                <div class="kpi kpi--info"><div class="kpi__label">Open AR</div><div class="kpi__value" style="font-size:22px">${fmt(c.openAr, c.ccy)}</div></div>
                <div class="kpi kpi--warn"><div class="kpi__label">Unapplied</div><div class="kpi__value" style="font-size:22px">${fmt(c.unapplied, c.ccy)}</div></div>
                <div class="kpi kpi--good"><div class="kpi__label">ID rate</div><div class="kpi__value" style="font-size:22px">${Math.round(c.idRate * 100)}%</div></div>
              </div>
            </div>
          </div>

          <div class="card" style="margin-bottom:var(--scale-300)" ${dc("cust.aliases", "Customer 360 · Payer aliases")}>
            <div class="card__head"><div class="card__title">Payer aliases &amp; relationships</div></div>
            <div class="card__body card__body--flush"><div class="table-wrap"><table class="tbl">
              <thead><tr><th>Payer name / account</th><th>Bank a/c</th><th>Relationship</th></tr></thead>
              <tbody>${aliases}</tbody></table></div></div>
          </div>

          <div class="card" style="margin-bottom:var(--scale-300)" ${dc("cust.fingerprints", "Customer 360 · Learned fingerprints")}>
            <div class="card__head"><div class="card__title">Learned narration fingerprints</div></div>
            <div class="card__body card__body--flush"><div class="table-wrap"><table class="tbl">
              <thead><tr><th>Pattern</th><th>Weight</th><th class="num">Score</th><th>Last seen</th></tr></thead>
              <tbody>${fps}</tbody></table></div></div>
          </div>

          <div class="card" ${dc("cust.invoices", "Customer 360 · Open invoices")}>
            <div class="card__head"><div class="card__title">Open invoices</div></div>
            <div class="card__body card__body--flush"><div class="table-wrap"><table class="tbl">
              <thead><tr><th>Invoice</th><th>Due</th><th class="num">Open amount</th></tr></thead>
              <tbody>${invs}</tbody></table></div></div>
          </div>
        </div>

        <div class="card aside-card" ${dc("cust.list", "Customer 360 · Customer picker")}>
          <div class="card__head"><div class="card__title">Customers</div></div>
          <div class="card__body"><div class="detail-list" id="cust-list">${list}</div></div>
        </div>
      </div>`;

    content.querySelectorAll("#cust-list .cmt-card").forEach((el) => {
      el.onclick = () => { activeCustomerId = el.dataset.cid; viewCustomers(); window.COMMENTS && COMMENTS.refresh(); };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  REPORTS
  // ════════════════════════════════════════════════════════════════════════
  function viewReports() {
    setTopbar("Reports", "Success metrics — design against these and sell with them",
      `<span class="topbar__chip"><span>Period</span> Month to date</span>`,
      `<button class="btn btn--ghost">Export CSV</button>`);

    const cards = D.reports.map((m) => `
      <div class="metric-row">
        <div><div class="cell-main">${m.metric}</div><div class="cell-sub">${m.note}</div></div>
        <div class="m-val">${m.value}</div>
      </div>`).join("");

    content.innerHTML = `
      <div class="grid" style="grid-template-columns:1fr 1fr;align-items:start">
        <div class="card" ${dc("rep.metrics", "Reports · Success metrics")}>
          <div class="card__head"><div class="card__title">Success metrics</div></div>
          <div class="card__body">${cards}</div>
        </div>
        <div class="card" ${dc("rep.trend", "Reports · Auto-apply trend")}>
          <div class="card__head"><div class="card__title">Auto-apply trend (6 weeks)</div></div>
          <div class="card__body">
            <div class="barchart">
              ${[64, 68, 70, 73, 76, 78].map((v, i) => `<div class="barcol"><div class="barpair"><div class="bar bar--applied" style="height:${v}%" title="${v}%"></div></div><div class="barlabel">W${i + 1}</div></div>`).join("")}
            </div>
            <p class="muted" style="margin-top:12px">Headline efficiency number — share of cash applied with no human touch. Trending up as the model learns each analyst confirmation.</p>
          </div>
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
          <label><input type="radio" name="feed" value="Manual upload"> Manual upload by user</label>
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
