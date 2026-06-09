# Neoflo · B2B Cash Application — Interactive Prototype

A static, no-build prototype of the Neoflo B2B Cash Application product, built
from the PRD (`prd/`) and the Figma design system (`Designs/`). Plain
HTML/CSS/JS — nothing to compile, ready for Vercel static hosting.

It also ships a **temporary review/comment layer** so a subject-matter expert
(SME) can pin comments to any section. Claude reads those comments, fixes
things, and marks them resolved.

## Run locally

No build step. Either open `app/index.html` directly, or (recommended, so
`comments.json` loads) serve the folder:

```bash
cd app
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to Vercel

1. Push this repo to git.
2. Import it in Vercel as a project. Framework preset: **Other** (no build).
3. `vercel.json` already points the static output at the `app/` folder, so the
   `prd/` and `Designs/` source folders are not published.

## Screens (interactive prototype)

| Route | Screen | PRD ref |
|---|---|---|
| `#/dashboard`  | KPIs, pipeline, applied-vs-unapplied, exceptions, work queue | §14.2, Fig 9 |
| `#/workspace`  | Analyst cockpit — credit · allocation · gap & actions + queue | §14.3, Fig 10 |
| `#/unapplied`  | On-account / unapplied cash ledger with aging | §10.5, §5.D |
| `#/deductions` | Deductions & claims workflow | §5.C, §10.4 |
| `#/customers`  | Customer 360 — aliases, fingerprints, open AR | §6, §8 |
| `#/reports`    | Success metrics | §19 |

Sample data is illustrative only (`app/assets/js/data.js`).

---

## Review / comment workflow (temporary)

The whole feature is isolated and easy to remove later (see *Removing it*).

### For the SME (reviewer)

1. Open the app. Bottom-centre is a **Review** bar.
2. Enter your name in **All comments → name field** (saved to your browser).
3. Click **Enable comments**. A 💬 pin appears on every commentable section.
4. Click a pin → write a comment → **Add comment**. Comments save to your
   browser instantly. Pins are colour-coded:
   - 🟠 orange = has open comments
   - 🟢 green  = all comments on that section resolved
5. When done, click **Export** (or **Export comments.json** in the drawer).
   This downloads `comments.json`.
6. Replace `app/comments.json` with the downloaded file and **commit/push it**
   (or just send the file). That is the hand-off to Claude.

### For Claude (acting on comments)

- Read `app/comments.json`. Each item: `sectionId`, `sectionLabel`, `author`,
  `text`, `status`.
- Action each **open** comment in the code.
- When an action is taken, flip that comment to **resolved** in
  `app/comments.json` and fill in `resolvedAt`, `resolvedBy: "Claude"`, and a
  short `resolutionNote`. This is the "auto-resolve when action is taken".
- Comments where **no action is taken stay `open`** (e.g. add a note asking for
  clarification, but leave `status: "open"`).
- Commit. When the SME pulls and reopens the app, resolutions show with a green
  ✓ and the merge rule keeps them resolved.

### Comment record shape (`comments.json`)

```json
{
  "id": "c_ab12cd34",
  "sectionId": "ws.allocation",
  "sectionLabel": "Workspace · Open invoices & proposed allocation",
  "author": "Sundip",
  "text": "Allocation rule should default to remittance, then FIFO.",
  "status": "open",
  "createdAt": "2026-06-09T08:40:00.000Z",
  "updatedAt": "2026-06-09T08:40:00.000Z",
  "resolvedAt": null,
  "resolvedBy": null,
  "resolutionNote": null
}
```

Merge rule on load: file + browser are merged by `id`; the entry with the later
`updatedAt` wins (resolved beats open on a tie). So Claude's committed
resolutions override the SME's older local copy.

### Why a committed file (not GitHub Issues)

It keeps the site pure-static (no API token, no serverless function), works on
Vercel and offline, and gives Claude the comments in one readable file in the
repo. If you later want issues, each `open` comment maps 1:1 to an issue.

## Removing the review layer before launch

Delete:
- `app/assets/js/comments.js`
- `app/comments.json`
- `<script src="assets/js/comments.js">` and `<div id="review-layer">` in `app/index.html`
- the `REVIEW / COMMENT LAYER` block at the bottom of `app/assets/css/app.css`

The app keeps working — `app.js` only calls `COMMENTS.*` behind
`if (window.COMMENTS)` guards.
