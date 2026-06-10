# Architecture

## System Overview

The CloudFormation LSP is a multi-layer system: editor clients communicate with a TypeScript language server over JSON-RPC.

### LSP Layer (Language Clients)

| Component | Technology | Responsibilities |
|-----------|-----------|-----------------|
| VSCode Client | TypeScript | Launch server, forward editor events, render UI |
| JetBrains Client | Kotlin | Same as VSCode, different plugin framework |

The client sends JSON-RPC notifications (`didOpen`, `didChange`, `didClose`) and requests (`completion`, `hover`, `definition`) to the server over stdio or IPC.

### Server Layer (Language Server — TypeScript/Node.js)

The server uses a **Component-Handler** architecture with three pillars:

| Pillar | Role | Examples |
|--------|------|---------|
| **Handlers** | One per LSP request. Receives request, returns response. | CompletionRouter, HoverRouter, DefinitionProvider |
| **Components** | Internal state and logic. No I/O. | SyntaxTreeManager, ContextManager, SchemaStore, LMDBStore |
| **Services** | External I/O (network, disk, subprocess). | CfnLint (Pyodide), Auth, CFN API, Telemetry |

### Request Data Flow

1. User types in IDE → Client sends `textDocument/didChange`
2. Server updates AST via SyntaxTreeManager (tree-sitter incremental parse)
3. ContextManager rebuilds semantic model (entities, references)
4. If completion requested → CompletionRouter reads Context + Schema → returns suggestions
5. In parallel, DiagnosticCoordinator sends template to CfnLint worker → publishes diagnostics

## Core Components

### SyntaxTreeManager (`src/context/syntaxtree/`)

Parses YAML/JSON templates into a language-agnostic AST using **tree-sitter** (native Node.js N-API bindings).

- Maintains one AST per open file
- Incrementally re-parses only changed regions on `didChange`
- Error-tolerant: produces partial AST with ERROR nodes so completion/hover still work on valid portions

### ContextManager (`src/context/`)

Builds semantic understanding on top of the raw AST.

Data flow: `didChange` → SyntaxTreeManager → ContextManager → entity building → intrinsic resolution → logical ID reference finding

- `FileContextManager` — per-file state (resources, parameters, outputs, conditions, mappings)
- `EntityBuilder` (`src/context/semantic/`) — function module that walks AST and constructs typed Entity objects
- `IntrinsicContext` — resolves `Ref`, `Fn::GetAtt`, `Fn::Sub`, etc.
- `LogicalIdReferenceFinder` (`src/context/semantic/`) — function module providing reverse-reference map for go-to-definition

### SchemaStore (`src/schema/`)

CloudFormation resource type schemas (~1,200 types, ~50,000 properties).

- Downloads schema ZIP from CloudFormation Registry per region on first launch
- Stored in LMDB for persistence across editor restarts
- Background refresh checks for updates without blocking the user

### LMDBStore (`src/datastore/lmdb/`)

Fast persistent key-value storage (Lightning Memory-Mapped Database).

- Database file: `~/.cfn-lsp/lmdb/`
- Read operations are lock-free (MVCC)
- Write operations acquire exclusive lock — only one write transaction at a time
- `FileStoreFactory` (`src/datastore/`) + `KeyedFileStore` (`src/datastore/file/`) with `EncryptedFile`/`Encryption` for encrypted file-based storage on Windows or when `fileDb` feature flag is enabled

### CfnLint Service (`src/services/cfnLint/`)

Python linter running in Pyodide (WebAssembly) worker thread.

- No system Python required — Pyodide bundles Python 3.13 in WASM
- Wheel files in `assets/wheels/` (cfn-lint, boto3, deps)
- `PyodideWorkerManager` spawns worker, loads runtime, installs wheels
- Fallback: local wheels → CDN fetch → cfn-lint unavailable (schema-only validation)

### Auth Service (`src/auth/`)

- Credentials passed from client via `aws/credentials/iam/update` notification
- Stored in memory only (never persisted)
- Server sends `aws/credentials/iam/expired` on 401/403
- Supports: IAM Identity Center (SSO), IAM access keys, Builder ID

### Telemetry (`src/telemetry/`)

- OpenTelemetry metrics emitted as CloudWatch EMF
- Key metrics: `{Handler}.duration`, `{Handler}.fault`, `{Handler}.count`, `LMDB.{op}.duration`, `pyodide.init.success`, `worker.crash`
- Client-side telemetry is opt-in

## Handlers

Request handlers are registered in `CfnServer.ts` as functions (e.g., `completionHandler`, `hoverHandler`) backed by implementation classes:

| Implementation Class | LSP Method | Function |
|---------------------|-----------|----------|
| CompletionRouter | `textDocument/completion` | Context-aware autocomplete |
| HoverRouter | `textDocument/hover` | Documentation on hover |
| DefinitionProvider | `textDocument/definition` | Jump to definition |
| CodeActionService | `textDocument/codeAction` | Quick fixes |
| DocumentSymbolRouter | `textDocument/documentSymbol` | Template outline |
| CodeLensProvider | `textDocument/codeLens` | Inline stack actions |

**DiagnosticCoordinator** (`src/services/`) pushes diagnostics via `textDocument/publishDiagnostics` — it is not a request handler but a service that reacts to document changes and publishes results asynchronously.

### Online Handlers (require auth)

| Handler | LSP Method | Function |
|---------|-----------|----------|
| StackDeployment | `aws/cfn/stack/deployment/*` | Create/monitor deployments |
| StackValidation | `aws/cfn/stack/validation/*` | Pre-deployment validation |
| ChangeSetHandler | `aws/cfn/stack/changeSet/*` | Preview changes |
| ResourceList | `aws/cfn/resources/list` | Live resource autocomplete |
| StackEvents | `aws/cfn/stack/events` | Deployment timeline |

## Distribution

### Language Server

- **Repo:** https://github.com/aws-cloudformation/cloudformation-languageserver
- **Build:** webpack bundles into standalone `cfn-lsp-server-standalone.js`
- **Release:** GitHub Releases (v1.x.0 prod, v1.x.0-beta, v1.x.0-alpha)
- **Manifest:** `assets/release-manifest.json` tracks latest versions

### Clients

The language server is bundled with the [AWS Toolkit for VS Code](https://github.com/aws/aws-toolkit-vscode) and [AWS Toolkit for JetBrains](https://github.com/aws/aws-toolkit-jetbrains). See those repositories for client-specific build/test/contribution guides.

## Key Dependencies

| Dependency | Risk |
|-----------|------|
| Pyodide CDN (cdn.jsdelivr.net) | Blocked in some environments |
| CloudFormation Registry schemas | Schema changes can break validation |
| tree-sitter WASM | Parser bugs affect all features |
| AWS Toolkit VSCode extension | Client changes need coordination |
| AWS Toolkit JetBrains plugin | Client changes need coordination |
