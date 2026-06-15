---
name: cfn-lsp-development
description: >
  Development workflow for the CloudFormation Language Server. Guides agents through implementation, testing, and PR creation. Use when implementing features, fixing bugs, adding handlers/providers, or making changes to this repository.
---

# CFN LSP Development Workflow

## Constraints

These constraints apply to ALL changes in this repository:

- **No backwards-incompatible changes (hard rule)** — Never change or remove existing LSP protocol methods, request types, or response/return types. Additive changes only — breaking the wire contract breaks the already-shipped VS Code and JetBrains clients.
- **Cross-platform** — All changes must work on macOS, Windows, and Linux
- **No database locking** — Never lock LMDB or other shared resources; multiple concurrent LSP connections may exist
- **Performance** — Handlers must respond quickly; avoid blocking the event loop or doing synchronous I/O in request paths. Use `npm run benchmark` to confirm changes haven't regressed latency.

## Developer Tools

### Debugging the syntax tree

```bash
npm run debug-tree -- --file <template.yaml|json>
```

Runs `tools/debug_tree.ts` — builds a `SyntaxTree`, traverses every node, and emits `Context` objects at key positions. The fastest way to diagnose parse/context problems when working on completion, hover, or definition.

### Benchmarking performance

```bash
npm run benchmark              # default run
npm run benchmark -- --iterations 100 --templates ./tst/resources --output results.md
```

Runs `tools/benchmark.ts` — measures syntax-tree creation and context-lookup latency across iterations. Use this to verify the Performance constraint above.

### Stability testing

```bash
npm run test:stability
```

Runs `tools/stability/` — long-running tests that exercise completion and hover under sustained load.

## Workflow

### Step 1: Research

Before making changes, locate or set up local workspaces for affected packages:

1. **Search parent directories** for existing checkouts:
   - Look for `cloudformation-languageserver/` in `../`, `../../`, etc.
   - Check `LOCAL_TESTING_SERVER_PATH` env var for an existing server bundle path

2. **If not found**, ask the user:
   - "Do you have a local checkout? If so, provide the path."
   - "Should I clone the repository?"

3. **Set up missing workspace:**
   - `git clone https://github.com/aws-cloudformation/cloudformation-languageserver.git`

Next, browse the source code.
- Identify conventions: file naming, class structure, test patterns
- Read files relevant to the task to understand wiring (imports, exports, registration)
- Check `.kiro/steering/` for architecture guidance when needed

### Step 2: Plan

Before writing code:

1. Read the task requirements
2. Identify affected source directories (see `structure.md` in steering)
3. Create an implementation plan
   a. Create a markdown file at the workspace root: `./<feature-or-fix-name>-plan.md`
      The plan MUST include:
      - **Summary** — what is being implemented and why
      - **Affected packages** — which packages need changes
      - **Approach** — high-level design decisions
      - **Task checklist** — every discrete task as a checkbox item, ordered by execution sequence

4. Present the plan to the user and ask them to review it
5. **STOP and wait for explicit user approval before writing any code**
6. As tasks are completed, update the checklist in the plan file (check off items)

### Step 3: Implement

1. Create a local branch for your changes
2. Write unit tests that define expected behavior (they should fail initially)
3. Implement the minimum code to make tests pass
4. Follow existing patterns in the relevant feature directory
5. Refactor for clarity while keeping tests green

### Step 4: Telemetry

Wire telemetry for new handlers using `ScopedTelemetry` public methods:

```typescript
// Measure duration + count + fault for a handler
const result = await this.telemetry.measureAsync('HandlerName', async () => {
  /* handler logic */
});

// Track execution with response tracking
const result = this.telemetry.trackExecution('HandlerName', () => {
  /* handler logic */
});

// Count-only (no duration)
const result = await this.telemetry.countExecutionAsync('HandlerName', async () => {
  /* handler logic */
});
```

**Metrics emitted by these methods:**
- `{Name}.count` — invocation count
- `{Name}.duration` — response time (measure/trackExecution only)
- `{Name}.fault` — unhandled exception

### Step 5: Verify

Before creating a PR, **all of these must pass**:

```bash
npm run build             # TypeScript compilation
npm run lint              # Linting (zero warnings)
npm run test              # Unit tests + coverage (thresholds: 88% statements, 82% branches, 90% functions, 88% lines)
```

Coverage runs automatically with `npm run test` (`coverage.enabled: true` in `vitest.config.ts`).

### Step 6: Client-Side Changes

Some changes require corresponding updates in the editor clients (e.g., features that need UX work). See the client repositories for their own build/test/contribution guides:

| Client | Repository | CloudFormation path |
|--------|-----------|-------------------|
| VS Code | [`aws/aws-toolkit-vscode`](https://github.com/aws/aws-toolkit-vscode) (branch: `master`) | `packages/core/src/awsService/cloudformation/` |
| JetBrains | [`aws/aws-toolkit-jetbrains`](https://github.com/aws/aws-toolkit-jetbrains) (branch: `main`) | `plugins/toolkit/jetbrains-core/src/software/aws/toolkits/jetbrains/services/cfnlsp` |

### Step 7: PR

- Ensure new code has unit tests (and integration tests for handlers)
- Confirm no breaking API changes
- Confirm cross-platform compatibility (no platform-specific paths, no OS-specific APIs without fallbacks)
- Note in PR description if client-side changes are also needed
