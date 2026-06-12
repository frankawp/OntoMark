# OntoMark V2 Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mixed V1/V2 implementation with a single V2 LLM Wiki build pipeline.

**Architecture:** The SDK owns the orchestration. Discovery extracts mentions, resolution produces canonical/draft entities, builders update wiki artifacts, and CLI delegates to the SDK. Markdown and frontmatter remain the durable source of compiled knowledge; cache files are rebuildable.

**Tech Stack:** TypeScript, Node.js fs/path APIs, gray-matter, Jest, existing parser/schema/LLM provider modules.

---

### Task 1: V2 Regression Tests

**Files:**
- Modify: `tests/integration-v2.test.ts`
- Modify: `tests/schema/loader.test.ts`
- Modify: `tests/cli-v2.test.ts`

- [ ] Add tests for canonical type directories, source evidence, user content preservation, draft review pages, schema fallback, generated index/log/context/topic/backlinks, and CLI delegation.
- [ ] Run focused tests and confirm they fail for missing V2 behavior.

### Task 2: Single V2 SDK Pipeline

**Files:**
- Replace: `src/index.ts`
- Modify: `src/schema/loader.ts`
- Modify: `src/schema/types.ts`

- [ ] Remove V1 orchestration from `OntoMark`.
- [ ] Load schema from the project root fallback order.
- [ ] Implement `extract`, `link`, `build`, and `getStatus` around V2 discovery and builder modules.

### Task 3: Wiki Artifact Builders

**Files:**
- Modify: `src/builder/page-builder.ts`
- Modify: `src/builder/link-builder.ts`
- Modify: `src/builder/index-builder.ts`
- Create: `src/builder/backlink-builder.ts`
- Create: `src/builder/topic-builder.ts`
- Create: `src/builder/context-builder.ts`
- Create: `src/builder/log-builder.ts`

- [ ] Preserve user-authored sections when rebuilding pages.
- [ ] Build cache from frontmatter and link by page names and aliases.
- [ ] Generate backlinks, topic pages, agent context, index, and append-only log.

### Task 4: CLI V2 Rewrite

**Files:**
- Replace: `src/cli.ts`

- [ ] Keep `init`, `extract`, `link`, `build`, and `status`.
- [ ] Remove legacy commands and route all build behavior through `OntoMark`.

### Task 5: Verification

**Files:**
- All changed files

- [ ] Run `npm run build`.
- [ ] Run focused V2 tests.
- [ ] Run full `npm test -- --runInBand`.
- [ ] Fix failures and rerun until verified.
