# Technology Stack

## Language & Runtime

- **TypeScript** on Node.js
- Strict mode enabled, CommonJS modules
- Target: Node 22+ (`^22.15.0`)

## Build & Tooling

- **npm** — package manager
- **Vitest** — test framework (unit + integration), coverage built-in
- **ESLint** — linting
- **Webpack** — bundling for distribution (`bundle:alpha`, `bundle:beta`, `bundle:prod`)
- **tree-sitter** — fast syntax parsing for JSON and YAML

## Key Libraries

- `vscode-languageserver` / `vscode-languageserver-protocol` — LSP implementation
- `lmdb` — embedded key-value store for schema caching and persistence
- `pyodide` — Python runtime in WebAssembly (runs cfn-lint)
- `@opentelemetry/*` — telemetry instrumentation

## Architecture Pattern

**Component-Handler** architecture:
- **Handlers** — one per LSP request (completion, hover, definition, diagnostics)
- **Components** — internal state/logic (SyntaxTreeManager, ContextManager, SchemaStore, LMDBStore)
- **Services** — external I/O (CfnLint/Pyodide, Auth, CFN API, Telemetry)

## Testing

- Framework: Vitest
- Coverage runs automatically with `npm run test` (`coverage.enabled: true` in `vitest.config.ts`)
- Coverage thresholds: 88% statements, 82% branches, 90% functions, 88% lines
- Test structure mirrors `src/` under `tst/unit/`, `tst/integration/`, `tst/e2e/`
- Test fixtures in `tst/resources/`

## Commands

```bash
npm ci                    # Install dependencies
npm run build             # TypeScript compilation
npm run test              # Unit tests + coverage
npm run lint -- --fix     # Lint and auto-fix
npm run bundle:alpha      # Webpack bundle (alpha)
npm run bundle:beta       # Webpack bundle (beta)
npm run bundle:prod       # Webpack bundle (production)
npm run debug-tree -- --file <template>   # Diagnose parse/context issues
npm run benchmark         # Measure syntax-tree and context-lookup latency
npm run test:stability    # Long-running stability tests
```
