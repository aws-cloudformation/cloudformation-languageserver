Cloudformation LSP Architecture Overview

## What is Cloudformation LSP Project?

CloudFormation LSP project is a Language Server Protocol (LSP) implementation that provides intelligent editing, deployment, and troubleshooting capabilities for CloudFormation templates. It works with IDEs (VSCode, IntelliJ), CLI tools, or custom integrations.

## System Architecture

The system has two layers connected by the Language Server Protocol (LSP) over JSON-RPC:

**LSP Layer (Language Client)**

| Component | Technology | Responsibilities |
|-----------|-----------|-----------------|
| VSCode Client | TypeScript | Launch server, forward editor events, render UI |
| IntelliJ Client | Kotlin | Same as VSCode, different plugin framework |

The client sends JSON-RPC notifications (`didOpen`, `didChange`, `didClose`) and requests (`completion`, `hover`, `definition`) to the server over stdio or IPC.

**Server Layer (Language Server — TypeScript/Node.js)**

The server uses a **Component-Handler** architecture with three pillars:

| Pillar | Role | Examples |
|--------|------|---------|
| **Handlers** | One per LSP request. Receives request, returns response. | CompletionRouter, HoverRouter, DiagnosticHandler |
| **Components** | Internal state and logic. No I/O. | SyntaxTreeManager, ContextManager, SchemaStore, LMDBStore |
| **Services** | External I/O (network, disk, subprocess). | CfnLint (Pyodide), Auth, CFN API, Telemetry |

**Data flow for a typical request:**

- User types in IDE → Client sends `textDocument/didChange`
- Server updates AST via SyntaxTreeManager (tree-sitter incremental parse)
- ContextManager rebuilds semantic model (entities, references)
- If completion requested → CompletionRouter reads Context + Schema → returns suggestions
- In parallel, DiagnosticHandler sends template to CfnLint worker → publishes diagnostics

**Key Components:**

- **SyntaxTreeManager** — per-file AST cache (tree-sitter, error-tolerant)
- **SchemaStore** — CloudFormation resource type schemas (~1,200 types, backed by LMDB)
- **ContextManager** — semantic model (resources, parameters, references)
- **LMDBStore** — persistent key-value storage for schemas across editor restarts (default on Linux/macOS)
- **FileStore** — encrypted file-based persistence, used on Windows or when the `fileDb` feature flag is enabled (see `src/datastore/DataStore.ts` for selection logic)

**Key Services:**

- **CfnLint** — Python linter running in Pyodide (WebAssembly) worker thread
- **Auth Service** — credential management for online features
- **CFN Service** — CloudFormation and Cloud Control API proxy
- **Telemetry** — OpenTelemetry metrics

## Core Components

### 1. Syntax Tree & Indexer (`src/context/syntaxtree/`)

**What it does:** Parses YAML/JSON CloudFormation templates into a language-agnostic Abstract Syntax Tree (AST).

**How it works:**

- Uses **tree-sitter** (native C library via Node.js bindings) as the primary parser
- Falls back to **tree-sitter WASM** when native bindings are unavailable (e.g., some CI environments)
- `SyntaxTreeManager` maintains one AST per open file
- On every `textDocument/didChange` notification, the manager incrementally re-parses only the changed region
- After parsing, all downstream operations work on the same AST regardless of whether the source was JSON or YAML

**Key classes:**

- `SyntaxTreeManager` — owns the per-file AST cache, handles create/update/delete lifecycle
- `TreeSitterParser` — wraps tree-sitter with CloudFormation-specific node queries
- `NodeNavigator` — traverses AST nodes to find the cursor position's context (which resource, which property, which intrinsic function)

**Why tree-sitter:** Tree-sitter provides error-tolerant parsing. Users type incomplete templates constantly. A traditional parser would reject the file; tree-sitter produces a partial AST with ERROR nodes, so completion and hover still work on the valid portions.

### 2. Context & Semantic Model (`src/context/`)

**What it does:** Builds a semantic understanding of the template on top of the raw AST. Knows what resources exist, what parameters are defined, and how they reference each other.

**How it works:**

- `ContextManager` is the top-level coordinator. It listens for AST changes and rebuilds the semantic model.
- `FileContextManager` handles per-file state: the list of resources, parameters, outputs, conditions, and mappings.
- `EntityBuilder` walks the AST and constructs typed `Entity` objects for each template element. An Entity knows its logical ID, resource type, properties, and position in the file.
- `IntrinsicContext` resolves CloudFormation intrinsic functions (`Ref`, `Fn::GetAtt`, `Fn::Sub`, `Fn::Select`, etc.) to determine what value they produce and what they reference.
- `LogicalIdReferenceFinder` scans all entities to build a reverse-reference map: "which resources reference this logical ID?" This powers go-to-definition and find-all-references.

**Key data flow:**

- `didChange` → SyntaxTreeManager (AST update)
- → ContextManager (rebuild entities)
- → EntityBuilder (walk AST, produce Entity[])
- → IntrinsicContext (resolve references)
- → LogicalIdReferenceFinder (build reference map)

**Oncall relevance:** When users report "completion doesn't show my parameter" or "go-to-definition doesn't work," the issue is usually in the Context layer — either the AST has an ERROR node at the reference site, or EntityBuilder failed to parse a non-standard template structure.

### 3. Schema Store (`src/schema/`)

**What it does:** Stores CloudFormation resource type schemas (from the CloudFormation Registry). These schemas define every property's type, allowed values, required fields, and documentation URL.

**How it works:**

- On first launch, the server downloads the schema ZIP for the user's configured region from the CloudFormation Registry endpoint
- Schemas are parsed and stored in **LMDB** for persistence across editor restarts
- `SchemaStore` provides lookup by resource type (e.g., `AWS::Lambda::Function`) and returns the full property tree
- `SchemaResolver` handles `$ref` pointers within schemas (schemas reference shared definitions)
- Regional schemas differ — some resource types only exist in certain regions, and some properties are region-specific

**Schema refresh:** The server checks for schema updates periodically (configurable interval). When new schemas are available, it downloads the delta and updates LMDB. This runs in the background without blocking the user.

**Scale:** There are ~1,200 resource types with ~50,000 total properties across all regions. The full schema set is ~80MB uncompressed, ~8MB in LMDB.

### 4. LMDB Datastore (`src/datastore/lmdb/`)

**What it does:** Provides fast persistent key-value storage for schema data. Eliminates cold-start re-parsing of thousands of resource type schemas on every editor launch.

**How it works:**

- LMDB (Lightning Memory-Mapped Database) is a B-tree-based embedded database that memory-maps its data file
- `LMDBStore` wraps the `lmdb-js` npm package with CloudFormation-specific operations (get schema, put schema, list types)
- `LMDBStoreFactory` manages the database lifecycle: open, close, reopen after corruption
- The database file lives in the user's home directory (`~/.cfn-lsp/lmdb/`)
- Read operations are lock-free (MVCC) — multiple concurrent reads don't block each other
- Write operations acquire an exclusive lock — only one write transaction at a time

**Operational metrics:**

- `LMDB.public_schemas.get.duration` — read latency
- `LMDB.public_schemas.get.fault` — read failures (should be 0 in steady state)
- `LMDB.public_schemas.put.duration` — write latency (only during schema refresh)

### 5. CfnLint Service (`src/services/cfnLint/`)

**What it does:** Runs cfn-lint (Python-based CloudFormation linter) inside a Pyodide WebAssembly worker thread. Provides deep validation beyond what schema checking alone can catch.

**How it works:**

- **Pyodide** is a Python interpreter compiled to WebAssembly. It runs Python code inside Node.js without requiring a system Python installation.
- `PyodideWorkerManager` spawns a Web Worker thread, loads the Pyodide runtime, and installs cfn-lint from bundled wheel files
- Wheel files (`.whl`) for cfn-lint, boto3, and dependencies are committed to `assets/wheels/` in the repo
- The worker exposes a `validate(template)` function that returns cfn-lint rule violations
- Results are mapped to LSP Diagnostic objects and published to the client

**Initialization sequence:**

1. Worker thread starts
2. Load Pyodide runtime (Python 3.13 WASM)
3. Load micropip (Python package installer for Pyodide)
4. Install cfn-lint from local wheels (no network needed)
5. Import cfn-lint module
6. Ready to accept validate() calls

**Fallback chain for wheels:** Local wheels in `assets/wheels/` (primary) → CDN fetch from cdn.jsdelivr.net (fallback, blocked in some environments) → Error (cfn-lint unavailable, diagnostics degrade to schema-only)

**Why Pyodide instead of subprocess:** Users don't need Python installed. The server is a single Node.js binary. Pyodide adds ~30MB to the bundle but eliminates the "install Python 3.9+" prerequisite.

**Performance:** First validation has a Pyodide cold start penalty. Subsequent validations are fast as the worker stays warm. See `src/services/cfnLint/` for current implementation details.

### 6. Auth Service (`src/auth/`)

**What it does:** Manages AWS credentials for online features (deployment, resource listing, stack operations).

**How it works:**

- The language client (VSCode/IntelliJ) handles the actual credential acquisition (IAM Identity Center login, credential file reading, etc.)
- Credentials are passed to the server via the `aws/credentials/iam/update` LSP notification
- The server stores credentials in memory (never persisted to disk)
- All AWS SDK calls use these credentials via a custom credential provider
- Credentials expire and must be refreshed by the client — the server sends `aws/credentials/iam/expired` when a call fails with 401/403

**Supported credential types:** IAM Identity Center (SSO), IAM access keys, Builder ID

### 7. CFN/API Service (`src/stacks/`, `src/resourceState/`)

**What it does:** Proxies CloudFormation and Cloud Control API calls for online features.

**Stack operations (`src/stacks/`):**

- `DescribeStacks` — list stacks in the user's account/region
- `CreateChangeSet` / `ExecuteChangeSet` — deploy templates
- `DescribeStackEvents` — show deployment timeline
- `GetTemplate` — retrieve deployed template for comparison
- `ValidateTemplate` — server-side validation (Beacon)

**Resource state (`src/resourceState/`):**

- `ListResources` (Cloud Control API) — browse resources by type for autocomplete
- `GetResource` — fetch live resource properties for drift detection
- Powers "resource-aware autocomplete" — when typing `!Ref`, suggest actual resource IDs from the account

**Rate limiting:** The server throttles API calls to avoid hitting CloudFormation rate limits. See `src/auth/` for current refresh intervals and cache TTLs.

### 8. Telemetry Service (`src/telemetry/`)

**What it does:** Emits OpenTelemetry metrics for monitoring server health in production.

**How it works:**

- `ScopedTelemetry.executeWithMetrics()` wraps any operation with duration and fault metrics
- Metrics are emitted as CloudWatch EMF (Embedded Metric Format)
- Client-side telemetry is opt-in — users must accept the telemetry prompt

**Key metrics:** `{Handler}.duration` (response time), `{Handler}.fault` (unhandled exception), `LMDB.{op}.duration` (database latency), `LMDB.{op}.fault` (database failure), `pyodide.init.success` / `worker.crash` (cfn-lint health)

## Handlers (LSP Capabilities)

Each handler maps to exactly one LSP request:

| Handler | LSP Method | Function |
|---------|-----------|----------|
| CompletionRouter | `textDocument/completion` | Context-aware autocomplete |
| HoverRouter | `textDocument/hover` | Documentation on hover |
| DefinitionHandler | `textDocument/definition` | Jump to definition (Ref/GetAtt) |
| DiagnosticHandler | `textDocument/publishDiagnostics` | Real-time validation |
| DocumentSymbolHandler | `textDocument/documentSymbol` | Template outline |
| CodeActionHandler | `textDocument/codeAction` | Quick fixes |
| FormattingHandler | `textDocument/formatting` | Template formatting |
| CodeLensProvider | `textDocument/codeLens` | Inline stack actions |

### Online/Deployment Handlers (require auth)

| Handler | LSP Method | Function |
|---------|-----------|----------|
| StackDeployment | `aws/cfn/stack/deployment/*` | Create/monitor deployments |
| StackValidation | `aws/cfn/stack/validation/*` | Pre-deployment validation (Beacon) |
| ChangeSetHandler | `aws/cfn/stack/changeSet/*` | Preview changes |
| ResourceList | `aws/cfn/resources/list` | Live resource autocomplete |
| StackEvents | `aws/cfn/stack/events` | Deployment timeline |

## Distribution & Release

### Language Server (cloudformation-languageserver)

- **Repo:** https://github.com/aws-cloudformation/cloudformation-languageserver (public, open-source)
- **Build:** webpack bundles into standalone `cfn-lsp-server-standalone.js`
- **Release:** GitHub Releases with tags (v1.x.0 prod, v1.x.0-beta, v1.x.0-alpha)
- **Release manifest:** `assets/release-manifest.json` tracks latest versions
- **Maintenance:** Daily GitHub Actions workflow updates wheel dependencies

### Language Clients

**VSCode Client:**

- **Repo:** https://github.com/aws/aws-toolkit-vscode
- **Path:** `packages/core/src/awsService/cloudformation/`
- **Language:** TypeScript
- **Modules:** lsp-server (server lifecycle), auth, commands, stacks, resources, codelens, explorer, documents, artifacts, cfn-init, relatedResources, ui, utils
- **Distribution:** Bundled inside AWS Toolkit VSCode extension (2.8M+ downloads)

**JetBrains Client:**

- **Repo:** https://github.com/aws/aws-toolkit-jetbrains (team fork: https://github.com/chrisqm-dev/aws-toolkit-jetbrains)
- **Path:** `plugins/toolkit/jetbrains-core/src/software/aws/toolkits/jetbrains/services/cloudformation/`
- **Language:** Kotlin
- **Modules:** actions, resources, stack, toolwindow, yaml
- **Key files:** CloudFormation.kt, CloudFormationTemplate.kt, CloudFormationTemplateIndex.kt, IndexedResources.kt, Resources.kt
- **Distribution:** Bundled inside AWS Toolkit for JetBrains plugin (all JetBrains IDEs 2023.3+)

## Key Operational Knowledge

### Telemetry Metrics

Key metrics to monitor:

- `LMDB.public_schemas.get.fault` — LMDB read failures
- `LMDB.public_schemas.get.duration` — LMDB read latency (max)
- `HoverRouter.duration` — hover response time
- `ValidationWorkflow.duration` — validation pipeline latency
- `pyodide.init.success` / `worker.crash` — cfn-lint health

### Dependencies

| Dependency | Owner | Risk |
|-----------|-------|------|
| Pyodide CDN (cdn.jsdelivr.net) | External | Blocked in some environments |
| CloudFormation Registry schemas | CFN team | Schema changes can break validation |
| tree-sitter WASM | Open source | Parser bugs affect all features |
| AWS Toolkit VSCode extension | Toolkit team | Client-side changes need coordination |
| AWS Toolkit JetBrains plugin | Toolkit team | Client-side changes need coordination |

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Server language | TypeScript | Leverage AWS LSP framework, team expertise |
| Future server | Kotlin + GraalVM | Performance, native binaries, cfn-lint via GraalPy |
| Persistence | LMDB | Fast key-value store, survives editor restarts |
| cfn-lint integration | Pyodide (WASM) | No Python dependency for users, cross-platform |
| Distribution | Bundled in AWS Toolkit | Single install, no separate extension |
| Architecture | Component-Handler model | Unified state, no AwsLanguageService limitations |

## Project Structure (cloudformation-languageserver)

- `src/app/` — Entry points (standalone.ts, initialize.ts)
- `src/autocomplete/` — Completion providers (resource, property, intrinsic)
- `src/context/` — Semantic model (AST, entities, intrinsics)
- `src/datastore/` — LMDB persistence layer
- `src/handlers/` — LSP request handlers
- `src/hover/` — Hover documentation
- `src/schema/` — CloudFormation type schemas
- `src/services/` — External services (cfnLint, guard, auth)
- `src/stacks/` — Stack operations (deploy, changeset, events)
- `src/telemetry/` — OpenTelemetry metrics
- `src/server/` — LSP server setup
- `assets/wheels/` — Bundled Python wheels for Pyodide
- `tools/download-wheels.ts` — Wheel download script
- `webpack.config.js` — Bundles into standalone server
- `.github/workflows/release.yml` — Build + publish releases
- `.github/workflows/maintenance.yml` — Daily wheel updates
