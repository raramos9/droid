# Droid — Project State

Last updated: 2026-03-13

---

## Overview

Droid is an autonomous AI code maintainer. When connected to a GitHub repository via webhook, it responds to pushes, issues, pull requests, and `@droid` mentions by spinning up an isolated agent that reads the codebase, reasons about the event, and takes action (filing issues, posting comments, drafting PRs). Actions that write to GitHub require human approval before they execute.

The system is split into two packages:

| Package | Runtime | Purpose |
|---------|---------|---------|
| `droid` | Cloudflare Workers | Agent runtime — receives webhooks, runs Claude, saves state |
| `droid-web` | Next.js 16 / Vercel | Dashboard — enroll repos, monitor runs, approve/reject gated actions |

---

## Monorepo Layout

```
droid/
  droid/                  Cloudflare Workers package
    src/
      index.ts            Main fetch handler
      harness/index.ts    Sandbox orchestrator
      agent/
        index.ts          Agent loop (runAgent)
        tools/index.ts    All 13 tool definitions
        prompt.ts         SYSTEM_PROMPT + buildGoalMessage
        checkpoint.ts     Supabase read/write for run state
      triggers/
        github.ts         Webhook payload → Goal
      lib/
        cloneRepo.ts      Git clone into sandbox
        verify.ts         HMAC signature verification
      types/
        agent.ts          Goal, AgentRun, ToolContext types
        env.ts            Env bindings type
    wrangler.toml
    .dev.vars             Local secrets (not committed)

  droid-web/              Next.js package
    app/
      globals.css         Ghost Terminal design system
      layout.tsx          Font setup, body scanline overlay
      page.tsx            Landing page (sign in)
      dashboard/
        page.tsx          Dashboard server page
        DashboardClient.tsx  Repo browser (client)
        [owner]/[repo]/
          page.tsx        Repo detail — list of runs per issue
          issues/[number]/
            page.tsx      Issue detail — run state + activity
    components/
      ActivityLog.tsx     Renders agent text messages
      PendingActionPanel.tsx  Approve/Reject gated actions
      RunStatusBadge.tsx  Status dot + label
      EnrollModal.tsx     Search + enroll repos
    lib/
      types.ts            TypeScript interfaces
      supabase.ts         Server-only Supabase client
      queries.ts          getEnrolledRepos, getRunsForRepo, getRunForIssue, getPendingActions
    app/api/
      enroll/route.ts     POST — create GitHub webhook + insert enrolled_repo
      resume/route.ts     POST — proxy to droid worker /resume/:runId
      github/repos/route.ts  GET — search user repos via Octokit
      auth/[...nextauth]/route.ts  NextAuth handler
    auth.ts               NextAuth v5 config (GitHub provider)
    proxy.ts              Route protection for /dashboard/*
    jest.config.ts
    jest.setup.ts
    tsconfig.json
    next.config.ts

  .claude/
    CLAUDE.md             Project-level Claude instructions
    plans/                Implementation plan files
    docs/                 This file
    rules/                Coding style, testing, git, security, etc.
```

---

## Droid Worker

### Endpoints

#### `POST /webhook`

Receives GitHub webhook events. Verifies HMAC-SHA256 signature against `WEBHOOK_SECRET`. Parses the payload, converts it to a `Goal` via `fromGithubWebhook`, then fires `runDroidAgent` in a `ctx.waitUntil` (non-blocking).

Supported events: `push`, `pull_request` (opened/reopened), `issues` (opened), `issue_comment` (created + body contains `@droid`).

Dev bypass: if `ENVIRONMENT=development` and header `x-dev-bypass: true` is set, signature check is skipped.

#### `POST /dispatch`

On-demand agent trigger from the dashboard. Requires `Authorization: Bearer <RESUME_API_KEY>`. Accepts `{ owner, repo, type, issueNumber?, prNumber? }`. Constructs a `Goal` and fires `runDroidAgent` in `ctx.waitUntil`.

#### `POST /resume/:runId`

Called by the dashboard after a user approves or rejects a gated action. Requires `Authorization: Bearer <RESUME_API_KEY>`.

Loads the paused checkpoint from Supabase, injects the tool result (or an interruption placeholder for any other unresolved tool_use in the same turn), then resumes `runDroidAgent` with the updated message history.

### Agent Harness (`harness/index.ts`)

`runDroidAgent(goal, env, resumeOpts?)`:
1. Creates a Cloudflare Sandbox (`droid-{owner}-{repo}-{timestamp}`)
2. Initializes Octokit with `GITHUB_TOKEN`
3. If resuming, loads the checkpoint and patches in the provided `initialMessages`
4. Clones the repo into `/workspace/repo/` inside the sandbox
5. Calls `runAgent(goal, ctx, { existingRun? })`
6. Destroys the sandbox in `finally`

### Agent Loop (`agent/index.ts`)

`runAgent(goal, ctx, opts?)`:
- Model: `claude-sonnet-4-6`, max tokens: 8192, max iterations: 10
- On first run, prepends `buildGoalMessage(goal)` as the initial user message
- Each iteration: calls `anthropic.messages.create`, appends assistant response, processes tool calls
- Stops when `stop_reason === "end_turn"` or `MAX_ITERATIONS` is reached
- On `GatedActionError`: saves checkpoint with `status: "paused"`, saves pending action to Supabase, returns immediately
- Saves checkpoint after every iteration (status: `running`)
- Sets final status to `completed` or `failed`, saves checkpoint

### Tools (`agent/tools/index.ts`)

13 tools across 5 categories:

**Filesystem** (sandbox-isolated):
- `readFile` — reads a file by absolute path
- `writeFile` — writes content to a file
- `listFiles` — `ls -la` on a directory
- `searchCode` — `grep -r` over `.ts` files

**Shell** (sandbox-isolated):
- `runCommand` — runs arbitrary shell commands; blocked: `curl wget nc netcat ssh scp rsync env printenv eval`

**GitHub Read** (Octokit):
- `getIssue` — fetch issue by number
- `listIssues` — list open issues
- `getPR` — fetch PR by number
- `getFileDiff` — compare two commits

**GitHub Write** (Octokit):
- `createIssue` — open a new issue
- `createComment` — post a comment on issue/PR
- `createPR` — open a pull request

**Gated** (require human approval — throw `GatedActionError`):
- `pushCode` — commit + push to remote
- `mergePR` — merge a pull request

Path sanitization: all file/dir paths are checked for `..` traversal and must match `[a-zA-Z0-9/_.-]+`.

### Triggers (`triggers/github.ts`)

Converts raw GitHub webhook payloads (validated with Zod) to typed `Goal` objects:

| Event | Action filter | Goal type |
|-------|--------------|-----------|
| `push` | any | `push` |
| `pull_request` | opened / reopened | `pull_request` |
| `issues` | opened | `issue_created` |
| `issue_comment` | created + body contains `@droid` | `issue_comment` |

### System Prompt

Droid's persona: autonomous AI maintainer. Key rules in prompt:
- Read files before judging
- Max 3 issues per scan
- No hardcoded secrets
- Branch names: lowercase kebab-case
- Sandbox paths always start with `/workspace/repo/`
- Stop when satisfied, don't over-explain
- Note: gated tools require approval (the prompt lists `createIssue`, `createComment`, `createPR`, `pushCode`, `mergePR` — though in practice only `pushCode` and `mergePR` actually throw `GatedActionError`)

### Environment Variables (`.dev.vars`)

```
ANTHROPIC_API_KEY=...
GITHUB_TOKEN=...            GitHub App installation token (fine-grained)
WEBHOOK_SECRET=...          Shared with GitHub App webhook config
SUPABASE_URL=https://glxvjlyhtqnsevsmjyhu.supabase.co
SUPABASE_SERVICE_KEY=...
RESUME_API_KEY=...          Matches DROID_RESUME_API_KEY in droid-web
ENVIRONMENT=development
```

---

## Droid Web (Dashboard)

### Auth (`auth.ts`, `proxy.ts`)

NextAuth v5 (next-auth@beta) with GitHub provider. Stores `accessToken` and `login` in the JWT. `proxy.ts` protects all `/dashboard/*` routes, redirecting unauthenticated users to the sign-in page.

Note: the project uses a **GitHub App** (not an OAuth App). The `admin:repo_hook` scope in `auth.ts` has no effect for GitHub Apps — webhook permissions must be set under "Repository permissions → Webhooks: Read & write" in the GitHub App settings.

### Pages

#### `/` — Landing (`app/page.tsx`)
Sign-in page. Stagger-animated logo, tagline, GitHub sign-in button. Ghost Terminal aesthetic.

#### `/dashboard` — Repo Browser (`app/dashboard/page.tsx` + `DashboardClient.tsx`)
Lists enrolled repos from Supabase alongside the user's GitHub repos. Features:
- Client-side search/filter
- Pagination (PAGE_SIZE = 20)
- Repo card grid (responsive auto-fill, min 260px per card)
- Enroll action: calls `POST /api/enroll` to create GitHub webhook + DB record
- Enrolled state: amber left border, "ENROLLED" tag, "View activity →" link

#### `/dashboard/[owner]/[repo]` — Repo Detail (Repo Hub)
Server component fetches runs from Supabase, builds `runsMap` (keyed by issueNumber), renders `<RepoTabs>` client component. Tabbed interface with Issues and PRs tabs.

#### `RepoTabs`
Client component with `useSearchParams` for `?tab=issues`/`?tab=prs`. Fetches GitHub issues/PRs via API routes, cross-references with runsMap, identifies droid-created PRs via `pr.user.login === "getdroid[bot]"`. Renders IssueCard/PrCard per item.

#### `/dashboard/[owner]/[repo]/issues/[number]` — Issue Detail
Shows full run state for an issue: status, iteration count, activity log (agent text blocks), and pending action panel if a gated action is waiting.

### Components

#### `RunStatusBadge`
Colored dot + label in JetBrains Mono.
- `running` — blue dot, CSS pulse animation
- `completed` — green dot, static
- `failed` — red dot, static
- `paused` — yellow dot, slow pulse
- `pending` — muted dot, static

#### `ActivityLog`
Renders assistant text blocks from a run's message history. Handles both string content (skipped) and array content blocks (filtered to `type: "text"`). Displays numbered `[n]` counters in amber, alternating surface backgrounds, amber left border on the latest block.

#### `PendingActionPanel`
Shown when a run is paused on a gated action. Displays tool name, args as JSON, Approve/Reject buttons. Calls `POST /api/resume` on action. Green/red bordered buttons, amber "AWAITING APPROVAL" header with pulsing dot.

#### `EnrollModal`
Search GitHub repos and enroll them. Debounced search via `GET /api/github/repos`. Terminal-style rows with per-row "Enroll" buttons. Sharp corners, amber focus ring.

#### `ThinkingToggle`
Collapsed/expanded display of agent text thinking steps. Shows "Show thinking (N steps)" when collapsed, numbered text blocks when expanded.

#### `FileDiff`
Renders a PR file diff with filename, +/- stats, and color-coded patch lines. Truncates patches over 200 lines with "Show more" button.

#### `InlineChat`
Text input + message history for inline chat with droid. Calls `POST /api/chat` with context. User messages right-aligned, assistant messages left-aligned with amber border.

#### `IssueCard`
Renders a GitHub issue card with number, title, author, date. Shows "DROID RESPONDED" badge when run exists. Includes ThinkingToggle, Dispatch button, and InlineChat.

#### `PrCard`
Renders a GitHub PR card with number, title, branch info, date. Shows "DROID CREATED" badge. Includes Show files toggle (lazy-fetches FileDiff), Dispatch button, Merge button, and InlineChat.

### API Routes

#### `POST /api/enroll`
Requires session. Validates owner/repo. Verifies user is repo owner or admin via Octokit. Creates GitHub webhook (events: push, issues, issue_comment, pull_request). Inserts into `enrolled_repos` table.

#### `POST /api/resume`
Requires session. Proxies to `{DROID_WORKER_URL}/resume/:runId` with `Authorization: Bearer {DROID_RESUME_API_KEY}`. Passes `{ toolUseId, result }` from request body.

#### `POST /api/dispatch`
Requires session. Proxies to `{DROID_WORKER_URL}/dispatch` with Bearer auth. Body: `{ owner, repo, type, issueNumber?, prNumber? }`.

#### `POST /api/merge`
Requires session. Merges a PR via `octokit.pulls.merge`. Body: `{ owner, repo, pullNumber }`. Returns `{ ok, sha }` or 409 if not mergeable.

#### `POST /api/chat`
Requires session. Calls Anthropic API with system prompt including context (type/number/repo/summary). Body: `{ messages, context }`. Returns `{ role, content }`.

#### `GET /api/github/repos`
Requires session. Searches user repos via `octokit.search.repos` scoped to `user:{login}`. Returns `{ repos: GithubRepo[] }`.

#### `GET /api/github/issues`
Requires session. Params: `owner`, `repo`. Fetches open issues via `octokit.issues.listForRepo`, filters out items with `pull_request` property.

#### `GET /api/github/prs`
Requires session. Params: `owner`, `repo`. Fetches open PRs via `octokit.pulls.list`.

#### `GET /api/github/prs/[number]/files`
Requires session. Params: `owner`, `repo`, `number` (path param). Fetches PR files via `octokit.pulls.listFiles`.

#### `GET /api/github/issues/[number]/comments`
Requires session. Params: `owner`, `repo`, `number` (path param). Fetches issue comments and filters to only droid bot comments (`getdroid[bot]`).

### Queries (`lib/queries.ts`)

| Function | Table | Notes |
|----------|-------|-------|
| `getEnrolledRepos(installedBy)` | `enrolled_repos` | Filter by `installed_by` |
| `getRunsForRepo(owner, repo)` | `agent_runs` | Ordered by `updated_at` desc |
| `getRunForIssue(owner, repo, issueNumber)` | `agent_runs` | JSONB filter: `goal->context @> {"issueNumber": N}` |
| `getPendingActions(runId)` | `pending_actions` | Filter by `run_id` + `status = "pending"` |
| `getRunsMapByIssueNumber(owner, repo)` | `agent_runs` | Returns `Map<number, AgentRun>` keyed by `goal.context.issueNumber` |

Key note: `getRunForIssue` uses `goal->context` (jsonb, not `->>` text) with the `cs` (contains) operator.

### Design System (`app/globals.css`)

**Ghost Terminal aesthetic**: dead-black background, electric amber sole accent, retro terminal feel.

CSS variables:
```css
--bg:         #0a0a0a
--surface:    #111111
--surface-2:  #1a1a1a
--border:     #262626
--border-hi:  #404040
--accent:     #f59e0b
--accent-dim: #78450a
--text-pri:   #f5f5f5
--text-sec:   #a3a3a3
--text-ter:   #525252
--green:      #22c55e
--red:        #ef4444
--blue:       #3b82f6
--yellow:     #eab308
```

Fonts (via `next/font/google`):
- `--font-display`: DM Mono — brand, headers
- `--font-sans`: IBM Plex Sans — body, UI
- `--font-mono`: JetBrains Mono — code, data, counters

Animations: `pulse-dot` (running status), `pulse-slow` (paused status), `fade-in-up` (page entry), `blink` (cursor).

Scanline overlay: `body::after` pseudo-element with repeating-linear-gradient and pointer-events: none.

Utility classes: `.btn-amber`, `.card`, `.card-accent`, `.font-data`, `.font-display`, `.stagger-item`, `.cursor-blink`.

### Environment Variables (`.env.local`)

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
GITHUB_CLIENT_ID=...           GitHub App client ID
GITHUB_CLIENT_SECRET=...       GitHub App client secret
SUPABASE_URL=https://glxvjlyhtqnsevsmjyhu.supabase.co
SUPABASE_SERVICE_KEY=...
DROID_WORKER_URL=https://...   Cloudflare tunnel or deployed worker URL
DROID_RESUME_API_KEY=...       Must match RESUME_API_KEY in worker
```

### Tests

80 tests, all passing. Coverage: ~97% statements/lines/functions, ~81% branches.

### Types added (lib/types.ts)

- `GitHubIssue` -- GitHub issue with labels, state, user
- `GitHubPR` -- GitHub PR with head/base refs, draft flag
- `GitHubPRFile` -- PR file diff with additions/deletions/patch
- `ChatMessage` -- role + content for inline chat

Test environment setup:
- API route tests: `jest-environment-node` + `undici` polyfills for Web API globals
- Component tests: `jest-environment-jsdom` + `@testing-library/react`
- Excluded from coverage: `lib/supabase.ts`, `app/api/auth/**`

---

## Supabase Schema

Project ID: `glxvjlyhtqnsevsmjyhu`

### `agent_runs`
| Column | Type | Notes |
|--------|------|-------|
| `run_id` | uuid | Primary key |
| `repo_owner` | text | |
| `repo_name` | text | |
| `trigger` | text | `push`, `issue_created`, etc. |
| `goal` | jsonb | Full Goal object |
| `status` | text | `pending / running / paused / completed / failed` |
| `messages` | jsonb | Full Anthropic message history |
| `iteration` | int | Current loop count |
| `artifacts` | jsonb | Array of artifact objects |
| `error` | text | Error message if failed |
| `updated_at` | timestamptz | |

### `pending_actions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | int | Primary key |
| `run_id` | uuid | FK → agent_runs |
| `tool_use_id` | text | Anthropic tool_use block ID |
| `tool` | text | `pushCode` or `mergePR` |
| `args` | jsonb | Tool arguments |
| `status` | text | `pending / approved / rejected` |
| `created_at` | timestamptz | |

### `enrolled_repos`
| Column | Type | Notes |
|--------|------|-------|
| `id` | int | Primary key |
| `owner` | text | GitHub owner login |
| `repo` | text | Repo name |
| `webhook_id` | int | GitHub webhook ID |
| `installed_by` | text | Session user name/email |
| `created_at` | timestamptz | |

---

## Data Flow

### Webhook → Agent Run

```
GitHub push/issue/PR/comment
  → POST /webhook (droid worker)
  → verifySignature (HMAC-SHA256)
  → fromGithubWebhook → Goal
  → runDroidAgent (ctx.waitUntil)
    → getSandbox
    → cloneRepo (git clone into /workspace/repo/)
    → runAgent loop
      → anthropic.messages.create (claude-sonnet-4-6)
      → executeToolCalls
        → tool.execute(args)
          → GatedActionError? → saveCheckpoint(paused) + savePendingAction → return
          → normal result → append tool_result to messages
      → saveCheckpoint(running)
    → saveCheckpoint(completed|failed)
  → sandbox.destroy()
```

### Human Approval Flow

```
Dashboard polls /dashboard/[owner]/[repo]/issues/[number]
  → getRunForIssue (Supabase) → AgentRun (status: paused)
  → getPendingActions (Supabase) → PendingAction[]
  → User clicks Approve/Reject
  → POST /api/resume { runId, toolUseId, result }
  → POST {DROID_WORKER_URL}/resume/:runId (proxied)
    → loadCheckpoint
    → build toolResults (inject result for gated tool, placeholder for others)
    → runDroidAgent (ctx.waitUntil, resuming)
      → cloneRepo
      → runAgent (existingRun, initialMessages with injected results)
      → continues from where it left off
```

---

## Known Limitations / Notes

- **GitHub App permissions**: Webhook creation requires "Repository permissions → Webhooks: Read & write" in the GitHub App settings. The `admin:repo_hook` OAuth scope in `auth.ts` is a no-op for GitHub Apps.
- **Anthropic message content**: Can be a string (simple user messages) or an array of content blocks. `ActivityLog` and other message consumers must handle both formats.
- **JSONB filter**: `getRunForIssue` uses `goal->context` (jsonb) with the `cs` operator. Using `->>` (text extract) causes a PostgreSQL operator type mismatch.
- **`runCommand` denylist**: Blocks `curl wget nc netcat ssh scp rsync env printenv eval` to prevent sandbox escape via shell.
- **Cloudflare tunnel for local dev**: `DROID_WORKER_URL` must point to a valid public URL — Cloudflare tunnels expire and need to be recreated. GitHub can't send webhooks to localhost.
- **Iteration cap**: Agent stops after 10 iterations regardless of task completion.
- **No streaming**: Agent responses are not streamed to the dashboard; the UI polls on page load.
