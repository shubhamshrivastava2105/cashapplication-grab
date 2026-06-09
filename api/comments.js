/* ============================================================================
   Vercel Serverless Function — GitHub-backed comment store
   ----------------------------------------------------------------------------
   Persists review comments to comments.json inside the GitHub repo via the
   GitHub Contents API, so the frontend can save comments with no manual export
   and Claude can read/resolve them straight from git.

   Routes (single endpoint /api/comments):
     GET                       → returns the full comments array (live from GitHub)
     POST   {route,anchor,...} → appends a new comment, returns the full array
     PATCH  {id, action}       → action: "resolve" | "reopen" ; returns the array
     DELETE {id}               → removes a comment, returns the array

   Required env (set in Vercel → Project → Settings → Environment Variables):
     GITHUB_TOKEN   fine-grained PAT with "Contents: Read and write" on the repo
   Optional env (sensible defaults shown):
     GITHUB_REPO    "shubhamshrivastava2105/cashapplication-grab"
     GITHUB_BRANCH  "main"
     COMMENTS_PATH  "app/comments.json"
     COMMENTS_WRITE_KEY  if set, write requests must send header x-write-key with
                         the same value (lightweight anti-abuse for a public URL)
   ========================================================================== */

const REPO = process.env.GITHUB_REPO || "shubhamshrivastava2105/cashapplication-grab";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const PATH = process.env.COMMENTS_PATH || "app/comments.json";
// Primary name is GITHUB_TOKEN; fall back to alternative names that may already
// be configured on the deployment (e.g. githubtokengrab).
const TOKEN = process.env.GITHUB_TOKEN || process.env.githubtokengrab || process.env.GH_TOKEN;
const WRITE_KEY = process.env.COMMENTS_WRITE_KEY || "";

const GH = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(PATH).replace(/%2F/g, "/")}`;
const ghHeaders = () => ({
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "neoflo-cashapp-comments",
  "X-GitHub-Api-Version": "2022-11-28",
});

const uid = () => "c_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const nowIso = () => new Date().toISOString();
const b64encode = (s) => Buffer.from(s, "utf8").toString("base64");
const b64decode = (s) => Buffer.from(s, "base64").toString("utf8");

async function readFile() {
  const res = await fetch(`${GH}?ref=${BRANCH}`, { headers: ghHeaders() });
  if (res.status === 404) return { arr: [], sha: null };
  if (!res.ok) throw new Error(`GitHub read ${res.status}: ${await res.text()}`);
  const json = await res.json();
  let arr = [];
  try { arr = JSON.parse(b64decode(json.content || "") || "[]"); } catch (_) { arr = []; }
  if (!Array.isArray(arr)) arr = [];
  return { arr, sha: json.sha };
}

async function writeFile(arr, sha, message) {
  const body = {
    message,
    content: b64encode(JSON.stringify(arr, null, 2) + "\n"),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await fetch(GH, { method: "PUT", headers: ghHeaders(), body: JSON.stringify(body) });
  return res;
}

// read → mutate → write, retrying on the 409 (stale sha) race
async function mutate(mutator, message) {
  let lastErr;
  for (let i = 0; i < 4; i++) {
    const { arr, sha } = await readFile();
    const next = mutator(arr);
    if (next === null) return arr; // mutator decided no-op
    const res = await writeFile(next, sha, message);
    if (res.ok) return next;
    if (res.status === 409 || res.status === 422) { lastErr = await res.text(); continue; } // race → retry
    throw new Error(`GitHub write ${res.status}: ${await res.text()}`);
  }
  throw new Error(`GitHub write failed after retries: ${lastErr || "conflict"}`);
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch (_) { return {}; }
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!TOKEN) {
    res.status(500).json({ error: "GITHUB_TOKEN env var is not set on the deployment." });
    return;
  }

  try {
    if (req.method === "GET") {
      const { arr } = await readFile();
      res.status(200).json(arr);
      return;
    }

    // write methods — optional shared-key guard
    if (WRITE_KEY && req.headers["x-write-key"] !== WRITE_KEY) {
      res.status(401).json({ error: "Invalid write key." });
      return;
    }

    if (req.method === "POST") {
      const b = readBody(req);
      const text = (b.text || "").toString().trim().slice(0, 4000);
      if (!text) { res.status(400).json({ error: "text is required" }); return; }
      const comment = {
        id: uid(),
        route: (b.route || "").toString().slice(0, 120),
        anchor: (b.anchor || "screen").toString().slice(0, 120),
        anchorLabel: (b.anchorLabel || "").toString().slice(0, 200),
        xPct: Number(b.xPct) || 0,
        yPct: Number(b.yPct) || 0,
        author: (b.author || "SME").toString().slice(0, 80),
        text,
        status: "open",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        resolvedAt: null,
        resolvedBy: null,
        resolutionNote: null,
      };
      const next = await mutate((arr) => [...arr, comment], `chore(comments): add comment on ${comment.route || "screen"}`);
      res.status(200).json(next);
      return;
    }

    if (req.method === "PATCH") {
      const b = readBody(req);
      if (!b.id) { res.status(400).json({ error: "id is required" }); return; }
      const next = await mutate((arr) => {
        const c = arr.find((x) => x.id === b.id);
        if (!c) return null;
        if (b.action === "resolve") {
          c.status = "resolved"; c.resolvedAt = nowIso(); c.updatedAt = nowIso();
          c.resolvedBy = (b.resolvedBy || c.author || "reviewer").toString().slice(0, 80);
          c.resolutionNote = b.resolutionNote ? b.resolutionNote.toString().slice(0, 2000) : "Resolved in review";
        } else if (b.action === "reopen") {
          c.status = "open"; c.resolvedAt = null; c.resolvedBy = null; c.resolutionNote = null; c.updatedAt = nowIso();
        } else if (typeof b.text === "string") {
          c.text = b.text.slice(0, 4000); c.updatedAt = nowIso();
        }
        return arr;
      }, `chore(comments): ${b.action || "update"} ${b.id}`);
      res.status(200).json(next);
      return;
    }

    if (req.method === "DELETE") {
      const b = readBody(req);
      if (!b.id) { res.status(400).json({ error: "id is required" }); return; }
      const next = await mutate((arr) => arr.filter((x) => x.id !== b.id), `chore(comments): delete ${b.id}`);
      res.status(200).json(next);
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
};
