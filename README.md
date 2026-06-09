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
3. `vercel.json` points the static output at the `app/` folder (so `prd/` and
   `Designs/` are not published), and the `api/` folder deploys as a serverless
   function at `/api/comments`.
4. Add the `GITHUB_TOKEN` env var for the comment feature — see
   *Review / comment workflow → One-time setup* below.

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

## Review / comment workflow (temporary, GitHub-backed)

Comments are saved **straight to `app/comments.json` in this repo** by a Vercel
serverless function (`api/comments.js`) using the GitHub API. No "enable", no
"export" — the reviewer just clicks and types, and Claude reads the file from
git. The whole feature is isolated and easy to remove later (see *Removing it*).

```
Reviewer clicks "Comment" → clicks anywhere on screen → types
        │
        ▼
   POST /api/comments  (Vercel function)
        │  commits to
        ▼
   app/comments.json in GitHub  ←─ Claude reads via `git pull`, resolves by committing
        │  GET /api/comments
        ▼
   live app renders the pin (and any resolution)
```

### One-time setup (required for saving to work)

The function needs a GitHub token with write access to this repo:

1. GitHub → **Settings → Developer settings → Fine-grained tokens → Generate**.
   - Repository access: **Only select repositories → `cashapplication-grab`**.
   - Permissions: **Repository → Contents → Read and write**.
2. Vercel → your project → **Settings → Environment Variables**, add:
   - `GITHUB_TOKEN` = the token (all environments).
   - *(optional)* `COMMENTS_WRITE_KEY` = any string; if set, the app must send it
     (anti-abuse for the public URL — see note below).
3. Redeploy. Test by visiting `https://<your-site>/api/comments` — it should
   return `[]` (or the current comments), not an error.

Defaults baked into `api/comments.js` (override via env if needed):
`GITHUB_REPO=shubhamshrivastava2105/cashapplication-grab`,
`GITHUB_BRANCH=main`, `COMMENTS_PATH=app/comments.json`.

### For the SME (reviewer)

1. Open the deployed app. Bottom-right: a **Comment** button.
2. Click it, then **click anywhere on the screen** where the feedback applies.
3. Type your name (saved locally) + comment → **Comment**. It saves to GitHub
   automatically; an 🟠 orange pin appears at that spot.
4. Click any pin to read/resolve it. The **count button** opens the full list.
   Resolved comments show a 🟢 green ✓ pin.

### For Claude (acting on comments)

- `git pull`, then read `app/comments.json`. Each item carries `route`,
  `anchor`, `anchorLabel`, `xPct/yPct` (where on screen), `author`, `text`,
  `status`.
- Action each **open** comment in the code.
- **Auto-resolve on action:** when the change is made, set that comment to
  `status: "resolved"` with `resolvedAt`, `resolvedBy: "Claude"`, and a short
  `resolutionNote`, then commit + push. The live app reflects it on next load
  (GET reads from GitHub).
- Comments with **no action taken stay `open`**.

### Comment record shape (`comments.json`)

```json
{
  "id": "c_ab12cd34",
  "route": "#/workspace",
  "anchor": "ws.allocation",
  "anchorLabel": "Workspace · Open invoices & proposed allocation",
  "xPct": 64.2,
  "yPct": 38.1,
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

### Notes

- **Public repo / public endpoint.** Comment text lands in public git history,
  and `/api/comments` is open by default. For an internal review that's usually
  fine; to lock writes, set `COMMENTS_WRITE_KEY` (and tell me — I'll have the app
  send it). To keep comments private, make the repo private in GitHub settings.
- **Local preview** (`python3 -m http.server` from `app/`) has no function, so
  saving won't work offline; it falls back to reading the static `comments.json`
  for display. Use `vercel dev` with `GITHUB_TOKEN` set to test saving locally.

## Removing the review layer before launch

Delete:
- `api/comments.js`
- `app/assets/js/comments.js`
- `app/comments.json`
- `<script src="assets/js/comments.js">` and `<div id="review-layer">` in `app/index.html`
- the `REVIEW / COMMENT LAYER` block at the bottom of `app/assets/css/app.css`

The app keeps working — `app.js` only calls `COMMENTS.*` behind
`if (window.COMMENTS)` guards.
