# Project Structure

Source is organized by feature, NOT by architectural layer.

## Source (`src/`)

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

## Tests (`tst/`)

Tests mirror the source structure:
- `tst/unit/` — Unit tests (Vitest)
- `tst/integration/` — Integration tests
- `tst/e2e/` — End-to-end tests
- `tst/resources/` — Test fixtures
- `tst/utils/` — Test utilities

## Conventions

- Before writing new code, check `src/utils/` and `tst/utils/` for existing reusable methods
- If you write a method that could be reused, move it to the appropriate utils file
- New handlers go in their own feature directory under `src/`
- Tests for a feature live in the same relative path under `tst/unit/` or `tst/integration/`
