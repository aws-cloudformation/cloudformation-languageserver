# Technology Stack

## Language & Runtime

- **TypeScript** on Node.js
- Target: Node 22+ (`^22.15.0`), npm `>=10.5.0`

## Build & Tooling

- **npm** — package manager
- **TypeScript compiler** — incremental builds to `out/` via `npm run build`
- **Vitest** — test framework (unit + integration + e2e), V8 coverage
- **ESLint** — linting (zero-warning policy enforced via `--max-warnings 0`)
- **Webpack** — bundles into `cfn-lsp-server-standalone.js` for distribution

## Key Libraries

- `vscode-languageserver` / `vscode-languageserver-protocol` — LSP runtime
- `tree-sitter` (with the JSON and YAML grammars) — incremental AST parsing
- `lmdb` — embedded key-value store (default persisted DataStore on macOS / Linux)
- `@opentelemetry/*` — telemetry instrumentation (CloudWatch EMF export)
- `pino` — structured logging

## Testing

- Framework: **Vitest** (`vitest.config.ts`)
- Coverage runs automatically with `npm run test`; thresholds are enforced from `vitest.config.ts`
- Test layout mirrors `src/` under `tst/unit/`, `tst/integration/`, `tst/e2e/`
- Test fixtures in `tst/resources/`
- Shared test utilities in `tst/utils/`

## Commands

```bash
npm ci                       # Install dependencies
npm run build                # TypeScript compilation
npm run test                 # All tests + coverage
npm run lint                 # Lint (zero warnings)
npm run lint:fix             # Lint with auto-fix
npm run bundle               # Webpack bundle (development)
npm run bundle:alpha         # Webpack bundle (production, alpha env)
npm run debug-tree -- --file <template>   # Diagnose parse/context issues
npm run benchmark            # Measure syntax-tree and context-lookup latency
```
