---
name: cfn-lsp-development
description: >
  Development workflow for the CFN LSP Project ecosystem. Guides agents through
  package discovery, implementation, testing, telemetry wiring, and PR creation across the server,
  clients, and related packages. Use when implementing features, fixing bugs, adding
  handlers/providers, or making changes to the cloudformation-languageserver or its related packages.
tags: [skill, ide, lsp, cloudformation, typescript, development]
---

# LSP Development

## Overview

Guides development agents through implementing changes across the CFN LSP Project ecosystem — from package discovery through PR creation, ensuring all affected packages are covered with proper tests and telemetry.

## Usage

Use this skill when:
- Implementing a new LSP handler or completion provider
- Fixing a bug in the language server
- Wiring telemetry for new features
- Making client-side changes (VSCode or JetBrains)
- Any task touching the IDE Experience codebase

## Core Concepts

### Architecture

The CFN LSP uses a **Component-Handler** architecture:
- **Handlers** — one per LSP request (completion, hover, definition, diagnostics)
- **Components** — internal state/logic (SyntaxTreeManager, ContextManager, SchemaStore, LMDBStore)
- **Services** — external I/O (CfnLint/Pyodide, Auth, CFN API, Telemetry)

For full architecture details, read `.kiro/steering/CFN_LSP_Architecture_Overview.md`.

### Package Ecosystem

| Package | Location | Branch | Purpose |
|---------|----------|--------|---------|
| cloudformation-languageserver | github.com/aws-cloudformation/cloudformation-languageserver | main | LSP server (TypeScript/Node.js) |
| aws-toolkit-vscode | github.com/aws/aws-toolkit-vscode | master | VSCode client (TypeScript) |
| aws-toolkit-jetbrains | github.com/aws/aws-toolkit-jetbrains | main | JetBrains client (Kotlin) |

**Client paths:**
- VSCode: `packages/core/src/awsService/cloudformation/`
- JetBrains: `plugins/toolkit/jetbrains-core/src/software/aws/toolkits/jetbrains/services/cfnlsp`

## Workflow

### Step 1: Package Discovery

Before planning, determine which packages need changes:

1. Read the task requirements
2. Map requirements to affected packages from the table above
3. Include the TODO list in your plan with per-package changes

**Decision guide:**
- New handler/provider → server + tests
- New LSP capability → server + tests + VSCode client + JetBrains client
- Bug fix (server only) → server + unit tests
- Bug fix (client visible) → server + affected client(s) + tests

### Step 2: Workspace Discovery

Before making changes, locate or set up local workspaces for affected packages:

1. **Search parent directories** for existing checkouts:
   - Look for `cloudformation-languageserver/`, `aws-toolkit-vscode/`, `aws-toolkit-jetbrains/` in `../`, `../../`, etc.
   - Check `LOCAL_TESTING_SERVER_PATH` env var for an existing server bundle path

2. **If not found**, ask the user:
   - "Do you have a local checkout of `<package>`? If so, provide the path."
   - "Should I clone the repository?"

3. **Set up missing workspaces:**
   - `git clone https://github.com/aws-cloudformation/cloudformation-languageserver.git`
   - `git clone https://github.com/aws/aws-toolkit-vscode.git`
   - `git clone https://github.com/aws/aws-toolkit-jetbrains.git`

4. **For testing against local server changes:**
   - Build the server: `npm run bundle:alpha` (in the language server workspace)
   - Set path: `LOCAL_TESTING_SERVER_PATH=<path-to-languageserver>/bundle/production`

### Step 3: Research

For each affected package, browse the live source directly:

**GitHub repos (use `web_fetch`):**
- Server: `https://github.com/aws-cloudformation/cloudformation-languageserver/tree/main/src/` and `tst/`
- VSCode: `https://github.com/aws/aws-toolkit-vscode/tree/master/packages/core/src/awsService/cloudformation/`
- JetBrains: `https://github.com/aws/aws-toolkit-jetbrains/tree/main/plugins/toolkit/jetbrains-core/src/software/aws/toolkits/jetbrains/services/cfnlsp`

For each:
1. Browse existing patterns (handlers, providers, tests) in the live source
2. Identify conventions: file naming, class structure, test patterns
3. Read specific files to understand wiring (imports, exports, registration)
4. Check `.kiro/steering/` for architecture guidance when needed

### Step 4: Implementation Plan

Before writing any code, create an implementation plan:

1. Create a markdown file at the workspace root: `./<feature-or-fix-name>-plan.md`
2. The plan MUST include:
   - **Summary** — what is being implemented and why
   - **Affected packages** — which packages need changes (from Step 1)
   - **Approach** — high-level design decisions
   - **Task checklist** — every discrete task as a checkbox item, ordered by execution sequence
3. Present the plan to the user and ask them to review it
4. **STOP and wait for explicit user approval before writing any code**
5. As tasks are completed, update the checklist in the plan file (check off items)

**Example plan structure:**
```markdown
# Implementation Plan: <title>

## Summary
<what and why>

## Affected Packages
- [ ] cloudformation-languageserver (server)

## Approach
<design decisions, patterns to follow>

## Tasks
- [ ] Write unit tests for <new handler>
- [ ] Write integration tests for <new handler>
- [ ] Implement <handler> following existing patterns
- [ ] Wire telemetry metrics
- [ ] Run full test suite and lint
- [ ] Create PR
```

### Step 5: Implement (Test-Driven Development)

Follow TDD — write tests first, then implementation:

**Phase 1: Write tests**
1. Write unit tests that define the expected behavior of the new code
2. Write integration tests for handler/provider interactions
3. Run tests — they MUST fail (confirms they test something real)

**Phase 2: Write business logic**
1. Implement the minimum code to make tests pass
2. Follow existing patterns per package (see below)
3. Refactor for clarity while keeping tests green

**Phase 3: Verify**
1. All new tests pass
2. All existing tests still pass
3. npm run lint passes clean

**Per-package implementation guidance:**

**Server (cloudformation-languageserver):**

Source (`src/`) is organized by feature, NOT by architectural layer:
- `src/app/` — Entry points (standalone.ts, initialize.ts)
- `src/autocomplete/` — Completion providers
- `src/hover/` — Hover documentation
- `src/definition/` — Go-to-definition
- `src/codeLens/` — CodeLens providers
- `src/documentSymbol/` — Document symbol/outline
- `src/handlers/` — LSP request handler wiring
- `src/context/` — Semantic model (AST, entities, intrinsics)
- `src/schema/` — CloudFormation type schemas
- `src/datastore/` — LMDB persistence layer
- `src/services/` — External services (cfnLint, guard, auth)
- `src/server/` — LSP server setup
- `src/stacks/` — Stack operations (deploy, changeset, events)
- `src/resourceState/` — Cloud Control API resource state
- `src/relatedResources/` — Related resources feature
- `src/telemetry/` — OpenTelemetry metrics
- `src/auth/` — Credential management
- `src/protocol/` — LSP protocol extensions
- `src/settings/` — Server settings
- `src/featureFlag/` — Feature flags
- `src/artifacts/` — Artifact handling
- `src/artifactexporter/` — Artifact export
- `src/s3/` — S3 operations
- `src/document/` — Document management
- `src/cfnEnvironments/` — CFN environments
- `src/usageTracker/` — Usage tracking
- `src/utils/` — Shared utilities

Tests (`tst/`) mirror this structure:
- `tst/unit/` — Unit tests (Vitest)
- `tst/integration/` — Integration tests
- `tst/e2e/` — End-to-end tests
- `tst/resources/` — Test fixtures
- `tst/utils/` — Test utilities

**Before writing new code**, check `src/utils/` and `tst/utils/` for existing reusable methods. If you find a method that fits your task, use it. If you write a method that could be reused, move it to the appropriate utils file, export it, and import where needed.

**Telemetry (cloudformation-languageserver):**
- Wire new handlers with `ScopedTelemetry.executeWithMetrics()`
- Emit `{Handler}.duration` and `{Handler}.fault` metrics

**VSCode client (aws-toolkit-vscode):**
- Monorepo structure — open via `aws-toolkit-vscode.code-workspace`
- CloudFormation code lives in `packages/core/src/awsService/cloudformation/`
- Build: `npm run compile`
- Test commands:
  - Unit tests: `npm run test` (fast, in `src/test/`, Mocha framework)
  - Integration tests: `npm run testInteg` (slow, in `src/testInteg/`, full VSCode instance)
  - Lint: `npm run lint`
  - Single file: `TEST_FILE=./core/src/test/foo.test.ts npm run test`
  - Single dir: `TEST_DIR=./core/src/test/foo npm run test`
- Test philosophy: 90% unit, 10% integration. Tests must be fast. No real network calls.
- Mocking: mock only inputs (constructor params, function args, injected deps). Never mock internal logic.
- Use `getTestWindow()` for UI interactions in tests
- PR title format: `type(scope): subject` (e.g., `feat(cloudformation): add hover for intrinsics`)
- Follow [CONTRIBUTING.md](https://github.com/aws/aws-toolkit-vscode/blob/master/CONTRIBUTING.md) and [TESTPLAN.md](https://github.com/aws/aws-toolkit-vscode/blob/master/docs/TESTPLAN.md)

**JetBrains client (aws-toolkit-jetbrains):**
- Kotlin, follows existing patterns in `plugins/toolkit/jetbrains-core/src/software/aws/toolkits/jetbrains/services/cfnlsp`
- Follow [CONTRIBUTING.md](https://github.com/aws/aws-toolkit-jetbrains/blob/main/CONTRIBUTING.md)

### Step 6: Test

Per package, ALL existing tests MUST pass:

| Package | Test Command | Framework | Coverage Thresholds |
|---------|-------------|-----------|-------------------|
| Server | `npm run test` | Vitest | 88% statements, 82% branches, 90% functions |
| Server lint | `npm run lint -- --fix` | ESLint | Must pass clean |
| VSCode build | `npm run compile` | TypeScript | Must compile clean |
| VSCode unit | `npm run test` | Mocha | 90% unit / 10% integ ratio |
| VSCode integ | `npm run testInteg` | Mocha + VSCode | Must pass |
| VSCode lint | `npm run lint` | ESLint | Must pass |
| JetBrains | Package-specific test runner | — | Must pass |

**Test requirements for new code:**
- Unit tests for all new functions/classes
- Integration tests for new handlers (LSP request → response)
- E2E tests for user-facing features

### Step 7: Pre-PR Checklist

Before creating a PR:
1. `npm run lint -- --fix` (server)
2. `npm run test` passes (server)
3. All affected client tests pass
4. New telemetry metrics are wired

## Quick Reference

### Common Commands (Server)

```bash
npm ci                    # Install dependencies
npm run test              # Run unit tests
npm run test:coverage     # Run with coverage report
npm run lint -- --fix     # Lint and auto-fix
npm run bundle:alpha      # Webpack bundle (alpha)
npm run bundle:beta       # Webpack bundle (beta)
npm run bundle:prod       # Webpack bundle (production)
```

### Common Commands (VSCode Client)

```bash
npm install               # Install dependencies (from repo root)
npm run compile           # Build
npm run test              # Unit tests (fast)
npm run testInteg         # Integration tests (slow, full VSCode)
npm run lint              # Lint
TEST_FILE=./core/src/test/foo.test.ts npm run test  # Single file
```

### Telemetry Pattern

```typescript
// Wire a new handler with telemetry
const result = await this.telemetry.executeWithMetrics(
  'NewHandler',
  async () => { /* handler logic */ }
);
```

### Key Metrics

- `{Handler}.duration` — response time
- `{Handler}.fault` — unhandled exception
- `LMDB.{op}.duration` — database latency
- `LMDB.{op}.fault` — database failure

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Forgetting telemetry on new handler | Always wrap with `executeWithMetrics()` |
| Running tests without `npm run lint -- --fix` first | Lint first, test second |
| Only testing server, not clients | Check if client changes are needed |
| Missing package in TODO list | Always run Package Discovery step first |
