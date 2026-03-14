# Implementation Plan: Repo Hub Page with Issues and PRs Tabs

## Overview

Replace the current agent-runs table on the repo detail page with a tabbed interface (Issues / PRs). Each tab fetches live GitHub data, cross-references with droid's Supabase records, and provides dispatch, chat, merge, and diff capabilities. A new `/dispatch` endpoint is added to the droid worker to accept on-demand agent invocations.

## Architecture

The split is deliberate: the **server component** fetches Supabase data (using the service key that must never reach the client), then passes a serialized `runsMap` to a **client component** (`RepoTabs`) that handles GitHub API calls through authenticated API routes (using the user's own access token).

The droid worker gets one new endpoint (`POST /dispatch`) that constructs a `Goal` and invokes `runDroidAgent` — identical to how the webhook handler works, but triggered on-demand.

For chat, the droid-web API route calls Anthropic via raw `fetch` (no new dependency). `ANTHROPIC_API_KEY` must be added to droid-web's `.env.local`.

---

## ~~Phase 1: Types and Queries~~

1. Add `GitHubIssue`, `GitHubPR`, `GitHubPRFile`, `ChatMessage` to `lib/types.ts`
2. Add `getRunsMapByIssueNumber(owner, repo)` to `lib/queries.ts` — returns `Map<number, AgentRun>` keyed by `goal.context.issueNumber`
3. Write tests for new query in `lib/queries.test.ts`

**Commit**: `feat: add GitHub types and issue-run mapping query`

---

## ~~Phase 2: GitHub API Routes~~

4. Tests for `GET /api/github/issues` — 401, returns issues (PRs filtered out), 400 missing params, 500 error
5. Implement `GET /api/github/issues` — `octokit.issues.listForRepo({ state: "open", per_page: 30 })`, filter `!item.pull_request`
6. Tests for `GET /api/github/prs`
7. Implement `GET /api/github/prs` — `octokit.pulls.list({ state: "open", per_page: 30 })`
8. Tests for `GET /api/github/prs/[number]/files` — validate number param (Next.js 16: `await params`)
9. Implement `GET /api/github/prs/[number]/files` — `octokit.pulls.listFiles({ pull_number })`

**Commit**: `feat: add GitHub issues, PRs, and PR files API routes`

---

## ~~Phase 3: Dispatch Route + Worker Endpoint~~

10. Tests for `POST /api/dispatch` — 401, 400 missing/invalid fields, proxies to worker, handles worker errors
11. Implement `POST /api/dispatch` — parse `{ owner, repo, type, issueNumber?, prNumber? }`, POST to `${DROID_WORKER_URL}/dispatch` with Bearer auth
12. Add `POST /dispatch` to `droid/src/index.ts` — Bearer auth, construct `Goal` (`"issue_created"` or `"pull_request"`), `ctx.waitUntil(runDroidAgent(goal, env))`

**Commit**: `feat: add dispatch endpoint to worker and dispatch API route`

---

## Phase 4: Merge Route

13. Tests for `POST /api/merge` — 401, 400 missing fields, success returns sha, 409 conflict handled
14. Implement `POST /api/merge` — `octokit.pulls.merge({ owner, repo, pull_number })` using user's access token

**Commit**: `feat: add merge PR API route`

---

## Phase 5: Chat Route

15. Tests for `POST /api/chat` — 401, 400 missing messages, mocks Anthropic fetch, returns assistant content, handles errors
16. Implement `POST /api/chat` — raw fetch to Anthropic API, system prompt includes context (type/number/repo/summary), model `claude-sonnet-4-6`, max_tokens 1024

**Commit**: `feat: add inline chat API route with Anthropic`

---

## Phase 6: Presentational Components

17. Tests + implement `ThinkingToggle` — collapsed "Show thinking (N steps)" / expanded ActivityLog-style rendering
18. Tests + implement `FileDiff` — filename, +/- stats, patch with line coloring (`+` green, `-` red, `@@` accent), truncate >200 lines
19. Tests + implement `InlineChat` — text input + submit, manages `ChatMessage[]` state, calls `/api/chat`

**Commit**: `feat: add ThinkingToggle, FileDiff, and InlineChat components`

---

## Phase 7: Card Components

20. Tests + implement `IssueCard` — issue title/number/author/date, "Droid responded" badge, droid comment, ThinkingToggle, Dispatch button, InlineChat
21. Tests + implement `PrCard` — PR title/number/branch/date, "Droid created" badge, "Show files" toggle (lazy-fetch), FileDiff per file, Dispatch button, Merge button, InlineChat

**Commit**: `feat: add IssueCard and PrCard components`

---

## Phase 8: Tab Layout and Page Refactor

22. Tests + implement `RepoTabs` — client component, `useSearchParams` for `?tab=issues`/`?tab=prs`, fetches issues/PRs via API routes, cross-references runsMap, identifies droid-created PRs via `pr.user.login === droidBotUsername`
23. Refactor `app/dashboard/[owner]/[repo]/page.tsx` — keep server component, build runsMap, render `<RepoTabs />`, remove old table

**Commit**: `feat: replace runs table with tabbed Issues/PRs hub`

---

## Phase 9: Droid Comment Fetching

24. Tests + implement `GET /api/github/issues/[number]/comments` — filters comments by `DROID_BOT_USERNAME`
25. Wire lazy-fetch into `IssueCard` — fetch droid comment on mount when run exists

**Commit**: `feat: add droid comment display on issue cards`

---

## Phase 10: Polish

26. Loading skeletons — `$ loading issues...` with cursor-blink
27. Error states — `$ error: {message}` in `color: var(--error)`
28. Empty states — "No open issues" / "No open pull requests"
29. Full test suite — all 76 existing + ~40 new pass, 80%+ coverage

**Commit**: `feat: polish repo hub with loading states and error handling`

---

## New Environment Variables

Add to `droid-web/.env.local`:
- `ANTHROPIC_API_KEY` — copy from droid worker `.dev.vars`
- `DROID_BOT_USERNAME` — GitHub App bot username (e.g. `droid-app[bot]`)

---

## New Files (~26 files)

**API routes**: issues, issues/[number]/comments, prs, prs/[number]/files, dispatch, merge, chat (each with test file)

**Components**: RepoTabs, IssueCard, PrCard, InlineChat, FileDiff, ThinkingToggle (each with test file)

**Modified**: `lib/types.ts`, `lib/queries.ts`, `app/dashboard/[owner]/[repo]/page.tsx`, `droid/src/index.ts`

---

## Risks

- **GitHub rate limiting** — lazy-load comments/files, handle 403 with user-facing message
- **Droid PR identification** — primary: `pr.user.login === droidBotUsername`; fallback: parse `createPR` tool results from messages
- **Large PR diffs** — truncate patches >200 lines, lazy-load per PR
- **Breaking existing page** — only Phase 8 modifies the existing page; issue detail page at `/issues/[number]` is untouched
