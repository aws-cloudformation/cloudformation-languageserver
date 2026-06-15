# Architecture

## System Overview

The CloudFormation LSP is a multi-layer system. Editor clients (VSCode in TypeScript, JetBrains in Kotlin) launch
the language server and forward editor events over JSON-RPC. The client sends notifications (`didOpen`, `didChange`,
`didClose`) and requests (`completion`, `hover`, `definition`) over stdio or IPC.

## Server Architecture

The server uses a **Component-Handler** architecture with three pillars:

| Pillar         | Role                                                     | Examples                                                  |
|----------------|----------------------------------------------------------|-----------------------------------------------------------|
| **Handlers**   | One per LSP request. Receives request, returns response. | `completionHandler`, `hoverHandler`, `definitionHandler`  |
| **Components** | Internal state and logic. No external I/O.               | SyntaxTreeManager, ContextManager, SchemaStore, DataStore |
| **Services**   | External I/O (network, disk, subprocess).                | CfnLint, Guard, AwsCredentials, CFN API, Telemetry        |

### Request Data Flow

1. User types in IDE → Client sends `textDocument/didChange`.
2. Server updates AST via `SyntaxTreeManager` (tree-sitter incremental parse).
3. `ContextManager` resolves the AST node at the cursor into a `Context` object on demand.
4. If completion requested → `CompletionRouter` reads Context + Schema → returns suggestions.
5. In parallel, `DiagnosticCoordinator` merges diagnostics from cfn-lint and Guard, debounces (200 ms),
   then publishes `textDocument/publishDiagnostics`.

## Core Components

### SyntaxTreeManager (`src/context/syntaxtree/`)

Parses YAML/JSON templates into a language-agnostic AST using **tree-sitter**.

- One `SyntaxTree` per open file
- Incrementally re-parses only changed regions on `didChange`
- Error-tolerant: produces a partial AST with ERROR nodes so completion/hover still work on valid portions

### ContextManager (`src/context/`)

Builds semantic understanding on top of the raw AST. Resolves the cursor position into a `Context` (current node, path,
property path, entity root).

- `ContextManager.getContext(params)` → `Context | undefined` for cursor position
- `IntrinsicContext` resolves `Ref`, `Fn::GetAtt`, `Fn::Sub`, etc.
- `LogicalIdReferenceFinder` (`src/context/semantic/`) provides reverse-reference lookup for go-to-definition
- `EntityBuilder` (`src/context/semantic/`) walks the AST and constructs typed `Entity` objects

`FileContext` (`src/context/FileContext.ts`) holds per-file parsed sections (resources, parameters, outputs, conditions,
mappings) with lazy caching. `FileContextManager` is a thin factory that produces `FileContext` instances from the
`DocumentManager`.

### SchemaStore (`src/schema/`)

CloudFormation resource type schemas.

- Downloads schema ZIP from the CloudFormation Registry per region on first launch
- Persisted via the DataStore layer so schemas survive editor restarts
- Background refresh checks for updates without blocking the user
- Schema transformers in `src/schema/transformers/` apply common normalizations (remove read-only properties, add
  required write-only properties, etc.)

### DataStore (`src/datastore/`)

Persistent and in-memory key-value storage. The `DataStore` interface (`src/datastore/DataStore.ts`) has **three
implementations** selected at runtime:

| Implementation           | Module                         | Activation                                           |
|--------------------------|--------------------------------|------------------------------------------------------|
| **LMDB store** (default) | `src/datastore/lmdb/`          | All platforms by default (when not Windows / fileDb) |
| **File store**           | `src/datastore/file/`          | Windows OR `FileDb` feature flag enabled             |
| **Memory store**         | `src/datastore/MemoryStore.ts` | All non-persisted stores (e.g. `private_schemas`)    |

`MultiDataStoreFactoryProvider` (`src/datastore/DataStore.ts`) chooses LMDB vs File at startup based on platform and
feature flag, and pairs whichever persisted store is selected with `MemoryStoreFactory` for in-memory stores.

- LMDB is the default persisted store on macOS / Linux. Database directory: `<storage-root>/lmdb/v5/`.
- File store is the encrypted-file alternative used on Windows or when LMDB is disabled. Database directory:
  `<storage-root>/filedb/v3/`. One `.enc` file per key via `KeyedFileStore`.
- Memory store is used for `StoreName` values not in `PersistedStores` (currently `private_schemas`), so they are
  loaded fresh each session.

### CfnLint / Guard Services

`src/services/cfnLint/` and `src/services/guard/` produce diagnostics; both flow through `DiagnosticCoordinator`.

### DiagnosticCoordinator (`src/services/DiagnosticCoordinator.ts`)

Merges diagnostics from multiple sources (`cfn-lint`, `guard`, server-side validation) per URI and publishes the
combined result via `textDocument/publishDiagnostics`. Debounces publishing with a 200 ms `Delayer` to avoid
spamming the client during keystrokes. **Not** an LSP request handler — it is invoked by the diagnostic-producing
services.

### Auth Service (`src/auth/`)

- Client → server: `aws/credentials/iam/update` (request) provides credentials; `aws/credentials/iam/delete`
  (notification) clears them. Stored in memory only.
- Online features wrap their calls in `withOnlineGuard` (`src/utils/OnlineFeatureWrapper.ts`), which raises
  `OnlineFeatureErrorCode.ExpiredCredentials` when AWS calls return `ExpiredToken` / `ExpiredTokenException`.

### Telemetry (`src/telemetry/`)

OpenTelemetry metrics exported as CloudWatch EMF. Emit metrics through:

- `@Telemetry({ scope: 'Foo' })` and `@Track({ name: 'method' })` decorators in
  `src/telemetry/TelemetryDecorator.ts` — preferred for class methods.
- `ScopedTelemetry` helpers (`measure`, `measureAsync`, `trackExecution`, `countExecution`, …) — for inline closures
  the decorators can't reach. Each emits `{Name}.count`, `{Name}.fault`, and (for `measure*` / `trackExecution*`)
  `{Name}.duration`.

Client-side telemetry is opt-in via the `aws.telemetryEnabled` initialization option (default `false`).

## Handlers

Request handlers are registered in `CfnServer.ts` (`src/server/`) as functions backed by implementation classes:

| LSP Method                    | Handler function        | Implementation                                 |
|-------------------------------|-------------------------|------------------------------------------------|
| `textDocument/completion`     | `completionHandler`     | `CompletionRouter` (`src/autocomplete/`)       |
| `textDocument/hover`          | `hoverHandler`          | `HoverRouter` (`src/hover/`)                   |
| `textDocument/definition`     | `definitionHandler`     | `DefinitionProvider` (`src/definition/`)       |
| `textDocument/codeAction`     | `codeActionHandler`     | `CodeActionService` (`src/services/`)          |
| `textDocument/documentSymbol` | `documentSymbolHandler` | `DocumentSymbolRouter` (`src/documentSymbol/`) |
| `textDocument/codeLens`       | `codeLensHandler`       | `CodeLensProvider` (`src/codeLens/`)           |

`textDocument/publishDiagnostics` is **pushed** by `DiagnosticCoordinator` rather than served via a request handler.

### Online Handlers (require auth)

`StackHandler` (`aws/cfn/stack/*`), `ResourceHandler` (`aws/cfn/resources/*`), and the validation / change-set /
events workflows under `aws/cfn/stack/...` are wrapped with `withOnlineGuard` (`src/utils/OnlineFeatureWrapper.ts`),
which short-circuits when credentials are missing or expired.
