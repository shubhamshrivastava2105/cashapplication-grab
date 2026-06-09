/* ============================================================================
   Sample data for the Neoflo B2B Cash Application prototype.
   Illustrative figures only — modelled on the PRD (Grab / SEA context, SGD).
   ========================================================================== */
window.DATA = (function () {
  const fmt = (n, ccy = "SGD") =>
    ccy + " " + n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Dashboard ──────────────────────────────────────────────────────────
  const kpis = [
    { key: "autoApply",   label: "Auto-apply rate",   value: "78%",        tone: "good",    delta: "+6 pts WoW", deltaTone: "up" },
    { key: "idRate",      label: "Identification rate", value: "94%",       tone: "good",    delta: "+1 pt WoW",  deltaTone: "up" },
    { key: "unapplied",   label: "Unapplied cash",    value: "SGD 1.24M",  tone: "warn",    delta: "61 receipts",deltaTone: "" },
    { key: "exceptions",  label: "Open exceptions",   value: "61",         tone: "warn",    delta: "−8 vs yest.",deltaTone: "up" },
    { key: "wht",         label: "WHT receivable",    value: "SGD 312k",   tone: "info",    delta: "23 certs pending", deltaTone: "" },
    { key: "deductions",  label: "Deductions open",   value: "SGD 88k",    tone: "warn",    delta: "14 claims", deltaTone: "" },
  ];

  const dailyChart = [
    { day: "Mon", applied: 92, unapplied: 24 },
    { day: "Tue", applied: 88, unapplied: 26 },
    { day: "Wed", applied: 80, unapplied: 22 },
    { day: "Thu", applied: 76, unapplied: 19 },
    { day: "Fri", applied: 70, unapplied: 16 },
    { day: "Sat", applied: 58, unapplied: 12 },
  ];

  const exceptionsByType = [
    { label: "Unidentified",     value: 18 },
    { label: "Partial / short",  value: 15 },
    { label: "Deduction / claim",value: 12 },
    { label: "Overpayment",      value: 9 },
    { label: "WHT cert pending", value: 7 },
  ];

  // ── Receipts queue (drives the workspace) ───────────────────────────────
  const receipts = [
    {
      id: "FT77A21B", amount: 48250.00, ccy: "SGD", valueDate: "2026-05-03", bankRef: "FT77A21B",
      narration: "TT REF AX99 INV mix", bankAcct: "DBS …450",
      customer: { name: "Acme Retail Pte Ltd", id: "C-1042", confidence: 0.91, how: "remittance + alias (ID-1/ID-4)" },
      remittance: { listed: 5, parsed: 0.88 },
      state: "Matched", stateTone: "primary", ageHrs: 6, sla: "06:12:40", aiConf: 0.91,
      invoices: [
        { inv: "INV-4471", due: "2026-05-02", open: 12000.00, apply: 12000.00, sel: true },
        { inv: "INV-4480", due: "2026-05-04", open: 9500.00,  apply: 9500.00,  sel: true },
        { inv: "INV-4495", due: "2026-05-06", open: 18000.00, apply: 18000.00, sel: true },
        { inv: "INV-4502", due: "2026-05-08", open: 9200.00,  apply: 8750.00,  sel: true },
        { inv: "INV-4510", due: "2026-05-10", open: 6400.00,  apply: 0,        sel: false },
      ],
      gap: { wht: -450.00, discount: 0, bankCharge: 0, unexplained: 0,
             note: "INV-4502 short by 450.00 → gap classified: WHT 5% (cert pending)", allocRule: "Remittance" },
    },
    {
      id: "FT88C04Z", amount: 126400.00, ccy: "SGD", valueDate: "2026-05-03", bankRef: "FT88C04Z",
      narration: "INWARD TT /BNF GRAB /REF 99XQ", bankAcct: "DBS …450",
      customer: { name: "Lazada SG (treasury)", id: "C-1108", confidence: 0.62, how: "amount+timing fingerprint (ID-6) — confirm payer" },
      remittance: { listed: 0, parsed: 0 },
      state: "Identified", stateTone: "warn", ageHrs: 11, sla: "02:44:10", aiConf: 0.62,
      invoices: [
        { inv: "INV-4388", due: "2026-04-28", open: 40000.00, apply: 40000.00, sel: true },
        { inv: "INV-4401", due: "2026-04-30", open: 52000.00, apply: 52000.00, sel: true },
        { inv: "INV-4419", due: "2026-05-02", open: 31000.00, apply: 31000.00, sel: true },
        { inv: "INV-4444", due: "2026-05-05", open: 18500.00, apply: 0,        sel: false },
      ],
      gap: { wht: 0, discount: 0, bankCharge: 0, unexplained: 3400.00,
             note: "Subset-sum leaves 3,400.00 residual → park on-account or confirm extra invoice", allocRule: "Subset-sum" },
    },
    {
      id: "FT90D17K", amount: 9980.00, ccy: "SGD", valueDate: "2026-05-04", bankRef: "FT90D17K",
      narration: "CROSS-BORDER WIRE USD7500", bankAcct: "DBS …450",
      customer: { name: "Tokopedia Ads", id: "C-1190", confidence: 0.97, how: "in-narration invoice ref (ID-3)" },
      remittance: { listed: 1, parsed: 0.95 },
      state: "Matched", stateTone: "primary", ageHrs: 3, sla: "08:50:00", aiConf: 0.97,
      invoices: [
        { inv: "INV-4523", due: "2026-05-06", open: 10000.00, apply: 10000.00, sel: true },
      ],
      gap: { wht: 0, discount: 0, bankCharge: -20.00, unexplained: 0,
             note: "Short by 20.00 → bank charge in transit, within tolerance → auto-write-off", allocRule: "Exact" },
    },
    {
      id: "FT91E22M", amount: 5000.00, ccy: "SGD", valueDate: "2026-05-04", bankRef: "FT91E22M",
      narration: "GIRO PAYMENT — NO REF", bankAcct: "DBS …450",
      customer: null,
      remittance: { listed: 0, parsed: 0 },
      state: "Unidentified", stateTone: "error", ageHrs: 28, sla: "OVERDUE", aiConf: 0.0,
      invoices: [], gap: { wht: 0, discount: 0, bankCharge: 0, unexplained: 5000.00,
        note: "No customer resolved at any tier → suspense queue, suggest closest matches", allocRule: "—" },
    },
  ];

  // ── Unapplied / on-account ──────────────────────────────────────────────
  const unapplied = [
    { id: "UC-2201", customer: "Acme Retail Pte Ltd",     amount: 3450.00,  ageDays: 41, source: "FT55X10A", reason: "Residual after allocation", tone: "warn" },
    { id: "UC-2198", customer: "Lazada SG (treasury)",     amount: 3400.00,  ageDays: 2,  source: "FT88C04Z", reason: "Subset-sum residual",       tone: "neutral" },
    { id: "UC-2150", customer: "Sea Group Pte Ltd",        amount: 28000.00, ageDays: 63, source: "FT41J88P", reason: "Advance — no open invoice", tone: "error" },
    { id: "UC-2099", customer: "Shopee Pay",               amount: 12750.00, ageDays: 9,  source: "FT60K22Q", reason: "Overpayment residual",       tone: "neutral" },
    { id: "UC-2044", customer: "Bukalapak Enterprise",     amount: 6200.00,  ageDays: 27, source: "FT38L09R", reason: "Identified, no clean match", tone: "warn" },
  ];

  // ── Deductions / claims ─────────────────────────────────────────────────
  const deductions = [
    { id: "DD-771", invoice: "INV-4502", customer: "Acme Retail Pte Ltd", amount: 450.00,  reason: "Withholding tax", code: "WHT-5", status: "Cert pending", tone: "warn",  owner: "Tax desk" },
    { id: "DD-769", invoice: "INV-4310", customer: "Sea Group Pte Ltd",    amount: 1200.00, reason: "Shortage claim",  code: "SHRT",  status: "Open",         tone: "error", owner: "Claims — Priya" },
    { id: "DD-765", invoice: "INV-4288", customer: "Shopee Pay",           amount: 800.00,  reason: "Pricing dispute", code: "PRC",   status: "Disputed",     tone: "error", owner: "Claims — Wei" },
    { id: "DD-760", invoice: "INV-4255", customer: "Tokopedia Ads",        amount: 300.00,  reason: "Rebate taken",    code: "RBT",   status: "Approved",     tone: "success", owner: "Claims — Priya" },
    { id: "DD-754", invoice: "INV-4199", customer: "Bukalapak Enterprise", amount: 520.00,  reason: "Ineligible discount", code: "DISC", status: "Chasing",   tone: "warn",  owner: "AR — Sam" },
  ];

  // ── Customers (360) ─────────────────────────────────────────────────────
  const customers = [
    {
      id: "C-1042", name: "Acme Retail Pte Ltd", country: "Singapore", ccy: "SGD", terms: "Net 30",
      openAr: 55100.00, unapplied: 3450.00, idRate: 0.96,
      aliases: [
        { name: "Acme Holdings Treasury", acct: "OCBC …881", rel: "Parent / treasury" },
        { name: "ACME RETAIL TA SHOPSMART", acct: "DBS …210", rel: "Trading as" },
      ],
      fingerprints: [
        { pattern: "TT REF AX99*", weight: 0.88, lastSeen: "2026-05-03" },
        { pattern: "GIRO ACME*", weight: 0.71, lastSeen: "2026-04-19" },
      ],
      invoices: [
        { inv: "INV-4471", due: "2026-05-02", open: 12000.00 },
        { inv: "INV-4480", due: "2026-05-04", open: 9500.00 },
        { inv: "INV-4495", due: "2026-05-06", open: 18000.00 },
        { inv: "INV-4510", due: "2026-05-10", open: 6400.00 },
      ],
    },
    {
      id: "C-1108", name: "Lazada SG (treasury)", country: "Singapore", ccy: "SGD", terms: "Net 45",
      openAr: 141500.00, unapplied: 3400.00, idRate: 0.74,
      aliases: [{ name: "Lazada Group Treasury", acct: "Citi …334", rel: "Group treasury" }],
      fingerprints: [{ pattern: "INWARD TT /BNF GRAB /REF 99*", weight: 0.62, lastSeen: "2026-05-03" }],
      invoices: [
        { inv: "INV-4388", due: "2026-04-28", open: 40000.00 },
        { inv: "INV-4401", due: "2026-04-30", open: 52000.00 },
        { inv: "INV-4419", due: "2026-05-02", open: 31000.00 },
        { inv: "INV-4444", due: "2026-05-05", open: 18500.00 },
      ],
    },
    {
      id: "C-1190", name: "Tokopedia Ads", country: "Indonesia", ccy: "IDR", terms: "Net 30",
      openAr: 10000.00, unapplied: 0, idRate: 0.99,
      aliases: [], fingerprints: [{ pattern: "CROSS-BORDER WIRE*", weight: 0.95, lastSeen: "2026-05-04" }],
      invoices: [{ inv: "INV-4523", due: "2026-05-06", open: 10000.00 }],
    },
  ];

  // ── Reports / success metrics ───────────────────────────────────────────
  const reports = [
    { metric: "Auto-apply rate",      value: "78%",      note: "Share of cash applied with no human touch" },
    { metric: "Identification rate",  value: "94%",      note: "Share of credits attributed to a customer" },
    { metric: "Unapplied cash",       value: "SGD 1.24M",note: "Value held on-account / advance" },
    { metric: "Median time to apply", value: "4.2 hrs",  note: "Credit received → applied" },
    { metric: "Deduction resolution", value: "6.1 days", note: "Median cycle time of open claims" },
    { metric: "WHT recovered (MTD)",  value: "SGD 198k", note: "Cleared against certificates" },
    { metric: "Reversal / re-apply",  value: "1.3%",     note: "Proxy for mis-applications" },
  ];

  // ── Pipeline (reference strip on dashboard) ─────────────────────────────
  const pipeline = ["① Identify customer", "② Identify obligations", "③ Reconcile amount", "④ Apply & post", "⑤ Resolve residual"];

  return { fmt, kpis, dailyChart, exceptionsByType, receipts, unapplied, deductions, customers, reports, pipeline };
})();
