---
name: cfn-lsp-development
description: Development workflow for the AWS CloudFormation Language Server (this repository). Use when implementing features, fixing bugs, adding tests, or making any code change in cloudformation-languageserver. Covers planning, telemetry, build/lint/test verification, and PR conventions.
license: Apache-2.0
---

# CFN LSP Development Workflow

## Constraints

These constraints apply to ALL changes in this repository:

- **No backwards-incompatible changes (hard rule)** — Never change or remove existing LSP protocol methods, request
  types, or response/return types. Additive changes only — breaking the wire contract breaks the already-shipped VS Code
  and JetBrains clients.
- **Cross-platform** — All changes must work on macOS, Linux, and Windows. The DataStore layer in particular has two
  persisted backends (LMDB on macOS / Linux, encrypted file store on Windows or when the `FileDb` feature flag is on);
  any persistence change must work against both. See `architecture.md`.
- **No database locking** — Never hold long locks on LMDB or other shared resources; multiple concurrent LSP
  connections may exist.
- **Performance** — Handlers must respond quickly; avoid blocking the event loop or doing synchronous I/O in request
  paths. Use `npm run benchmark` to confirm changes haven't regressed latency.

## Repository Layout

You are working inside the `cloudformation-languageserver` repo. Source lives in `src/`, tests mirror the source tree
under `tst/`. See `.kiro/steering/structure.md` for directory-level guidance and `.kiro/steering/architecture.md` for
the component / handler model.

## Scratch Files

Put scratch files, debug scripts, manual repro templates, ad-hoc benchmark scripts, and any other throwaway artifacts
under `tmp/` at the repo root. `tmp/` (and `tmp-node-modules/`, `tmp-tst/`) is `.gitignore`d, so it will never be
committed accidentally. Do **not** scatter scratch files across `src/`, `tst/`, or the workspace root.

## Code Quality

Hold every change in this repo to a senior-engineer standard. The full rule sets are bundled with this skill — read
them when you write or modify code:

- Source code: [`references/source-code-rules.md`](references/source-code-rules.md) — naming, reuse, architecture,
  SOLID, immutability, error handling, null/thread safety, performance, dependency discipline, and public-API
  compatibility.
- Test code: [`references/test-code-rules.md`](references/test-code-rules.md) — meaningful coverage, AAA structure,
  mock quality, determinism, behavior-not-implementation, edge / failure paths.

The two rules with the highest leverage in this repository:

- **Reuse `src/utils/` and `tst/utils/` before writing new helpers.** Search both directories first
  (`MockServerComponents`, `TemplateBuilder`, `MockContext`, `Expect`, `SchemaUtils`, `Delayer`, `Retry`,
  `AwsErrorMapper`, `PathUtils`, `String`, `TypeCheck`, etc.). If a needed helper doesn't exist, add it to the
  appropriate `utils/` directory rather than co-locating it in a feature folder, so the next caller can find it.
- **Respect the layer model.** Handlers stay thin and delegate to a Component or Service (see `architecture.md`).
  Do not let handlers do AWS I/O, file I/O, or schema parsing directly.

Apply both rule sets even when the user doesn't mention "quality" or "best practices" — they are the contract for
contributing to this repo.

## Developer Tools

### Debugging the syntax tree

```bash
npm run debug-tree -- --file <template.yaml|json>
```

Runs `tools/debug_tree.ts` — builds a `SyntaxTree`, traverses every node, and emits `Context` objects at key positions.
The fastest way to diagnose parse / context problems when working on completion, hover, or definition.

### Benchmarking performance

```bash
npm run benchmark              # default run
npm run benchmark -- --iterations 100 --templates ./tst/resources --output results.md
```

Runs `tools/benchmark.ts` — measures syntax-tree creation and context-lookup latency across iterations. Use this to
verify the Performance constraint above.

## Workflow

### Step 1: Research

Apply "Explore the Project Before Writing" from [`references/source-code-rules.md`](references/source-code-rules.md):
read the relevant feature directory (`src/<feature>/`), its tests under `tst/`, and the shared helpers in
`src/utils/` and `tst/utils/` before designing the change. Use `.kiro/steering/architecture.md` and
`.kiro/steering/structure.md` when you need a map of where things live.

### Step 2: Plan

Before writing code:

1. Identify the affected source directories (see `structure.md`).
2. Create an implementation plan as `tmp/<feature-or-fix-name>-plan.md` (under the gitignored `tmp/`), including:
    - **Summary** — what is being implemented and why
    - **Affected files / directories**
    - **Approach** — high-level design decisions and any tradeoffs
    - **Task checklist** — every discrete task as a checkbox item, ordered by execution sequence
3. Present the plan to the user.
4. **STOP and wait for explicit user approval before writing any code.**
5. As tasks are completed, check off items in the plan file.

### Step 3: Implement

1. Create a local branch for your changes.
2. Write unit tests that define the expected behavior (they should fail initially).
3. Implement the minimum code to make tests pass.
4. Follow existing patterns in the relevant feature directory.
5. Refactor for clarity while keeping tests green.

For new persisted state, decide whether it belongs in `PersistedStores` (survives editor restart) or as a non-persisted
`MemoryStore`. See `src/datastore/DataStore.ts`.

### Step 4: Telemetry

Wire telemetry on new handlers and any code path you care about observing in production.

**Prefer the decorators in `src/telemetry/TelemetryDecorator.ts`** over direct `ScopedTelemetry` calls — they keep
metric scopes consistent and avoid boilerplate:

```typescript
import {Telemetry, Track} from '../telemetry/TelemetryDecorator';
import {ScopedTelemetry} from '../telemetry/ScopedTelemetry';

@Telemetry({scope: 'CompletionRouter'})
export class CompletionRouter {
    // Field is injected by @Telemetry — no constructor wiring needed
    private readonly telemetry!: ScopedTelemetry;

    @Track({name: 'getCompletions', captureErrorAttributes: true})
    public async getCompletions(params: CompletionParams): Promise<CompletionItem[]> {
        /* handler logic */
    }
}
```

`@Track` emits `{Name}.count`, `{Name}.duration`, and `{Name}.fault` for each invocation. Use `@Telemetry` once per
class to bind a scope; use `@Track` on each method you want measured.

Use the imperative `ScopedTelemetry` helpers only when you need to instrument something a decorator can't reach
(an inline closure, a lambda, a non-class function). The available helpers are:

```typescript
// Inline async — emits {Name}.count, {Name}.duration, {Name}.fault
const result = await this.telemetry.measureAsync('Subtask', async () => {
    /* logic */
});
```

### Step 5: Verify

Before creating a PR, **all of these must pass**:

```bash
npm run build                # TypeScript compilation
npm run lint                 # Linting (zero warnings — `--max-warnings 0`)
npm run test                 # Unit + integration + e2e + coverage
```

Coverage runs automatically with `npm run test` and thresholds are enforced from `vitest.config.mjs`.
If you only need to run a subset while iterating: `npm run test:unit` or `npm run test:integration`.
Use `npm run lint:fix` for auto-fixable lint violations.

### Step 6: Client-Side Changes

Some changes (new commands, new code lens actions, new UI surfaces) require corresponding updates in the editor
clients. See the client repositories for their own build / test / contribution guides:

| Client    | Repository                                                                                   | CloudFormation path                                                                  |
|-----------|----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| VS Code   | [`aws/aws-toolkit-vscode`](https://github.com/aws/aws-toolkit-vscode) (branch: `master`)     | `packages/core/src/awsService/cloudformation/`                                       |
| JetBrains | [`aws/aws-toolkit-jetbrains`](https://github.com/aws/aws-toolkit-jetbrains) (branch: `main`) | `plugins/toolkit/jetbrains-core/src/software/aws/toolkits/jetbrains/services/cfnlsp` |

### Step 7: PR

Re-read the **Constraints** section above and confirm none are violated. Note in the PR description if matching
client-side changes are needed.
