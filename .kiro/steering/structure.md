# Project Structure

Source is organized **by feature**, not by architectural layer. Tests mirror the source tree under `tst/`.

## Source (`src/`)

### Entry points

- `src/app/` — `standalone.ts` (CLI entry), `initialize.ts`, polyfills
- `src/server/` — `CfnServer` wires LSP handlers to components; `CfnInfraCore` constructs the dependency graph

### LSP request handlers

These wrap implementation classes and are registered in `CfnServer.ts`:

- `src/handlers/` — Thin handler functions (one per LSP request)
- `src/protocol/` — LSP protocol extensions and request/notification type definitions
  (`AuthProtocol`, `LspStackHandlers`, `LspResourceHandlers`, etc.)

### Feature implementations

- `src/autocomplete/` — `CompletionRouter` + per-position completion providers
- `src/hover/` — `HoverRouter` + per-position hover providers
- `src/definition/` — `DefinitionProvider` (go-to-definition)
- `src/codeLens/` — CodeLens providers (validate / deploy / open stack template)
- `src/documentSymbol/` — `DocumentSymbolRouter` (outline view)
- `src/relatedResources/` — Related-resource snippet insertion

### Semantic model

- `src/context/` — Cursor context, intrinsic resolution, file-level entity index
  (`ContextManager`, `FileContext`, `IntrinsicContext`)
- `src/context/syntaxtree/` — `SyntaxTreeManager`, `SyntaxTree`, tree-sitter grammars
- `src/context/semantic/` — `EntityBuilder`, `LogicalIdReferenceFinder`

### Schema, validation, and services

- `src/schema/` — CloudFormation type schemas, regional/SAM/private schema sources, transformers
- `src/services/cfnLint/` — `cfn-lint` integration
- `src/services/guard/` — `cfn-guard` integration
- `src/services/extractToParameter/` — "Extract to parameter" refactor
- `src/services/DiagnosticCoordinator.ts` — Merges diagnostics from all sources, debounces publish
- `src/services/CodeActionService.ts` — Quick fixes, refactors, related-resource insertions

### Persistence

- `src/datastore/` — Pluggable `DataStore` interface with three implementations:
    - `src/datastore/lmdb/` — Default persisted store on macOS / Linux
    - `src/datastore/file/` — Encrypted-file-per-key store; default on Windows or when `FileDb`
      feature flag is enabled
    - `src/datastore/MemoryStore.ts` — In-memory, used for non-persisted stores
- `src/utils/Storage.ts` — Resolves platform-specific storage root

### Online features (require AWS credentials)

- `src/auth/` — Credential receipt and storage
- `src/stacks/` — Stack list/describe/deploy, change sets, events
- `src/resourceState/` — Cloud Control API resource state, IaC import
- `src/s3/`, `src/artifacts/`, `src/artifactexporter/` — Template artifact upload to S3

### Cross-cutting

- `src/document/` — `DocumentManager`, YAML/JSON parsers
- `src/settings/` — Settings parsing and subscription
- `src/featureFlag/` — Local + dynamic feature flags (e.g. `FileDb`)
- `src/cfnEnvironments/` — Multi-environment template parsing
- `src/telemetry/` — `ScopedTelemetry`, `@Telemetry` / `@Track` decorators, OpenTelemetry export
- `src/usageTracker/` — Anonymous usage metrics
- `src/utils/` — Shared utilities (paths, retries, fault suppression, AWS error mapping, etc.)

## Tests (`tst/`)

Tests mirror the source structure:

- `tst/unit/` — Unit tests (Vitest)
- `tst/integration/` — Integration tests (autocomplete, context, hover, goto, diagnostics)
- `tst/e2e/` — End-to-end LSP tests
- `tst/resources/` — Test fixtures (templates, schemas, private schemas, guard rules)
- `tst/utils/` — Shared test utilities (`MockServerComponents`, `TemplateBuilder`, `MockContext`, etc.)

## Tooling (`tools/`)

- `tools/debug_tree.ts` — Diagnostic tool for parse/context issues (`npm run debug-tree`)
- `tools/benchmark.ts` — Latency benchmark (`npm run benchmark`)
- `tools/lspClient/` — Minimal LSP client used by tooling
- `tools/generate-release-manifest.ts`, `tools/generate-attribution.ts` — Release helpers

## Conventions

- **Reuse utils before writing new code.** Search `src/utils/` for shared source-side helpers and `tst/utils/` for
  shared test helpers (e.g., `MockServerComponents`, `TemplateBuilder`, `MockContext`, `Expect`, `SchemaUtils`)
  before introducing a new helper of your own.
- If you write a helper that could be reused, lift it into the appropriate `utils/` directory rather than leaving it
  in a feature folder.
- New handlers go in their own feature directory under `src/`
- Tests for a feature live in the same relative path under `tst/unit/` or `tst/integration/`
