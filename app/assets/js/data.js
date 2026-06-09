/* ============================================================================
   Sample data for the Neoflo B2B Cash Application prototype.
   Illustrative figures only — modelled on the PRD (Grab / SEA context, SGD).
   ========================================================================== */
window.DATA = (function () {
  const fmt = (n, ccy = "SGD") =>
    ccy + " " + n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Org context: entities (currency derives from entity), banks, statement ─
  const entities = [
    { id: "grabads-sg", name: "Grab Ads SG",          country: "Singapore",   currency: "SGD" },
    { id: "gfb-my",     name: "GrabForBusiness MY",   country: "Malaysia",    currency: "MYR" },
    { id: "grabmart-id",name: "Grab Mart ID",         country: "Indonesia",   currency: "IDR" },
    { id: "grab-th",    name: "Grab Enterprise TH",   country: "Thailand",    currency: "THB" },
    { id: "grab-ph",    name: "Grab Ads PH",          country: "Philippines", currency: "PHP" },
  ];
  const banks = [
    { id: "dbs-sgd",  entity: "grabads-sg",  name: "DBS · …450 (SGD)" },
    { id: "ocbc-sgd", entity: "grabads-sg",  name: "OCBC · …881 (SGD)" },
    { id: "maybank",  entity: "gfb-my",      name: "Maybank · …207 (MYR)" },
    { id: "bca-idr",  entity: "grabmart-id", name: "BCA · …119 (IDR)" },
    { id: "scb-thb",  entity: "grab-th",     name: "SCB · …663 (THB)" },
    { id: "bdo-php",  entity: "grab-ph",     name: "BDO · …884 (PHP)" },
  ];
  const lastStatementDate = "03 May 2026";

  // ── Dashboard ──────────────────────────────────────────────────────────
  // Each KPI carries a consistent secondary line: a directional quarter-on-quarter
  // trend ({arrow} {value} QoQ over the last 3 months), green when the movement is
  // an improvement. Tiles with a `drill` key are clickable and open a line-by-line
  // breakdown; `info` powers the (i) tooltip.
  const kpis = [
    { key: "autoApply",  label: "Auto-apply rate",     value: "78%",       tone: "good", delta: "▲ 6 pts QoQ", deltaTone: "up",
      info: "Share of cash applied with no human touch this quarter — the headline efficiency metric." },
    { key: "idRate",     label: "Identification rate", value: "94%",       tone: "good", delta: "▲ 3 pts QoQ", deltaTone: "up",
      info: "Share of incoming credits attributed to a customer. The floor metric — identity is the minimum viable outcome." },
    { key: "unapplied",  label: "Unapplied cash",      value: "SGD 1.24M", tone: "warn", delta: "▼ 4% QoQ",   deltaTone: "up", drill: "unapplied",
      info: "On-account / advance cash that is identified but not yet matched to invoices. Click for the line-by-line breakdown." },
    { key: "exceptions", label: "Open exceptions",     value: "250",       tone: "warn", delta: "▼ 12 QoQ",   deltaTone: "up", drill: "exceptions",
      info: "Credits needing analyst attention, grouped by exception type. Click for the breakdown." },
  ];

  // Line-by-line drill-downs behind clickable KPI tiles
  const breakdowns = {
    unapplied: {
      title: "Unapplied cash — line by line", total: "SGD 1.24M",
      columns: ["Bank account", "Value date", "Description", "Amount"], money: 3,
      rows: [
        ["DBS · …450",  "2026-05-02", "GIRO inflow — unidentified payer",        312000],
        ["DBS · …450",  "2026-05-03", "TT residual after allocation — Lazada SG", 188500],
        ["OCBC · …881", "2026-05-03", "Overpayment residual — Shopee Pay",        156000],
        ["DBS · …450",  "2026-04-28", "Advance — Sea Group (no open invoice)",    268000],
        ["DBS · …450",  "2026-05-01", "Subset-sum residual — Tokopedia Ads",      121500],
        ["OCBC · …881", "2026-04-19", "On-account — Sinar Jaya Retail",            94000],
        ["DBS · …450",  "2026-05-04", "Misdirected credit pending return",        100000],
      ],
    },
    exceptions: {
      title: "Open exceptions — by type", total: "250 exceptions",
      columns: ["Exception type", "Count"], money: -1,
      rows: [
        ["Unidentified customer", 74],
        ["Partial / short & deductions", 96],
        ["Overpayment", 45],
        ["WHT certificate pending", 35],
      ],
    },
  };

  const dailyChart = [
    { day: "Mon", applied: 92, unapplied: 24 },
    { day: "Tue", applied: 88, unapplied: 26 },
    { day: "Wed", applied: 80, unapplied: 22 },
    { day: "Thu", applied: 76, unapplied: 19 },
    { day: "Fri", applied: 70, unapplied: 16 },
    { day: "Sat", applied: 58, unapplied: 12 },
  ];

  const exceptionsByType = [
    { label: "Unidentified customer",        value: 74 },
    { label: "Partial / short & deductions", value: 96 },
    { label: "Overpayment",                  value: 45 },
    { label: "WHT certificate pending",      value: 35 },
  ];

  // Ageing of the SGD 1.24M unapplied cash (replaces the old daily bar chart)
  const ageingUnapplied = {
    title: "Unapplied cash ageing", total: "SGD 1.24M",
    buckets: [
      { label: "0–15 days",  amount: 512000 },
      { label: "15–30 days", amount: 326000 },
      { label: "1–3 months", amount: 248000 },
      { label: "3–6 months", amount: 102000 },
      { label: "6 months+",  amount: 52000  },
    ],
  };

  // ── Receipts queue (drives the workspace) ───────────────────────────────
  const receipts = [
    {
      id: "FT77A21B", amount: 48250.00, ccy: "SGD", valueDate: "2026-05-03", bankRef: "FT77A21B",
      narration: "MEPS IBG TT / SINARJAYA RETAIL / INV AX99 BATCH", bankAcct: "DBS …450",
      customer: { name: "Sinar Jaya Retail Pte Ltd", id: "C-1042", confidence: 0.91, how: "remittance + alias (ID-1/ID-4)" },
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
      narration: "INWARD TT / ORD: LAZADA SG TREASURY / BNF: GRAB ADS / REF 99XQ", bankAcct: "DBS …450",
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
      narration: "INWARD TT FCY / USD 7,500.00 @ 1.331 / CHARGES OUR", bankAcct: "DBS …450",
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
      narration: "FAST GIRO COLLECTION / BULK / NO REMITTANCE REF", bankAcct: "DBS …450",
      customer: null,
      remittance: { listed: 0, parsed: 0 },
      state: "Unidentified", stateTone: "error", ageHrs: 28, sla: "OVERDUE", aiConf: 0.0,
      invoices: [], gap: { wht: 0, discount: 0, bankCharge: 0, unexplained: 5000.00,
        note: "No customer resolved at any tier → suspense queue, suggest closest matches", allocRule: "—" },
    },
  ];

  // ── Unapplied / on-account (full work list) ─────────────────────────────
  const unapplied = [
    { id: "UC-2201", customer: "Sinar Jaya Retail Pte Ltd", amount: 3450.00,  ageDays: 41, source: "FT55X10A", reason: "Residual after allocation",  tone: "warn" },
    { id: "UC-2198", customer: "Lazada SG (treasury)",      amount: 3400.00,  ageDays: 2,  source: "FT88C04Z", reason: "Subset-sum residual",        tone: "neutral" },
    { id: "UC-2150", customer: "Sea Group Pte Ltd",         amount: 28000.00, ageDays: 63, source: "FT41J88P", reason: "Advance — no open invoice",   tone: "error" },
    { id: "UC-2099", customer: "Shopee Pay",                amount: 12750.00, ageDays: 9,  source: "FT60K22Q", reason: "Overpayment residual",        tone: "neutral" },
    { id: "UC-2044", customer: "Bukalapak Enterprise",      amount: 6200.00,  ageDays: 27, source: "FT38L09R", reason: "Identified, no clean match",  tone: "warn" },
    { id: "UC-2031", customer: "Tokopedia Ads",             amount: 9100.00,  ageDays: 5,  source: "FT62M11S", reason: "Remittance awaited",         tone: "neutral" },
    { id: "UC-2018", customer: "Grab Mart ID",              amount: 41200.00, ageDays: 78, source: "FT29N04T", reason: "Advance — no open invoice",   tone: "error" },
    { id: "UC-2007", customer: "Central Group TH",          amount: 18650.00, ageDays: 33, source: "FT70P22U", reason: "Identified, no clean match",  tone: "warn" },
    { id: "UC-1994", customer: "Maju Jaya Sdn Bhd",         amount: 5400.00,  ageDays: 12, source: "FT55Q08V", reason: "Overpayment residual",        tone: "neutral" },
    { id: "UC-1981", customer: "FairPrice Group",           amount: 22300.00, ageDays: 51, source: "FT41R77W", reason: "Residual after allocation",  tone: "error" },
    { id: "UC-1975", customer: "PTT Retail",                amount: 7850.00,  ageDays: 4,  source: "FT63S09X", reason: "Subset-sum residual",        tone: "neutral" },
    { id: "UC-1968", customer: "VNG Corporation",           amount: 14900.00, ageDays: 22, source: "FT38T44Y", reason: "Identified, no clean match",  tone: "warn" },
    { id: "UC-1950", customer: "Sinar Jaya Retail Pte Ltd", amount: 3100.00,  ageDays: 88, source: "FT22U10Z", reason: "Misdirected — pending return", tone: "error" },
  ];

  // ── Deductions / claims ─────────────────────────────────────────────────
  const deductions = [
    { id: "DD-771", invoice: "INV-4502", customer: "Sinar Jaya Retail Pte Ltd", amount: 450.00,  reason: "Withholding tax", code: "WHT-5", status: "Cert pending", tone: "warn",  owner: "Tax desk" },
    { id: "DD-769", invoice: "INV-4310", customer: "Sea Group Pte Ltd",    amount: 1200.00, reason: "Shortage claim",  code: "SHRT",  status: "Open",         tone: "error", owner: "Claims — Priya" },
    { id: "DD-765", invoice: "INV-4288", customer: "Shopee Pay",           amount: 800.00,  reason: "Pricing dispute", code: "PRC",   status: "Disputed",     tone: "error", owner: "Claims — Wei" },
    { id: "DD-760", invoice: "INV-4255", customer: "Tokopedia Ads",        amount: 300.00,  reason: "Rebate taken",    code: "RBT",   status: "Approved",     tone: "success", owner: "Claims — Priya" },
    { id: "DD-754", invoice: "INV-4199", customer: "Bukalapak Enterprise", amount: 520.00,  reason: "Ineligible discount", code: "DISC", status: "Chasing",   tone: "warn",  owner: "AR — Sam" },
  ];

  // ── Customers (360) ─────────────────────────────────────────────────────
  const customers = [
    {
      id: "C-1042", name: "Sinar Jaya Retail Pte Ltd", country: "Singapore", ccy: "SGD", terms: "Net 30",
      openAr: 55100.00, unapplied: 3450.00, idRate: 0.96,
      aliases: [
        { name: "Sinar Jaya Holdings Treasury", acct: "OCBC …881", rel: "Parent / treasury" },
        { name: "SINAR JAYA TA FRESHMART", acct: "DBS …210", rel: "Trading as" },
      ],
      fingerprints: [
        { pattern: "TT REF AX99*", weight: 0.88, lastSeen: "2026-05-03" },
        { pattern: "GIRO SINARJAYA*", weight: 0.71, lastSeen: "2026-04-19" },
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

  return { fmt, entities, banks, lastStatementDate, kpis, breakdowns, ageingUnapplied, dailyChart, exceptionsByType, receipts, unapplied, deductions, customers, reports, pipeline };
})();
