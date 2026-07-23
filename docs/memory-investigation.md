# CloudFormation Language Server Memory Investigation

**Issue:** [aws/aws-toolkit-jetbrains#6380](https://github.com/aws/aws-toolkit-jetbrains/issues/6380)  
**Date:** 2026-07-06  
**Status:** Investigation Complete

## Summary

The CloudFormation Language Server consumes approximately **500MB of RAM per IDE instance**. Each IDE instance spawns a separate Node.js process running the LSP server, meaning users with multiple IDE windows accumulate memory usage linearly (e.g., 5 windows = 2.5GB).

## Implementation Status (updated July 22, 2026, 5:00 PM)

Verified state of this workspace (all changes currently **uncommitted** across the three repos). An earlier revision of this doc claimed the credential sync fixes were implemented on July 21 — that work was not present in this workspace and was (re-)implemented on July 22.

### Completed

| Item | Status | Verification |
|------|--------|--------------|
| Option 0: `enabled` check in `CfnLintService.initialize()` (+ `mountFolder` guard) | ✅ July 22 | Unit suite passes |
| Memory caps: `--max-old-space-size=384` both clients (server process; proxy capped at 128) + worker `resourceLimits: 128MB` | ✅ July 23 (lowered from 512 per profiling-data headroom) | Unit suite passes; clients compile/typecheck |
| Orphan fix: stdin EOF exit + 5s shutdown timeout in `standalone.ts` | ✅ July 22 | tsc; manual multi-window re-test pending |
| Cred sync Gap 1 (identity-change refresh, JetBrains) | ✅ July 22 | `CfnCredentialsServiceTest` 5/5 pass |
| Cred sync Gap 2 (`iam/delete` on unavailable, both clients + JB protocol plumbing) | ✅ July 22 | JB tests pass; VS Code core tsc clean |
| Cred sync Gap 3 (server keeps prior creds on failed update; client retry + warn) | ✅ July 22 | Server + JB tests pass |
| Cred sync Gap 4 (VS Code region source of truth) | ✅ Closed | Working as intended (see notes) |
| Cred sync Gap 5 (per-window encryption keys vs shared server) | ✅ July 22 | Proxy-owned key + re-encryption in `cfn-lsp-proxy.ts` |
| Phase 3 proxy: contract-compliant `cfn-lsp-proxy.ts` (D1–D9) + `cfn-lsp-proxy-client.ts` | ✅ July 22 | 14 routing unit tests pass |
| Proxy wired into webpack bundle entries | ✅ July 22 | — |
| `aws/proxy/credentialsChanged` handlers in both clients | ✅ July 22 | JB compile; VS Code tsc |
| Shared-server client integration (lock-file coordination, socket transport, fallback) | ✅ (pre-existing, verified July 22) | JB compile; VS Code tsc |
| Shared server default **off** in both clients | ✅ July 22 | Pending validation plan before default-on |
| `MemoryMonitor` — RSS watchdog (whole process incl. Pyodide WASM): worker restart at soft limit (1200MB), exit-and-respawn at hard limit (1600MB) | ⚠️ Implemented but **excluded from CR 1** (July 23: no auto-restarts in this PR); uncommitted, pending observe-only-vs-drop decision | Unit tests pass |
| `MemoryMonitor` — V8 heap stage (non-Pyodide pool): schema-cache reclaim at 85% of the V8 limit, graceful exit at 95% before the OOM abort | ⚠️ Same as above | Unit tests pass |
| `CfnLintService.restartWorker()` memory-reclaim path (lazy Pyodide reload + folder remount) | ⚠️ Excluded from CR 1 with the watchdog (its only caller); uncommitted | 3 unit tests pass |
| Local-server dev override `__CLOUDFORMATIONLSP_PATH` (JetBrains added; VS Code pre-existing) + install runbooks | ✅ July 22 | `docs/runbook-{jetbrains,vscode}-local-install.md` |

### Verification summary (July 22)

- **Server:** `tsc -b` clean; full vitest unit suite **3592/3592** (Node 20.20.2 — the earlier "vite needs ≥20.19" blocker is obsolete)
- **JetBrains:** `compileKotlin` + `compileTestKotlin` pass; `CfnCredentialsServiceTest` 5/5
- **VS Code:** deps installed; `packages/core` `tsc --noEmit` clean (covers the shared-server integration and cred-sync changes)

### What's Left

In priority order:

| # | Item | Scope | Notes |
|---|------|-------|-------|
| 1 | **CR 1: memory optimizations only** (new branch off `main`, no multiplexing) — see "Staged delivery plan" below | Server repo first | ✅ Branch `perf/memory-limits`, commit `c2d26f1` (4 files: enabled fix, worker resourceLimits, orphan fix + tests; verified standalone: lint + tsc + 3560 tests). **Watchdog excluded by decision (July 23)** — kept uncommitted pending observe-only-vs-drop decision. PR to be opened by chrisqm |
| 2 | **Multiplexing validation plan** (multi-window offline/online/lifecycle/stress — see Correctness Review) | Manual, both IDEs | **Gate for enabling shared server by default.** Use the local-install runbooks in `docs/` to set up patched IDEs |
| 3 | **Master enable/disable toggle** (Phase 2 item 5 — what the GitHub issue user asked for) | Both clients, small | `aws.cloudformation.enabled` (VS Code) + `isEnabled` in `CfnLspSettings` (JetBrains) with startup guards |
| 4 | **Manual re-test of the orphan fix** on patched bits (2 windows, settings-change restarts, check `ps`) | Manual | Fix is in and unit-verified; field scenario unconfirmed |
| 5 | **Memory profiling plan** (this doc, "Profiling plan" section) to confirm the cap/threshold values: 512MB heap, 128MB worker, 1200/1600MB RSS, 85/95% heap | Server, instrumentation | Pass criteria: p100 usage < 60% of each cap on the trial matrix |
| 6 | **Remaining CRs** (cred sync, multiplexing) per the staged delivery plan | All three repos | Everything is currently uncommitted |
| 7 | **VS Code unit tests for `credentials.ts`** (retry/delete paths are typecheck-only today) | VS Code | JetBrains + server equivalents have coverage |
| 8 | **On-demand schema loading** (Phase 3 item 7, 30-80MB potential) | Server, medium | Lowest priority; partially mitigated by the heap-stage cache reclaim |

### Staged delivery plan

Ship the work as focused, independently reviewable CRs instead of one entangled change:

**CR 1 — Memory optimizations (server repo, branch `perf/memory-limits`, commit `c2d26f1`):**
- `src/app/standalone.ts` — orphan fix (stdin EOF exit + shutdown timeout)
- `src/services/cfnLint/CfnLintService.ts` — `enabled` check + `mountFolder` guard
- `src/services/cfnLint/PyodideWorkerManager.ts` — worker `resourceLimits`
- Tests: `PyodideWorkerManager.test.ts`
- Excluded: `cfn-lsp-proxy*.ts`, `tst/unit/app/`, `webpack.config.js` (proxy entries), `AwsCredentials.ts` (+ test — cred sync, not memory), and the **`MemoryMonitor` watchdog + `restartWorker()`** (July 23 decision: no automatic restarts in this PR; watchdog kept uncommitted pending an observe-only-vs-drop decision)

**CR 2 — Credential sync fixes (server + both clients):** `AwsCredentials.ts` Gap 3 + JetBrains/VS Code Gap 1-3 client changes. Independent of both memory and multiplexing (the `aws/proxy/credentialsChanged` handlers ride with CR 3).

**CR 3 — Shared-server multiplexing (server + both clients):** proxy + proxy-client, webpack entries, client shared-server integration, `credentialsChanged` handlers, settings (default off). Gated on the validation plan.

**Client memory caps (`NODE_OPTIONS=--max-old-space-size=512`):** currently entangled with the shared-server hunks in `CfnLspServerSupportProvider.kt` / `extension.ts`; extract into CR 1-sized client changes or fold into CR 3 (decision pending).

Note: the full server unit suite now runs on this host (Node 20.20.2 ≥ vite's 20.19 floor) — the earlier "cannot run on this host" note is obsolete.


## Root Cause Analysis

### Critical Finding: Pyodide Loads Even When Disabled! 🐛

**The `cfnLint.enabled = false` setting does NOT prevent Pyodide from loading.**

In `src/handlers/Initialize.ts`:
```typescript
components.settingsManager
    .syncConfiguration()
    .then(() => {
        components.schemaRetriever.initialize();
        return components.cfnLintService.initialize();  // <-- No enabled check!
    })
```

And `CfnLintService.initialize()` has no check for `settings.enabled`:
```typescript
public async initialize(): Promise<void> {
    if (this.status !== STATUS.Uninitialized) {  // Only checks status, not enabled!
        return;
    }
    // ... proceeds to load Pyodide
}
```

**This means users who disable cfn-lint are still paying the ~250-300MB memory cost!**

### Memory Breakdown by Component

| Component | Memory Usage | % of Total | Notes |
|-----------|-------------|------------|-------|
| **Pyodide (Python WASM)** | 200-300MB | ~50% | cfn-lint runs Python via WebAssembly |
| **CloudFormation Schemas** | 50-150MB | ~20% | 1000+ resource type schemas |
| **Node.js V8 Baseline** | 50-80MB | ~15% | Base heap overhead |
| **cfn-guard WASM** | 20-30MB | ~5% | Guard rules engine (Rust→WASM) |
| **Tree-sitter Parsers** | 10-20MB | ~5% | JSON/YAML AST parsing |
| **Other (buffers, caches)** | 20-50MB | ~5% | Document cache, misc |
| **Total** | **350-580MB** | 100% | Matches reported ~500MB |

### Primary Culprit: Pyodide

**Pyodide is responsible for approximately 50% of the memory usage.**

Pyodide is a Python runtime compiled to WebAssembly that runs inside the Node.js process. It's used to execute `cfn-lint`, the CloudFormation linting tool written in Python.

From `src/services/cfnLint/pyodide-worker.ts`:
```typescript
const pyodide = await loadPyodide({
    indexURL: pyodideBundlePath,
});
await pyodide.loadPackage('micropip');
// ... loads cfn-lint and its dependencies into WASM memory
```

The Python WASM runtime includes:
- Full Python interpreter (~50MB)
- cfn-lint package and dependencies (~30MB)
- Python stdlib modules (~20MB)
- WASM linear memory overhead (~100-150MB for heap)

### Secondary Culprit: CloudFormation Schemas

The server downloads and caches CloudFormation resource type schemas for autocompletion and validation. With 1000+ AWS resource types, each with detailed property schemas, this adds 50-150MB depending on how many regions are loaded.

From `src/schema/SchemaStore.ts` and `src/schema/SchemaRetriever.ts`:
- Schemas are downloaded per-region on first use
- Cached in LMDB (macOS/Linux) or encrypted files (Windows)
- Loaded into memory for fast lookup during editing

## Why Sharing a Single Server Requires Work

The LSP protocol's default architecture is one-server-per-client, but sharing is **feasible within the same IDE family** with a multiplexing proxy layer:

1. **Session state is per-connection** — The `vscode-languageserver` library's `createConnection()` creates a single connection. However, the actual server state (documents, schemas, Pyodide) is **already URI-keyed and multi-workspace-ready** — `LspWorkspace` supports dynamic workspace folder additions via `workspace/didChangeWorkspaceFolders`.

2. **Document URIs rarely conflict within same user** — Different project windows typically work on different files. Same-file-in-multiple-windows (same user) is an edge case where last-write-wins is acceptable.

3. **Credentials are per-session but same-user** — `AwsCredentials` stores one set, but within the same IDE family it's the same user with the same AWS profile. Credential updates propagating to all windows is actually *better* behavior.

4. **LSP lacks native client multiplexing** — The protocol has no built-in "client ID", but a thin proxy layer between the socket and the `Connection` object can handle this. Each client gets its own LSP initialize handshake routed through the proxy.

**Bottom line:** Cross-IDE sharing (JetBrains + VS Code → single server) is not feasible due to different client capabilities and the single-connection architecture. Same-IDE-family sharing is feasible with a multiplexing proxy — this is a production-proven pattern used by [`ra-multiplex`/`lspmux`](https://github.com/pr2502/ra-multiplex) (518 ⭐, Homebrew-installable) for rust-analyzer.

> ⚠️ **Important correction:** JetBrains windows opened as separate instances ("Open in New Window") are **separate JVM processes** with their own memory. `@Service(Service.Level.APP)` is only a singleton within one JVM/window, NOT across all windows. This means JetBrains requires the same proxy/daemon approach as VS Code — both need an external multiplexing process that IDE windows connect to.

See Option 6 and Web Research Validation sections for full analysis.

## Proposed Solutions

### Option 0: Fix the Bug — Respect `enabled` Setting (Trivial Fix!) ⭐⭐⭐

**This is a one-line fix that should be done immediately.**

Add an `enabled` check at the top of `CfnLintService.initialize()`:

```typescript
public async initialize(): Promise<void> {
    if (!this.settings.enabled) {
        this.status = STATUS.Initialized;  // Mark as "ready" but skip Pyodide
        return;
    }
    
    if (this.status !== STATUS.Uninitialized) {
        return;
    }
    // ... rest of method unchanged
}
```

| Pros | Cons |
|------|------|
| **One line change** | Only helps users who disable cfn-lint |
| Saves ~250MB for users with `cfnLint.enabled = false` | Users who want linting still pay full cost |
| No behavioral changes for users who want linting | |
| Zero risk | |

**This fix should be merged immediately, independent of other optimizations.**

### Option 1: Apply Node.js Memory Limits (Low Effort, High Impact)

Add `--max-old-space-size` to cap the V8 heap per instance.

**JetBrains Client** — `CfnLspServerSupportProvider.kt`:
```kotlin
private fun createCommandLine(): GeneralCommandLine {
    return GeneralCommandLine(nodePath, serverPath, "--stdio")
        .withEnvironment("NODE_OPTIONS", "--max-old-space-size=384")
}
```

**VS Code Client** — `extension.ts`:
```typescript
const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc, options: { 
        env: { NODE_OPTIONS: '--max-old-space-size=384' }
    }},
    // ...
};
```

| Pros | Cons |
|------|------|
| Simple to implement | Doesn't reduce actual memory needs |
| Prevents unbounded growth | May cause OOM crashes under heavy use |
| Works immediately | Pyodide alone may exceed 384MB |

**Recommended limit:** 384-512MB (allows headroom above Pyodide baseline)

#### The Three Memory Pools (why one flag can't cap this server)

The server's memory splits across three pools with **different capping mechanisms** — this is why `--max-old-space-size` alone cannot bound the process:

| Pool | Contents | Typical size | Capped by |
|------|----------|-------------|-----------|
| Main-thread V8 heap | Schemas, documents, syntax trees, LSP state | ~100-200MB | `--max-old-space-size` (NODE_OPTIONS) |
| Worker-thread V8 heap | Pyodide JS glue, lint results marshalling | tens of MB | `resourceLimits: { maxOldGenerationSizeMb }` on the `new Worker()` call — **NOT** inherited from NODE_OPTIONS |
| WASM linear memory | Python interpreter + cfn-lint + its deps (Pyodide) | ~200-300MB | **Nothing in V8.** WASM linear memory is allocated outside the V8 heap; only OS-level limits (cgroups/ulimit) or Pyodide-level configuration could bound it |

Consequences:

1. `--max-old-space-size=512` on the main process bounds LSP-state growth (big templates, schema accumulation) but does **not** touch the Pyodide baseline. Don't expect the RSS to drop — this flag is a *runaway-growth guard*, not a reduction.
2. The Pyodide worker is created in `PyodideWorkerManager.ts` (`new Worker(workerPath)` — currently with **no** `resourceLimits`). Add `resourceLimits: { maxOldGenerationSizeMb: 128 }` there; a worker that exceeds it gets terminated and can be restarted cleanly, which converts a leak into a recoverable event.
3. The ~200-300MB WASM pool is effectively uncappable in-process. The only levers are not loading Pyodide at all (the `enabled` bug fix / disable toggle) or sharing it across windows (Phase 3).

#### Whole-process enforcement: the RSS watchdog (implemented July 22, 2026)

Hard OS-level limits on the full process tree are **not portably available**: macOS's kernel does not enforce RSS ulimits, `RLIMIT_AS` breaks WASM (Emscripten reserves multi-GB virtual address ranges up front), and cgroups (Linux) / Job Objects (Windows) are not reachable from the IDE spawn paths. However, the Pyodide worker is a **thread in the server process**, so all three pools — main heap, worker heap, and WASM linear memory — show up in one process's RSS. That makes in-process self-enforcement effective:

`src/services/MemoryMonitor.ts` samples `process.memoryUsage().rss` every 30s (unref'd timer, started from the initialized handler) with a staged policy:

1. **Soft limit** (default 1200MB, `CFN_LSP_MEMORY_SOFT_LIMIT_MB`, 0 disables): call `CfnLintService.restartWorker()` — terminates the Pyodide worker, freeing its JS heap AND the WASM pool. The service returns to Uninitialized; the next lint request lazily reloads Pyodide and remounts folders (existing queue + `ensureInitialized` machinery). Cooldown of 5 minutes prevents restart thrash.
2. **Hard limit** (default 1600MB, `CFN_LSP_MEMORY_HARD_LIMIT_MB`, 0 disables): force a worker restart immediately; if RSS stays over the hard limit for 3 consecutive checks, `process.exit(1)` — the IDE client respawns a fresh server (clean thanks to the orphan fix; no immortal processes).

**Non-Pyodide pool (main V8 heap):** `--max-old-space-size` already hard-enforces this pool — but V8 enforces it by **aborting the process** (crash dump mid-request). The same watchdog therefore runs a second, heap-specific stage that reads the effective limit from `v8.getHeapStatistics().heap_size_limit` (so it adapts to whatever cap the client set):

1. **Heap soft stage** (85% of the V8 limit): drop rebuildable main-heap caches — currently `SchemaStore.invalidate()`, which frees the combined-schemas object (up to tens of MB; rebuilt on the next schema lookup). Cooldown-limited. Syntax trees and open documents are intentionally NOT dropped (they back live editor features).
2. **Heap hard stage** (95% for 3 consecutive checks): `process.exit(1)` **before** V8 aborts — converting an uncontrolled OOM crash into the same clean client-driven respawn as the RSS path.

Defaults are sized from the field data above (healthy linting instances run 650-825MB), so the soft limit only fires on abnormal growth. Child Node processes inherit heap caps via `NODE_OPTIONS`; the only non-Node child (`LocalCfnLintExecutor`'s local cfn-lint) is short-lived and only used in the already-low-memory local-executor mode.

#### Profiling plan (run before locking cap values)

Instrument the server (env-var gated, temporary) to log `process.memoryUsage()` — `heapUsed`, `external`, `rss` — plus worker-side `process.memoryUsage()` at these checkpoints: server start, post-initialize, post-Pyodide-load, after 1st/10th/100th lint of a large template, after 1 hour idle. Run against: small template (10 resources), large template (500+ resources), multi-folder workspace.

Pass criteria for the recommended caps:
- Main heap (`heapUsed`) stays < 60% of `--max-old-space-size` at p100 of the trial runs → confirms 512MB is generous, or justifies dropping to 384MB
- Worker JS heap stays < 60% of `maxOldGenerationSizeMb: 128`
- If either exceeds 80%, raise the cap — an OOM-killed lint worker mid-flight is worse than the memory it saves. The caps exist to catch *pathological* growth, not to squeeze the baseline.

### Option 2: Lazy-Load Pyodide (Low Effort, High Impact) ⭐ RECOMMENDED

Defer Pyodide initialization until cfn-lint validation is actually triggered, rather than loading at server startup.

**Current behavior:** Pyodide loads immediately when the server starts via `initializedHandler` in `src/handlers/Initialize.ts`:
```typescript
components.schemaRetriever.initialize();
return components.cfnLintService.initialize();  // <-- Eager load!
```

**Why is it eager today?** The code mounts workspace folders at startup so cfn-lint can access files:
```typescript
// In initializedHandler, after initialize():
for (const folder of workspace.getAllWorkspaceFolders()) {
    await components.cfnLintService.mountFolder(folder);  // Requires Pyodide!
}
```

And `CfnLintService.mountFolder()` explicitly requires initialization:
```typescript
if (this.status === STATUS.Uninitialized) {
    throw new Error('CfnLintService not initialized. Call initialize() first.');
}
```

**Key insight:** Mounting is only needed when actually running cfn-lint. The lazy-loading infrastructure in `PyodideWorkerManager.executeTask()` already exists:
```typescript
if (!this.initialized) {
    await this.initialize();  // Already supports lazy init
}
```

**Proposed fix:**
1. Remove the eager `initialize()` and `mountFolder()` calls from `initializedHandler`
2. Defer mounting to first lint request — mount folders lazily when `lintTemplate()`/`lintFile()` is called
3. The existing `executeTask()` lazy-init will trigger Pyodide loading on first use

**Proposed behavior:**
1. Server starts with ~100-150MB footprint (schemas + tree-sitter)
2. First time user saves a CFN template or requests validation → load Pyodide + mount folders
3. Users who only want autocompletion never pay the Pyodide cost

**Implementation:**
- Remove `cfnLintService.initialize()` and `mountFolder()` loop from `src/handlers/Initialize.ts`
- Modify `CfnLintService.lintTemplate()`/`lintFile()` to lazily mount folders before linting
- Remove the `status === Uninitialized` check from `mountFolder()` (or have it auto-init)

| Pros | Cons |
|------|------|
| Saves ~250MB for users who don't use cfn-lint | First lint has cold-start delay (~5-10s) |
| Reduces baseline memory significantly | Need graceful loading UX (nice-to-have) |
| **Infrastructure already exists - minimal code change** | |
| Users who disable linting get full savings | |

### Option 3: Add Master Enable/Disable Toggle (Low Effort, Medium Impact)

Add a setting to completely disable the CloudFormation LSP for users who don't need it.

**JetBrains** — Add to `CfnLspSettings.kt`:
```kotlin
var isEnabled: Boolean = true
```

Guard in `CfnLspStartupActivity.kt`:
```kotlin
override fun runActivity(project: Project) {
    if (!CfnLspSettings.getInstance().isEnabled) return
    // ... existing startup logic
}
```

**VS Code** — Add to `package.json`:
```json
"aws.cloudformation.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable CloudFormation language support"
}
```

| Pros | Cons |
|------|------|
| Users who don't use CFN save 500MB | Opt-out rather than optimization |
| Trivial to implement | Doesn't help users who need CFN support |
| Clear user control | |

### Option 4: Lazy-Load Guard WASM (Low Effort, Low Impact)

Similar to Option 2, but for cfn-guard. Currently Guard loads at startup even if no `.guard` rules exist.

From `src/services/guard/GuardService.ts`, Guard WASM is initialized eagerly. Deferring until `.guard` files are detected would save 20-30MB for users without Guard rules.

### Option 5: Optimize Schema Loading (Medium Effort, Medium Impact)

Current state: All schemas for a region are loaded into memory.

Potential optimizations:
1. **Load schemas on-demand** — Only load schema for resource types present in open templates
2. **Use memory-mapped LMDB** — Let the OS manage paging rather than loading all schemas into JS heap
3. **Compress schemas in memory** — Schemas are highly compressible JSON

Estimated savings: 30-80MB depending on approach.

### Option 6: Shared LSP Server Across IDE Windows (High Effort, High Impact)

Instead of spawning one LSP server process per IDE project window, share a single server across all windows.

**Current Architecture (one server per window):**
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ IntelliJ        │     │ IntelliJ        │     │ IntelliJ        │
│ Project A       │     │ Project B       │     │ Project C       │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
    ┌────▼────┐             ┌────▼────┐             ┌────▼────┐
    │ LSP     │             │ LSP     │             │ LSP     │
    │ Server  │             │ Server  │             │ Server  │
    │ (~500MB)│             │ (~500MB)│             │ (~500MB)│
    └─────────┘             └─────────┘             └─────────┘
    
    Total: ~1.5GB for 3 windows
```

**Proposed Architecture (shared server):**
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ IntelliJ        │     │ IntelliJ        │     │ IntelliJ        │
│ Project A       │     │ Project B       │     │ Project C       │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Shared LSP Server     │
                    │   (Socket connection)   │
                    │   (~500MB total)        │
                    │                         │
                    │ workspaceFolders: [A,B,C]│
                    └─────────────────────────┘
    
    Total: ~500MB for 3 windows (saves ~1GB)
```

**Why this is feasible:**

1. **LSP supports multiple workspace folders** — The `workspace/didChangeWorkspaceFolders` notification allows dynamically adding/removing workspace roots. The server already handles this in `LspWorkspace.ts`.

2. **Documents are keyed by URI** — No conflicts between projects since each file has a unique URI.

3. **Socket transport is supported** — The `vscode-languageserver` library supports `--socket={port}` which connects to a **single TCP socket** (not a multi-client server). This means the server can listen on a port but only accepts one connection at a time. To support multiple IDE windows, a **multiplexing proxy** is required between the clients and the server's single connection.

**Validated platform support:**

- **JetBrains (since 2024.1):** The IntelliJ Platform LSP API supports "Socket" as a communication channel since 2024.1. However, this means the IDE can communicate with a **spawned** server process via socket — there is no API to connect to a pre-existing external server. The workaround is the same as `ra-multiplex`: `createCommandLine()` spawns a lightweight proxy client that connects to the shared server. Additionally, **separate JetBrains windows are separate JVM processes** (not threads in one JVM), so `@Service(Service.Level.APP)` cannot coordinate across windows. Both IDEs require the same external daemon pattern.

- **VS Code:** The `vscode-languageclient` library supports `ServerOptions` as a function returning `StreamInfo` (reader/writer streams), which enables connecting to any TCP socket. This is a well-established pattern — the [Terraform VS Code extension](https://github.com/hashicorp/vscode-terraform/commit/48a038683fbf4a45df9bdfdfcf981b08999068e5) uses it, and the official [VS Code LSP guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) documents the `TransportKind` options.

- **LSP Spec limitation:** The LSP specification states "the protocol currently assumes that one server serves one tool." This means native multi-client is not supported — each client needs its own `initialize` handshake. The proven solution is the `ra-multiplex`/`lspmux` proxy pattern: a multiplexing daemon that intercepts handshakes and rewrites request/response IDs to route them to the correct client. This is production-proven software with 518+ GitHub stars.

**Server-side changes needed:**

1. **Add a multiplexing proxy layer:**
   
   The `vscode-languageserver` `createConnection()` only supports a single connection. To share one server across multiple IDE windows, a proxy must sit between clients and the server:
   
   ```
   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │ JB Window 1  │     │ JB Window 2  │     │ JB Window 3  │
   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
          │ TCP                 │ TCP                 │ TCP
          ▼                     ▼                     ▼
   ┌────────────────────────────────────────────────────────┐
   │              Multiplexing Proxy Layer                   │
   │  - Accepts N client connections (one per IDE window)    │
   │  - Merges workspace/didChangeWorkspaceFolders           │
   │  - Aggregates textDocument/didOpen|Change|Close         │
   │  - Broadcasts textDocument/publishDiagnostics to all    │
   │    (clients filter by URI — only display their files)   │
   │  - Routes completion/hover/etc responses to requester   │
   └────────────────────────┬───────────────────────────────┘
                            │ stdio/IPC (single connection)
                            ▼
   ┌────────────────────────────────────────────────────────┐
   │              CFN Language Server (unchanged)            │
   │  - Sees one aggregated set of workspace folders        │
   │  - Processes documents by URI as normal                │
   │  - Single Pyodide instance, single schema cache        │
   └────────────────────────────────────────────────────────┘
   ```
   
   The proxy handles:
   - **Request routing:** Tags each LSP request with a client ID, routes responses back to the originating client
   - **Notification merging:** Aggregates `workspace/didChangeWorkspaceFolders` from all clients into one upstream notification
   - **Diagnostic broadcasting:** Forwards `publishDiagnostics` to all clients (each IDE window ignores diagnostics for files it doesn't have open)
   - **Document lifecycle:** Tracks which client "owns" each open document URI

2. **Credential handling** — With a shared server for same-user windows, credentials can be stored globally. Any window updating credentials updates them for all (desirable behavior for same user).

3. **Alternative: Skip the proxy with per-client server instances sharing heavy resources** — Another approach is to keep one server per client but move Pyodide and schemas into a separate shared worker/process that multiple server instances connect to. This avoids the proxy complexity but requires deeper server refactoring.

**Client-side changes needed (more complex):**

1. **Application-level coordination service:**
   ```kotlin
   @Service(Service.Level.APP)
   class SharedCfnLspManager {
       private var serverProcess: Process? = null
       private var serverPort: Int? = null
       
       fun ensureServerRunning(): Int {
           if (serverProcess == null) {
               serverPort = findAvailablePort()
               serverProcess = startServer(serverPort!!)
           }
           return serverPort!!
       }
       
       fun registerProject(project: Project, workspaceFolder: String) {
           // Send workspace/didChangeWorkspaceFolders to add this project
       }
       
       fun unregisterProject(project: Project) {
           // Remove workspace folder; shut down if last project
       }
   }
   ```

2. **Custom LSP client implementation** — JetBrains' `ProjectWideLspServerDescriptor` assumes one server per project. Would need custom implementation that connects to shared socket instead of spawning a process.

3. **Lifecycle management:**
    - First project to open a CFN file starts the shared server
    - Each project adds its workspace folder via `workspace/didChangeWorkspaceFolders`
    - Last project to close shuts down the server

**Memory savings:**

| Windows Open | Current Memory | Shared Server | Savings |
|--------------|----------------|---------------|---------|
| 1 | 500MB | 500MB | 0% |
| 2 | 1GB | 500MB | 50% |
| 3 | 1.5GB | 500MB | 67% |
| 5 | 2.5GB | 500MB | 80% |

**Challenges:**

1. **JetBrains LSP API limitations** — The current API is designed for project-scoped servers. May need to bypass or extend it.

2. **Error isolation** — A crash in the shared server affects all windows.

3. **Credential handling** — Need careful design to avoid leaking credentials between projects/users.

4. **VS Code client** — Would need similar changes, though VS Code's extension API may be more flexible.

| Pros | Cons |
|------|------|
| Massive savings with multiple windows | High implementation complexity |
| Single Pyodide instance for all projects | Crashes affect all windows |
| Schemas loaded once | Credential isolation challenges |
| | May not fit JetBrains LSP API model |
| | Requires changes in both clients |

---

#### VS Code-Specific Implementation Details

VS Code presents unique challenges for shared LSP servers because **each VS Code window runs in a completely separate process** with its own extension host.

**VS Code Window Architecture:**
```
┌────────────────────────────────────────────────────────────────────────┐
│                           VS Code Window 1                              │
│  ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐   │
│  │  Renderer        │    │  Extension Host │    │  CFN LSP Server  │   │
│  │  (Electron)      │◄──►│  (Node.js)      │◄──►│  (Node.js child) │   │
│  │  PID: 1001       │    │  PID: 1002      │    │  PID: 1003       │   │
│  └──────────────────┘    └─────────────────┘    └──────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                           VS Code Window 2                              │
│  ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐   │
│  │  Renderer        │    │  Extension Host │    │  CFN LSP Server  │   │
│  │  (Electron)      │◄──►│  (Node.js)      │◄──►│  (Node.js child) │   │
│  │  PID: 2001       │    │  PID: 2002      │    │  PID: 2003       │   │
│  └──────────────────┘    └─────────────────┘    └──────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘

Each window has completely separate processes — no shared state.
```

**Why VS Code doesn't share extension hosts across windows:**
- Each window may have different workspace folders and settings
- Window isolation provides crash protection (one window crash doesn't affect others)
- Extensions assume they have exclusive access to their state
- No built-in IPC mechanism between VS Code windows

**Current CFN LSP setup in VS Code** (`extension.ts`):
```typescript
// Each window's extension host spawns its own server
const serverOptions: ServerOptions = {
    run: {
        module: serverFile,           // cfn-lsp-server-standalone.js
        transport: TransportKind.ipc, // Spawns child process with IPC channel
        options: { env: envOptions },
    },
    // ...
};

client = new LanguageClient(ExtensionId, ExtensionName, serverOptions, clientOptions);
await client.start();  // Spawns the server as a child process
```

**Proposed VS Code shared server architecture:**
```
┌────────────────────────────────────────────────────────────────────────┐
│                           VS Code Window 1                              │
│  ┌──────────────────┐    ┌─────────────────┐                           │
│  │  Renderer        │    │  Extension Host │──────┐                    │
│  │  (Electron)      │◄──►│  (Node.js)      │      │                    │
│  └──────────────────┘    └─────────────────┘      │                    │
└───────────────────────────────────────────────────│────────────────────┘
                                                    │ Socket
┌────────────────────────────────────────────────────│────────────────────┐
│                           VS Code Window 2          │                    │
│  ┌──────────────────┐    ┌─────────────────┐      │                    │
│  │  Renderer        │    │  Extension Host │──────┼────────────────┐   │
│  │  (Electron)      │◄──►│  (Node.js)      │      │                │   │
│  └──────────────────┘    └─────────────────┘      │                │   │
└───────────────────────────────────────────────────│────────────────│───┘
                                                    ▼                │
                                    ┌───────────────────────────────┐│
                                    │   Shared CFN LSP Server       ││
                                    │   (Socket server on port 6010)◄┘
                                    │   (~500MB total)              │
                                    │                               │
                                    │ workspaceFolders: [A, B]      │
                                    └───────────────────────────────┘
                                    
Total: ~500MB for 2 windows (instead of ~1GB)
```

**VS Code client-side implementation:**

1. **Use socket transport instead of IPC:**
   ```typescript
   // Current: spawns a new process per window
   const serverOptions: ServerOptions = {
       run: { module: serverFile, transport: TransportKind.ipc }
   };
   
   // Proposed: connect to shared server via socket
   const serverOptions: ServerOptions = () => {
       return new Promise((resolve) => {
           const socket = net.connect({ port: SHARED_SERVER_PORT });
           resolve({ reader: socket, writer: socket });
       });
   };
   ```

2. **External coordination for server lifecycle:**

   Since VS Code windows don't share memory, coordination must happen externally:

   ```typescript
   // Option A: Lock file + spawn on first connection
   async function ensureServerRunning(): Promise<number> {
       const lockFile = path.join(globalStoragePath, 'cfn-lsp.lock');
       const portFile = path.join(globalStoragePath, 'cfn-lsp.port');
       
       // Try to acquire lock
       const lock = await tryAcquireLock(lockFile);
       if (lock) {
           // We're first — start server
           const port = await findFreePort();
           await startServer(port);
           await fs.writeFile(portFile, port.toString());
           lock.release();
       }
       
       // Wait for port file to exist
       const port = await waitForPortFile(portFile);
       return port;
   }
   
   // Option B: Named pipe/Unix socket as rendezvous point
   // Server listens on /tmp/cfn-lsp.sock, first client spawns it
   ```

3. **Handle window close gracefully:**
   ```typescript
   // On window close, send workspace/didChangeWorkspaceFolders to remove our folder
   context.subscriptions.push({
       dispose: async () => {
           await client.sendNotification('workspace/didChangeWorkspaceFolders', {
               event: {
                   removed: [{ uri: workspaceFolder.uri.toString(), name: workspaceFolder.name }],
                   added: []
               }
           });
           // Don't stop the server — other windows may be using it
           // Server stops itself when last workspace folder is removed
       }
   });
   ```

4. **Alternative: VS Code's proposed "Shared Process" (future):**

   There's an open VS Code issue ([#123592](https://github.com/microsoft/vscode/issues/123592)) about moving extension hosts out of workbench for process reuse. If VS Code adds native support for shared extension hosts, this would simplify implementation significantly. However, as of 2026, this is not yet available for extensions.

**Challenges specific to VS Code:**

1. **No global extension state across windows** — `ExtensionContext.globalState` is NOT shared between windows; it's just persisted to disk. Each window reads its own copy.

2. **No IPC between extension hosts** — VS Code doesn't provide a mechanism for extension hosts in different windows to communicate directly.

3. **Server startup race condition** — Multiple windows opening simultaneously could try to start the server. Need file-based locking.

4. **Graceful degradation** — If socket connection fails, should fall back to per-window server.

5. **Cross-platform socket paths** — Unix sockets don't work the same on Windows; need TCP fallback.

**VS Code implementation effort estimate:** Medium-High
- Refactor `extension.ts` to use socket transport: 1-2 days
- Add lock file coordination: 1 day
- Handle workspace folder lifecycle: 1 day
- Testing across platforms: 2-3 days
- Edge cases (crashes, reconnection): 2-3 days

---

#### Cross-IDE Verification: Can JetBrains and VS Code Share?

**Summary: Each IDE family can share a server among its own windows. Cross-IDE sharing (JetBrains + VS Code to ONE server) is not feasible without major refactoring.**

```
✅ RECOMMENDED ARCHITECTURE:

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ IntelliJ        │     │ PyCharm         │     │ WebStorm        │
│ Window 1        │     │ Window 2        │     │ Window 3        │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Shared CFN LSP        │
                    │   (JetBrains family)    │
                    │   (~500MB)              │
                    └─────────────────────────┘

┌─────────────────┐     ┌─────────────────┐
│ VS Code         │     │ VS Code         │
│ Window 1        │     │ Window 2        │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
        ┌────────────▼────────────┐
        │   Shared CFN LSP        │
        │   (VS Code family)      │
        │   (~500MB)              │
        └─────────────────────────┘

Total for 3 JetBrains + 2 VS Code: ~1GB (vs ~2.5GB today)
```

**Why this works within each IDE family:**

1. **JetBrains** — All windows run in the same JVM. An application-level service can manage one shared server process and route connections.

2. **VS Code** — Windows are separate processes, but can coordinate via file locks and connect to a shared socket server.

3. **Credentials** — Within the same IDE family, users typically have consistent AWS credentials (same profile/account).

4. **Document conflicts** — Rare within same IDE workflow. If needed, the server can detect same-URI opens and handle gracefully.

**Why cross-IDE (JetBrains + VS Code → single server) doesn't work:**

The `vscode-languageserver` library creates a **single connection** — it's not a multi-client socket server:

```typescript
// src/app/standalone.ts — ONE connection
const lsp = new LspConnection(createConnection(ProposedFeatures.all), { ... });
```

Key conflicts if we tried to share across IDEs:
- **Credentials collision** — `AwsCredentials` stores one set; different AWS accounts would overwrite each other
- **No client routing** — Diagnostics publish to THE connection, not a specific client
- **Different client capabilities** — JetBrains and VS Code report different capabilities in `initialize`

**If cross-IDE sharing were ever needed** (Phase 3b), it would require:
- Multi-connection socket server (replacing `createConnection()`)
- Client session isolation with `clientId` tracking
- Document ownership per-client
- Effort: 16-26 days

**Recommendation: Implement same-IDE-family sharing (Phase 3a) — this is the practical solution.**

---

#### Feasibility Analysis: Potential Issues and Mitigations

**Overall Assessment: ✅ FEASIBLE with some caveats**

The server architecture is well-suited for multi-workspace sharing within the same IDE family. Here's a detailed analysis:

**✅ What Works Well (No Issues Expected):**

| Component | Why It's Safe |
|-----------|---------------|
| **Document Storage** | `DocumentManager` keys by URI — no conflicts if different windows edit different files |
| **Diagnostics** | `DiagnosticCoordinator` keys by URI and publishes per-file — correct routing automatic |
| **Syntax Trees** | `SyntaxTreeManager` keys by URI — each file has its own tree |
| **Schemas** | Loaded once, shared read-only across all workspaces — memory efficient |
| **Workspace Folders** | `LspWorkspace.workspaceFolders[]` accumulates folders from all windows — designed for multi-root |
| **cfn-lint Mounting** | `CfnLintService.mountedFolders` tracks each folder separately — additive |

**⚠️ Potential Issues and Mitigations:**

| Issue | Severity | Description | Mitigation |
|-------|----------|-------------|------------|
| **Same file in multiple windows** | Medium | If two windows open the same template with different unsaved changes, `didChange` events conflict | **Option A:** First opener wins (reject second open). **Option B:** Last-write-wins (acceptable for same user). **Option C:** Track document owner by window (complex). *Recommendation: Option B — same user editing same file in two windows is an edge case, last-write-wins is acceptable.* |
| **Settings differences** | Low | Windows may have different `aws.cloudformation.*` settings | Settings are fetched once at init via `syncConfiguration()`. For shared server, use settings from first client or merge them. Most settings (linting on/off, region) are user-level, not window-level. |
| **Credential scope** | Low | `AwsCredentials` stores one set of credentials | Within same IDE family, credentials typically come from same source (same user). If windows need different credentials, would need per-workspace credential storage. *Unlikely issue for same-user scenario.* |
| **Diagnostic routing** | None | `publishDiagnostics` sends to THE connection | All windows share the connection, so all receive diagnostics. LSP clients filter by URI — they only display diagnostics for files they have open. **This is actually fine.** |
| **Shutdown coordination** | Medium | When should server shut down? | Track connected window count. Shut down when last window disconnects. Add timeout (30s) before shutdown to handle window restarts. |
| **Crash recovery** | Medium | Shared server crash affects all windows | Implement auto-restart logic in client. First window to detect dead server restarts it; others reconnect. |

**🔍 Deep Dive: Document Conflict Scenario**

```
Timeline:
1. Window A opens /project/template.yaml (version 1)
2. Window B opens /project/template.yaml (version 1)  
3. Window A types "foo" → didChange(version 2, changes: [{insert: "foo"}])
4. Window B types "bar" → didChange(version 2, changes: [{insert: "bar"}])  ← CONFLICT!
```

The `TextDocuments` manager would see two version 2s with different changes. The LSP spec says version numbers should be monotonically increasing per document.

**Realistic risk assessment:**
- Same user rarely edits the same file in two windows simultaneously
- If they do, they'll see one set of changes "win" — inconvenient but not data-loss
- Proper fix: Track document ownership, but adds complexity

**Recommendation:** Accept last-write-wins for Phase 3a. If users report issues, add document locking in Phase 3a.1.

**📋 Implementation Checklist:**

- [ ] Client-side: Singleton server manager (JetBrains: app-service, VS Code: file lock)
- [ ] Client-side: Socket connection instead of stdio/IPC
- [ ] Client-side: Workspace folder lifecycle (add on connect, remove on disconnect)
- [ ] Client-side: Connection health monitoring and auto-reconnect
- [ ] Server-side: Graceful handling of multiple workspace folders
- [ ] Server-side: No changes needed for document/diagnostic handling (already URI-keyed)
- [ ] Testing: Multiple windows with different projects
- [ ] Testing: Window close/reopen cycles
- [ ] Testing: Server crash and recovery
- [ ] Testing: Same file open in multiple windows (document conflict scenario)

**Effort Estimate (revised with risk mitigations):**

| Task | JetBrains | VS Code |
|------|-----------|---------|
| Shared server manager | 2-3 days | 2-3 days |
| Socket transport | 1 day | 1 day |
| Health monitoring + reconnect | 1-2 days | 1-2 days |
| Shutdown coordination | 1 day | 1 day |
| Testing | 2-3 days | 2-3 days |
| **Total** | **7-10 days** | **7-10 days** |

**Final Verdict: YES, this is feasible and recommended** for users with multiple IDE windows. The architecture already handles multi-workspace scenarios well. The main risk (document conflicts) is low-probability and acceptable with last-write-wins behavior.

---

### Option 7: Shared Schema Cache Across Instances (Medium Effort, Low Impact)

Use a filesystem-based schema cache that multiple server instances read from, rather than each instance downloading and storing its own copy.

**Current:** Each server instance has its own LMDB database in `<storage-root>/lmdb/v5/`.

**Proposed:** Single shared cache directory with file locking for concurrent access.

This only helps with disk usage; memory usage is per-process regardless.

---

### Web Research Validation (July 2026)

The following external sources confirm the feasibility of the shared server approach.

#### JetBrains Socket Transport: ⚠️ Partially Supported (Correction)

The [JetBrains LSP documentation](https://plugins.jetbrains.com/docs/intellij/language-server-protocol.html) lists **"Communication channel: Socket"** as a supported feature since **2024.1**. However, upon deeper investigation:

- The API is `createCommandLine()` which **spawns a process**. "Socket" means the IDE communicates with the **spawned process** via socket instead of stdio — it does NOT mean connecting to a pre-existing external server.
- There is no `connectToExistingServer(host, port)` API. Every example, including JetBrains' own [Prisma ORM plugin](https://github.com/JetBrains/intellij-plugins/blob/idea/261.26222.65/prisma/src/org/intellij/prisma/ide/lsp/PrismaLspServerDescriptor.kt), spawns a new process.
- `ProjectWideLspServerDescriptor` is project-scoped — one descriptor per project.

**Implication:** The JetBrains approach requires the same proxy/client pattern as VS Code — you spawn a lightweight proxy client via `createCommandLine()` which connects to a shared background server. This is exactly how `ra-multiplex`/`lspmux` works.

> ⚠️ **Critical finding:** When JetBrains users open projects in **separate windows** (the common workflow), each window is a **completely separate JVM process**. From JetBrains support: "It's not possible to run multiple instances (processes) with same config/system folder at all." This means `@Service(Service.Level.APP)` is a singleton per-window, NOT across all windows. **Both JetBrains and VS Code require the same external daemon/proxy approach.**

```kotlin
// JetBrains: createCommandLine() spawns a proxy client, not the real server
override fun createCommandLine(): GeneralCommandLine {
    val port = SharedCfnLspManager.getInstance().getOrStartServer()
    // Spawn a thin proxy that connects to the shared server
    return GeneralCommandLine(nodePath, proxyClientPath, "--connect-to=$port", "--stdio")
}
```

The `@Service(Service.Level.APP)` singleton pattern remains valid for managing the shared server lifecycle.

#### VS Code Socket Transport: ✅ Well-Established Pattern

The `vscode-languageclient` library supports `ServerOptions` as a function returning `StreamInfo` (with `reader` and `writer` streams). This enables connecting to any TCP socket:

```typescript
// From hashicorp/vscode-terraform (production example):
const serverOptions: ServerOptions = () => {
    const socket = net.connect({ port, host: 'localhost' });
    const result: StreamInfo = { writer: socket, reader: socket };
    return Promise.resolve(result);
};
```

This is used in production by major extensions including [Terraform](https://github.com/hashicorp/vscode-terraform/commit/48a038683fbf4a45df9bdfdfcf981b08999068e5) and others. The VS Code [Language Server Extension Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) documents the transport options.

The challenge for VS Code is inter-window coordination (since each window runs a separate extension host process), but this is solvable with file-based locking — a well-understood pattern.

#### LSP Spec Constraint: One Server Serves One Tool (Requires Proxy)

The LSP specification [states](https://microsoft.github.io/language-server-protocol/specifications/specification-3-16/): "The protocol currently assumes that one server serves one tool."

This is the key constraint. It means:
- `createConnection()` in `vscode-languageserver` creates ONE connection, not a multi-client server
- Each client expects its own `initialize` handshake
- A multiplexing proxy is needed between N clients and the single server connection

However, this is a **solvable engineering problem**, not a fundamental blocker. The proxy layer is thin (handles routing and workspace folder aggregation) and the heavy lifting (Pyodide, schemas, linting) remains in the single shared server instance.

#### Precedent: Production Examples of Shared LSP Servers

##### 1. `ra-multiplex` / `lspmux` (518 ⭐) — Direct Precedent

**Repo:** [github.com/pr2502/ra-multiplex](https://github.com/pr2502/ra-multiplex) (archived → [codeberg.org/p2502/lspmux](https://codeberg.org/p2502/lspmux))
**What it does:** Multiplexes multiple editor windows to share a single `rust-analyzer` instance per cargo workspace.
**Available on:** Homebrew (`brew install lspmux`), AUR, Nix

**Architecture (identical to what we need):**
```
┌────────────┐  ┌────────────┐  ┌────────────┐
│ Editor 1   │  │ Editor 2   │  │ Editor 3   │
│ (spawns    │  │ (spawns    │  │ (spawns    │
│ ra-mux     │  │ ra-mux     │  │ ra-mux     │
│ client)    │  │ client)    │  │ client)    │
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘
      │ TCP            │ TCP            │ TCP
      └────────────────┼────────────────┘
                       ▼
      ┌────────────────────────────────┐
      │  ra-multiplex server           │
      │  (long-running daemon)         │
      │  Listens on 127.0.0.1:27631   │
      │                                │
      │  Rewrites request/response IDs │
      │  to track which client owns    │
      │  each response                 │
      │                                │
      │  Spawns real rust-analyzer     │
      │  per workspace (via stdio)     │
      └────────────────────────────────┘
```

**Key quotes from the README:**
> "Because neither LSP nor rust-analyzer itself support multiple clients per server, ra-multiplex intercepts the handshake process and modifies IDs of requests and responses to track which response belongs to which client."

> "Because not all messages can be tracked this way it drops some, notably it drops any requests from the server, this appears to not be a problem."

**Features relevant to our use case:**
- Auto-timeout: `instance_timeout = 300` — kills server 5 minutes after last client disconnects
- Runs as systemd service (`ra-mux.service`) or macOS launchd service (`ra-mux.plist`)
- Workspace-aware: reuses server instances based on `workspaceFolders`
- Language-agnostic: generalized from rust-analyzer to any LSP server (`--server-path` flag)

##### 2. `codescout` Kotlin LSP Multiplexer

**Repo:** [github.com/mareurs/codescout](https://github.com/mareurs/codescout/blob/master/docs/manual/src/concepts/kotlin-lsp-multiplexer.md)
**Problem:** Multiple instances targeting the same Kotlin project cause severe degradation — JetBrains' `kotlin-lsp` allows only one LSP process per workspace, and two instances compete for Gradle daemon locks, consuming 3-4GB RAM with duplicate project models and causing 120s+ timeouts.
**Solution:** LSP multiplexer — same proxy pattern.

##### 3. Claude Code LSP Issues — Same Problem at Scale

**Issues:** [#37524](https://github.com/anthropics/claude-code/issues/37524), [#62341](https://github.com/anthropics/claude-code/issues/62341), [#64536](https://github.com/anthropics/claude-code/issues/64536)
**Problem:** Claude Code spawns a new LSP server per agent session. Users report:
- kotlin-lsp: spawns new JVM per invocation without reuse, accumulating as live children
- jdtls-lsp: per-subagent spawning causes >50 GB RAM exhaustion in large Java workspaces
**Proposed solution:** Connect to a persistent external server via socket with multiplexing.

##### 4. HashiCorp Terraform Extension (TCP Socket Mode)

**Commit:** [hashicorp/vscode-terraform@48a0386](https://github.com/hashicorp/vscode-terraform/commit/48a038683fbf4a45df9bdfdfcf981b08999068e5)
**What it does:** Adds TCP port setting so the client can connect to `terraform-ls` over TCP instead of stdio. Used primarily for debugging but demonstrates the socket connection infrastructure.

##### 5. WebStorm NX Monorepo Issue (The Problem We're Solving)

**Thread:** [JetBrains Support](https://intellij-support.jetbrains.com/hc/en-us/community/posts/14856979230354)
**Problem:** "WebStorm launches separate Language Server for each library... which is unacceptable. It is possible to launch only one LSP client for the whole project, I have working neovim configuration which does that."
**This confirms** the per-project-server-spawn is a known pain point in the JetBrains ecosystem with no built-in solution.

#### Corrected Architecture (Both IDEs Use Same Pattern)

Based on the research, both JetBrains and VS Code require the **same proxy client approach** (identical to `ra-multiplex`):

```
Both IDEs (separate OS processes per window):
  IDE spawns:  "cfn-lsp-proxy --connect-to=PORT --stdio"  (~5MB, lightweight)
  Proxy connects to: Shared background daemon              (~500MB, one instance)

Shared daemon lifecycle:
  - Auto-started by first proxy client connection (or run as systemd/launchd service)
  - Listens on 127.0.0.1:<port>
  - Spawns real CFN LSP server via stdio
  - Rewrites request/response IDs per client
  - Auto-shuts down after last client disconnects (30s-5min grace period)
```

**There is no architectural difference between JetBrains and VS Code for this feature.** Both spawn separate OS processes per window, both use `createCommandLine()`/`ServerOptions` to start the proxy client, and both rely on the external daemon for multiplexing. The only difference is the client-side integration code (Kotlin vs TypeScript).

**Option: Use `lspmux` directly** instead of writing a custom proxy. It's language-server-agnostic, Homebrew-installable, and handles all the ID rewriting, timeout, and workspace detection. This reduces Phase 3 to client integration only (~5-8 days total).

---

## Phase 3 Architecture Decision: Shared Server Approaches

### Approach A: External Multiplexing Proxy (RECOMMENDED ✅)

A separate Node.js process acts as a multiplexing proxy between N IDE clients and one language server instance. The server is **unchanged** — it still thinks it's talking to a single client.

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ JB Window 1  │ │ JB Window 2  │ │ VS Code 1    │ │ VS Code 2    │
│ (proxy-client│ │ (proxy-client│ │ (StreamInfo  │ │ (StreamInfo  │
│  → stdio)    │ │  → stdio)    │ │  → TCP)      │ │  → TCP)      │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │ TCP             │ TCP            │ TCP            │ TCP
       └─────────────────┼────────────────┼────────────────┘
                         ▼                                
       ┌──────────────────────────────────────────────────┐
       │  cfn-lsp-proxy (Node.js, ~200-300 lines)         │
       │  Separate process, ~10MB                         │
       │  Listens on 127.0.0.1:PORT                       │
       │  - Rewrites request/response IDs per client      │
       │  - Routes responses back to originating client   │
       │  - Broadcasts notifications to all clients       │
       │  - Merges workspace folders                      │
       │  - Auto-shuts down after last client disconnects │
       └──────────────────────┬───────────────────────────┘
                              │ TCP, stdio, or IPC
                              │ (single connection — server sees one client)
                              ▼
       ┌──────────────────────────────────────────────────┐
       │  CFN Language Server (UNCHANGED)                  │
       │  node standalone.js --stdio (or --socket=PORT)   │
       │  ~500MB (Pyodide + schemas), one instance total  │
       └──────────────────────────────────────────────────┘
```

**Transport-agnostic:** The proxy operates on the LSP message layer (JSON-RPC with content-length framing). It doesn't care whether bytes arrive via TCP, stdio, IPC, or named pipe on either side:
- Proxy↔Server: stdio (proxy spawns server) OR TCP socket (server started independently)
- Proxy↔Clients: TCP (all clients connect to proxy's port)
- IDE↔Proxy-client: stdio (JetBrains `createCommandLine()`) or TCP (VS Code `StreamInfo`)

**Key properties:**
- Server code is unchanged — zero risk to existing functionality
- Proxy is independently testable
- Proxy crash ≠ server crash (Pyodide stays warm)
- Graceful fallback: if proxy fails, each window spawns its own server (existing behavior)
- Clients can ship shared-server support independently (VS Code in sprint 1, JetBrains in sprint 2)
- Server and proxy version independently

### Approach B: Daemon Mode Built Into Server (NOT RECOMMENDED ❌)

Add `--daemon` mode directly to `standalone.ts`. When started with `--daemon`, the server binary itself acts as both the LSP server AND the multiplexing TCP server accepting multiple client connections.

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ JB Window 1  │ │ JB Window 2  │ │ VS Code 1    │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │ TCP             │ TCP            │ TCP
       └─────────────────┼────────────────┘
                         ▼
       ┌──────────────────────────────────────────────────┐
       │  CFN Language Server (MODIFIED)                   │
       │  node standalone.js --daemon --port=6010          │
       │  ~500MB + multiplexing logic in same process      │
       │  - LSP server logic                              │
       │  - AND TCP server accepting N connections        │
       │  - AND ID rewriting / routing                    │
       │  - AND client lifecycle management               │
       └──────────────────────────────────────────────────┘
```

### Why Approach A Is Better

| Criteria | Approach A (External Proxy) | Approach B (Built-in Daemon) |
|----------|----------------------------|------------------------------|
| **Single Responsibility** | ✅ Server serves LSP. Proxy multiplexes. | ❌ Server does LSP + multiplexing + TCP server. |
| **Open/Closed** | ✅ Server unchanged. Proxy added by composition. | ❌ Server modified to support two modes. |
| **Crash isolation** | ✅ Proxy crash → restart proxy, server stays warm. Pyodide (5-10s cold start) is preserved. | ❌ Daemon crash → lose everything including warm Pyodide. All clients stall. |
| **Blast radius** | ✅ Zero changes to open-source language server repo. | ❌ Modifying `standalone.ts` risks breaking server for all consumers. |
| **Testing** | ✅ Proxy tested independently. Server tests unchanged. | ❌ Must test both `--stdio` and `--daemon` modes. Combinatorial complexity. |
| **Rollback** | ✅ Don't ship proxy → existing per-window behavior. Zero risk. | ❌ Must revert `standalone.ts` changes and re-test. |
| **Cross-team coordination** | ✅ Each client team ships independently. No server repo changes needed. | ❌ Both JetBrains and VS Code teams blocked on server changes. |
| **Graceful degradation** | ✅ Proxy fails → fall back to spawning server directly (existing `createCommandLine()`). Free. | ⚠️ Daemon mode fails → need separate fallback codepath. |
| **Versioning** | ✅ Proxy and server version independently. | ❌ Single binary must support both modes forever. |

### Why Approach A Specifically for This Server

1. **Pyodide is expensive and stateful** — 5-10 second cold start, ~250MB WASM. A proxy crash is cheap (restart in <100ms). A server crash means reinitializing Pyodide. Separating them means the expensive state survives proxy restarts.

2. **The server is open-source and consumed by both clients** — Adding `--daemon` mode to `cloudformation-languageserver` adds complexity that both `aws-toolkit-vscode` and `aws-toolkit-jetbrains` teams must understand. The proxy lives in the client repos where it belongs.

3. **Transport flexibility** — The proxy is transport-agnostic. Today the VS Code client uses `TransportKind.ipc` and JetBrains uses `--stdio`. Whether the proxy↔server connection uses stdio, socket, or IPC is a configuration detail, not a code change. Approach B would need to handle all transports in the server code.

4. **Phases 1+2 are pure server-side fixes that ship first** — The bug fix, lazy loading, and disable toggle don't require any proxy. Keeping the proxy separate means Phase 3 never risks blocking Phases 1+2.

### Implementation Details

**Server change (optional, 10-15 lines):** Add `--socket=PORT` flag to `standalone.ts` as an alternative transport to stdio. This lets the proxy connect via TCP instead of spawning the server as a child process. Not strictly required (proxy can spawn server via stdio), but useful if the server needs to run as a system daemon or persist across proxy restarts.

**Proxy module (`cfn-lsp-proxy.js`, ~200-300 lines):**
- Bundled alongside the server in the distribution
- Handles: TCP listener, client connection tracking, JSON-RPC message framing, ID rewriting, request→client routing, notification broadcasting, workspace folder aggregation, auto-shutdown with grace period
- File-lock-based daemon coordination (first client starts it, subsequent clients discover it)

**Per-client integration:**

JetBrains (`CfnLspServerSupportProvider.kt`):
```kotlin
override fun createCommandLine(): GeneralCommandLine {
    if (sharedServerEnabled) {
        val port = ensureProxyRunning() // file-lock check, start if needed
        return GeneralCommandLine(nodePath, proxyClientScript, "--port=$port")
    }
    // Fallback: existing behavior
    return GeneralCommandLine(nodePath, serverPath, "--stdio")
}
```

VS Code (`extension.ts`):
```typescript
const serverOptions: ServerOptions = sharedServerEnabled
    ? async (): Promise<StreamInfo> => {
        const port = await ensureProxyRunning(); // file-lock check, start if needed
        const socket = net.connect({ port, host: '127.0.0.1' });
        return { reader: socket, writer: socket };
    }
    : { run: { module: serverFile, transport: TransportKind.ipc } }; // Fallback
```

**Proxy client (`cfn-lsp-proxy-client.js`, ~30 lines):**
```javascript
// Spawned by JetBrains via createCommandLine()
// Pipes stdin/stdout ↔ TCP socket to the proxy
const net = require('net');
const port = parseInt(process.argv.find(a => a.startsWith('--port=')).split('=')[1]);
const socket = net.connect({ port, host: '127.0.0.1' });
process.stdin.pipe(socket);
socket.pipe(process.stdout);
socket.on('error', () => process.exit(1));
```

### Effort Estimate

| Component | Effort |
|-----------|--------|
| Multiplexing proxy (`cfn-lsp-proxy.js`) | 3-5 days |
| File-lock daemon coordination (shared by both clients) | 1-2 days |
| JetBrains client integration | 1-2 days |
| VS Code client integration | 1-2 days |
| Proxy client script (`cfn-lsp-proxy-client.js`) | 0.5 day |
| Server `--socket` flag (optional) | 0.5 day |
| Testing (multi-window, crash recovery, fallback) | 3-4 days |
| **Total** | **10-15 days** |

Alternative: Use `lspmux` directly (Rust binary, `brew install lspmux`) → reduces to **5-8 days** (skip proxy implementation, just do client integration + testing). Trade-off: adds an external Rust binary dependency.

### Full Implementation Code

#### 1. Multiplexing Proxy (`cfn-lsp-proxy.ts`)

Bundled alongside the language server in the distribution. Uses `vscode-jsonrpc` and `jose` (both already dependencies of the language server). **This version implements the full correctness contract** from the Multiplexing Correctness Review (requirements 1-10); the defect IDs it resolves are noted inline.

```typescript
#!/usr/bin/env node
// cfn-lsp-proxy.ts — Multiplexing proxy for CFN Language Server
// Implements the correctness contract: bidirectional ID remapping, server→client
// request routing, URI-scoped notification routing, document refcounting,
// workspace folder merging, credential re-encryption, lifecycle interception.

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import { compactDecrypt, CompactEncrypt } from 'jose';

const args = process.argv.slice(2);
const serverPath = args[args.indexOf('--server-path') + 1];
const serverNode = args[args.indexOf('--server-node') + 1] || 'node';
const GRACE_PERIOD_MS = 30_000;
const SHUTDOWN_HANDSHAKE_TIMEOUT_MS = 5_000;

const CFN_LSP_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '', '.cfn-lsp');
const PORT_FILE = path.join(CFN_LSP_DIR, 'proxy.port');
const PID_FILE = path.join(CFN_LSP_DIR, 'proxy.pid');

// ---------- Message classification (contract #1, resolves D1) ----------
type Msg = { jsonrpc: '2.0'; id?: number | string; method?: string; params?: any; result?: any; error?: any };
const isRequest = (m: Msg) => m.id !== undefined && m.method !== undefined;
const isResponse = (m: Msg) => m.id !== undefined && m.method === undefined;
const isNotification = (m: Msg) => m.id === undefined && m.method !== undefined;

// Server→client notifications that are scoped to a document URI (routed, not broadcast)
const URI_SCOPED_NOTIFICATIONS = new Set(['textDocument/publishDiagnostics']);

interface ClientSession {
    id: string;
    socket: net.Socket;
    writer: StreamMessageWriter;
    encryptionKey?: Buffer;          // this client's key, captured from its initialize params
    openDocs: Set<string>;           // URIs this client has open
    folders: Set<string>;            // workspace folder URIs this client claims
    c2s: Map<number, number | string>; // proxyId → client's original request id
}

class CfnLspProxy {
    private tcp: net.Server;
    private lsp: ChildProcess | null = null;
    private serverWriter: StreamMessageWriter | null = null;
    private clients = new Map<string, ClientSession>();
    private clientOrder: string[] = [];           // for primary-client election (contract #3)
    private nextId = 1;
    private c2sPending = new Map<number, string>();               // proxyId → clientId
    private s2cPending = new Map<number, { clientId: string; serverId: number | string }>(); // (D2 fix)
    private docRefs = new Map<string, Set<string>>();             // uri → clientIds (contract #4/#5, D4/D5)
    private initialized = false;
    private initializing: Promise<void> | null = null;            // mutex for racing initializes
    private initializeResult: any = null;
    private serverFolders = new Set<string>();
    private shutdownTimer: NodeJS.Timeout | null = null;
    private readonly proxyKey = randomBytes(32);                  // proxy-owned key (contract #9, D6)

    // ---------- lifecycle ----------
    async start(): Promise<void> {
        this.lsp = spawn(serverNode, [serverPath, '--stdio'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' },
        });
        this.lsp.stderr?.on('data', (d) => process.stderr.write(`[server] ${d}`));
        this.lsp.on('exit', (code) => {
            log(`Language server exited (${code}); proxy exiting — clients fall back to per-window spawn`);
            this.cleanupFiles();
            process.exit(code ?? 1);
        });

        new StreamMessageReader(this.lsp.stdout!).listen((m: any) => this.onServerMessage(m));
        this.serverWriter = new StreamMessageWriter(this.lsp.stdin!);

        this.tcp = net.createServer((s) => this.onClientConnect(s));
        await new Promise<void>((resolve) => {
            this.tcp.listen(0, '127.0.0.1', () => {
                const port = (this.tcp.address() as net.AddressInfo).port;
                fs.mkdirSync(CFN_LSP_DIR, { recursive: true });
                fs.writeFileSync(PORT_FILE, String(port));
                fs.writeFileSync(PID_FILE, String(process.pid));
                log(`listening on ${port}`);
                resolve();
            });
        });
    }

    private onClientConnect(socket: net.Socket): void {
        const id = `c${this.nextId++}`;
        const session: ClientSession = {
            id, socket,
            writer: new StreamMessageWriter(socket),
            openDocs: new Set(), folders: new Set(), c2s: new Map(),
        };
        this.clients.set(id, session);
        this.clientOrder.push(id);
        this.cancelShutdownTimer();
        log(`${id} connected (${this.clients.size} total)`);

        new StreamMessageReader(socket).listen((m: any) => this.onClientMessage(session, m));
        socket.on('close', () => this.onClientDisconnect(session));
        socket.on('error', (e) => log(`${id} error: ${e.message}`));
    }

    private get primary(): ClientSession | undefined {
        return this.clients.get(this.clientOrder[0]);
    }

    // ---------- client → server ----------
    private async onClientMessage(c: ClientSession, m: Msg): Promise<void> {
        // Responses from clients answer server→client requests (contract #2, resolves D1)
        if (isResponse(m)) {
            const pending = this.s2cPending.get(m.id as number);
            if (pending && pending.clientId === c.id) {
                this.s2cPending.delete(m.id as number);
                this.serverWriter!.write({ ...m, id: pending.serverId });
            } // else: stale/unknown response — drop
            return;
        }

        // Cancellation: translate through the c2s map (contract #2, resolves D2)
        if (m.method === '$/cancelRequest') {
            for (const [proxyId, origId] of c.c2s) {
                if (origId === m.params?.id) {
                    this.serverWriter!.write({ ...m, params: { id: proxyId } });
                    return;
                }
            }
            return; // unknown id — drop rather than cancel someone else's request
        }

        switch (m.method) {
            case 'initialize': return this.onClientInitialize(c, m);
            case 'initialized': return; // proxy sends its own after real init completes
            case 'shutdown':            // lifecycle interception (contract #8, resolves D9)
                c.writer.write({ jsonrpc: '2.0', id: m.id, result: null });
                return;
            case 'exit': return;        // swallowed — only proxy shuts the server down
            case 'textDocument/didOpen': {
                const uri = m.params?.textDocument?.uri;
                if (uri) {
                    const refs = this.docRefs.get(uri) ?? new Set();
                    const firstOpen = refs.size === 0;
                    refs.add(c.id); this.docRefs.set(uri, refs); c.openDocs.add(uri);
                    if (!firstOpen) return; // refcount >0→n: suppress (contract #5, resolves D5)
                }
                break; // 0→1: forward
            }
            case 'textDocument/didClose': {
                const uri = m.params?.textDocument?.uri;
                if (uri) {
                    c.openDocs.delete(uri);
                    const refs = this.docRefs.get(uri);
                    refs?.delete(c.id);
                    if (refs && refs.size > 0) return; // others still hold it: suppress
                    this.docRefs.delete(uri);
                }
                break; // 1→0: forward
            }
            case 'aws/credentials/iam/update':
                return this.reencryptAndForward(c, m); // contract #9, resolves D6
        }

        if (isRequest(m)) {
            const proxyId = this.nextId++;
            this.c2sPending.set(proxyId, c.id);
            c.c2s.set(proxyId, m.id!);
            this.serverWriter!.write({ ...m, id: proxyId });
        } else {
            this.serverWriter!.write(m); // plain notification (didChange, didSave, iam/delete, …)
        }
    }

    private async onClientInitialize(c: ClientSession, m: Msg): Promise<void> {
        // Capture this client's encryption key + workspace folders
        const keyB64 = m.params?.initializationOptions?.aws?.encryption?.key;
        if (keyB64) c.encryptionKey = Buffer.from(keyB64, 'base64');
        const folders: Array<{ uri: string }> = m.params?.workspaceFolders ?? [];
        for (const f of folders) c.folders.add(f.uri);

        if (!this.initialized && !this.initializing) {
            // First client: forward with the PROXY's key substituted (contract #9)
            this.initializing = (async () => {
                const params = structuredClone(m.params ?? {});
                params.processId = process.pid; // watchdog must watch the proxy, not a window
                if (params.initializationOptions?.aws?.encryption) {
                    params.initializationOptions.aws.encryption.key = this.proxyKey.toString('base64');
                }
                const proxyId = this.nextId++;
                this.c2sPending.set(proxyId, c.id);
                c.c2s.set(proxyId, m.id!);
                this.serverWriter!.write({ ...m, id: proxyId, params });
                for (const f of folders) this.serverFolders.add(f.uri);
            })();
            await this.initializing;
        } else {
            await this.initializing; // racing initializes wait for the first (contract validation: race test)
            c.writer.write({ jsonrpc: '2.0', id: m.id, result: this.initializeResult });
            // Late joiner: merge its folders into the live server (contract #6, resolves D8)
            const added = folders.filter((f) => !this.serverFolders.has(f.uri));
            if (added.length > 0) {
                for (const f of added) this.serverFolders.add(f.uri);
                this.serverWriter!.write({
                    jsonrpc: '2.0', method: 'workspace/didChangeWorkspaceFolders',
                    params: { event: { added, removed: [] } },
                });
            }
        }
    }

    private async reencryptAndForward(c: ClientSession, m: Msg): Promise<void> {
        try {
            if (!c.encryptionKey) throw new Error('client key unknown');
            const { plaintext } = await compactDecrypt(m.params.data, c.encryptionKey);
            const jwt = await new CompactEncrypt(plaintext)
                .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
                .encrypt(this.proxyKey);
            const proxyId = this.nextId++;
            this.c2sPending.set(proxyId, c.id);
            c.c2s.set(proxyId, m.id!);
            this.serverWriter!.write({ ...m, id: proxyId, params: { data: jwt, encrypted: true } });
            // Tell other windows so their explorers refresh (last-writer-wins, documented)
            for (const [, other] of this.clients) {
                if (other.id !== c.id) {
                    other.writer.write({ jsonrpc: '2.0', method: 'aws/proxy/credentialsChanged', params: {} });
                }
            }
        } catch (e) {
            log(`credential re-encryption failed for ${c.id}: ${e}`);
            c.writer.write({ jsonrpc: '2.0', id: m.id, result: { success: false } });
        }
    }

    // ---------- server → clients ----------
    private onServerMessage(m: Msg): void {
        if (isResponse(m)) {
            const clientId = this.c2sPending.get(m.id as number);
            if (!clientId) return;
            this.c2sPending.delete(m.id as number);
            const c = this.clients.get(clientId);
            if (!c) return; // client gone — drop (its state was cleaned on disconnect)
            const originalId = c.c2s.get(m.id as number);
            c.c2s.delete(m.id as number);
            if (!this.initialized && m.result?.capabilities) {
                this.initialized = true;
                this.initializeResult = m.result;
                this.serverWriter!.write({ jsonrpc: '2.0', method: 'initialized', params: {} });
            }
            c.writer.write({ ...m, id: originalId! });
            return;
        }

        if (isRequest(m)) {
            // Server→client request (workspace/configuration, window/showMessageRequest):
            // route to primary client with a remapped id (contract #2/#3, resolves D1)
            const target = this.primary;
            if (!target) {
                this.serverWriter!.write({
                    jsonrpc: '2.0', id: m.id,
                    error: { code: -32800, message: 'no client connected' },
                });
                return;
            }
            const proxyId = this.nextId++;
            this.s2cPending.set(proxyId, { clientId: target.id, serverId: m.id! });
            target.writer.write({ ...m, id: proxyId });
            return;
        }

        // Notification from server
        if (URI_SCOPED_NOTIFICATIONS.has(m.method!)) {
            // Route only to clients holding the URI open (contract #4, resolves D4)
            const uri = m.params?.uri;
            const holders = uri ? this.docRefs.get(uri) : undefined;
            for (const id of holders ?? []) this.clients.get(id)?.writer.write(m);
        } else {
            for (const [, c] of this.clients) c.writer.write(m); // truly global: broadcast
        }
    }

    // ---------- disconnect & shutdown ----------
    private onClientDisconnect(c: ClientSession): void {
        this.clients.delete(c.id);
        this.clientOrder = this.clientOrder.filter((id) => id !== c.id);
        log(`${c.id} disconnected (${this.clients.size} remaining)`);

        // Contract #7 (resolves D7): release documents…
        for (const uri of c.openDocs) {
            const refs = this.docRefs.get(uri);
            refs?.delete(c.id);
            if (refs && refs.size === 0) {
                this.docRefs.delete(uri);
                this.serverWriter!.write({
                    jsonrpc: '2.0', method: 'textDocument/didClose', params: { textDocument: { uri } },
                });
            }
        }
        // …fail its pending server→client requests back to the server…
        for (const [proxyId, p] of this.s2cPending) {
            if (p.clientId === c.id) {
                this.s2cPending.delete(proxyId);
                this.serverWriter!.write({
                    jsonrpc: '2.0', id: p.serverId,
                    error: { code: -32800, message: 'client disconnected' },
                });
            }
        }
        // …and release folder claims nobody else holds (contract #6)
        const removed = [...c.folders].filter(
            (uri) => ![...this.clients.values()].some((o) => o.folders.has(uri)),
        );
        if (removed.length > 0) {
            for (const uri of removed) this.serverFolders.delete(uri);
            this.serverWriter!.write({
                jsonrpc: '2.0', method: 'workspace/didChangeWorkspaceFolders',
                params: { event: { added: [], removed: removed.map((uri) => ({ uri, name: uri })) } },
            });
        }

        if (this.clients.size === 0) {
            this.shutdownTimer = setTimeout(() => void this.gracefulShutdown(), GRACE_PERIOD_MS);
        }
    }

    private cancelShutdownTimer(): void {
        if (this.shutdownTimer) { clearTimeout(this.shutdownTimer); this.shutdownTimer = null; }
    }

    // Contract #8: proper shutdown→exit handshake, NOT kill() (avoids the orphan pattern)
    private async gracefulShutdown(): Promise<void> {
        log('no clients — shutting down server via handshake');
        const shutdownId = this.nextId++;
        this.serverWriter!.write({ jsonrpc: '2.0', id: shutdownId, method: 'shutdown' });
        await new Promise((r) => setTimeout(r, SHUTDOWN_HANDSHAKE_TIMEOUT_MS)); // response or timeout
        this.serverWriter!.write({ jsonrpc: '2.0', method: 'exit' });
        setTimeout(() => this.lsp?.kill('SIGKILL'), SHUTDOWN_HANDSHAKE_TIMEOUT_MS).unref(); // last resort
        this.cleanupFiles();
    }

    private cleanupFiles(): void {
        try { fs.unlinkSync(PORT_FILE); } catch {}
        try { fs.unlinkSync(PID_FILE); } catch {}
    }
}

function log(msg: string): void {
    process.stderr.write(`[cfn-lsp-proxy] ${msg}\n`);
}

const proxy = new CfnLspProxy();
proxy.start().catch((err) => { log(`failed to start: ${err}`); process.exit(1); });
process.on('SIGTERM', () => void proxy['gracefulShutdown']());
process.on('SIGINT', () => void proxy['gracefulShutdown']());
```

**Contract coverage:** message classification (#1), bidirectional ID remapping incl. `$/cancelRequest` (#2, D1/D2), primary-client routing for server→client requests (#3, D3), URI-scoped `publishDiagnostics` routing (#4, D4), document refcounting (#5, D5), workspace folder merge/release (#6, D8), disconnect cleanup (#7, D7), lifecycle interception + handshake shutdown (#8, D9), credential re-encryption with proxy-owned key + `aws/proxy/credentialsChanged` broadcast (#9, D6), and the `processId` in initialize is rewritten to the proxy's PID so the server's parent watchdog tracks the right process.

**Known accepted trade-offs** (documented, per contract): shared-server mode implies shared settings (`workspace/configuration` answered by the primary client) and shared credentials (last-writer-wins); same-file edits from two windows are last-writer-wins, same as today. Clients must handle the `aws/proxy/credentialsChanged` notification to refresh their explorers (small addition to both IDE clients).

#### 2. Proxy Client Script (`cfn-lsp-proxy-client.js`)

Spawned by JetBrains via `createCommandLine()`. Pipes stdin/stdout to the proxy's TCP port.

```javascript
#!/usr/bin/env node
// cfn-lsp-proxy-client.js — Bridges stdio ↔ TCP for JetBrains LSP integration
// JetBrains spawns this via createCommandLine(), expects stdio LSP communication

const net = require('net');

const portArg = process.argv.find(a => a.startsWith('--port='));
if (!portArg) {
    process.stderr.write('Usage: cfn-lsp-proxy-client.js --port=PORT\n');
    process.exit(1);
}
const port = parseInt(portArg.split('=')[1], 10);

const socket = net.connect({ port, host: '127.0.0.1' }, () => {
    process.stderr.write(`Connected to cfn-lsp-proxy on port ${port}\n`);
});

// Pipe: IDE (stdin) → proxy (TCP)
process.stdin.pipe(socket);

// Pipe: proxy (TCP) → IDE (stdout)
socket.pipe(process.stdout);

socket.on('error', (err) => {
    process.stderr.write(`Proxy connection error: ${err.message}\n`);
    process.exit(1);
});

socket.on('close', () => {
    process.exit(0);
});

process.on('SIGTERM', () => socket.destroy());
process.on('SIGINT', () => socket.destroy());
```

#### 3. VS Code Client Changes (`extension.ts`)

```typescript
// --- NEW: Add at top of file ---
import * as net from 'net'
import * as os from 'os'
import { StreamInfo } from 'vscode-languageclient/node'
import { spawn } from 'child_process'
import * as lockfile from 'proper-lockfile'

const CFN_LSP_DIR = path.join(os.homedir(), '.cfn-lsp')
const PROXY_PORT_FILE = path.join(CFN_LSP_DIR, 'proxy.port')
const PROXY_PID_FILE = path.join(CFN_LSP_DIR, 'proxy.pid')

// --- NEW: Helper functions ---
async function isProxyAlive(): Promise<boolean> {
    try {
        const pid = parseInt(await fs.readFile(PROXY_PID_FILE, 'utf8'), 10)
        process.kill(pid, 0) // Throws if process doesn't exist
        const port = parseInt(await fs.readFile(PROXY_PORT_FILE, 'utf8'), 10)
        // Verify port is responding
        return await new Promise<boolean>((resolve) => {
            const socket = net.connect({ port, host: '127.0.0.1' }, () => {
                socket.destroy()
                resolve(true)
            })
            socket.on('error', () => resolve(false))
            socket.setTimeout(1000, () => { socket.destroy(); resolve(false) })
        })
    } catch {
        return false
    }
}

async function waitForPortFile(timeoutMs = 15000): Promise<number> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
        try {
            if (await fs.existsFile(PROXY_PORT_FILE)) {
                const port = parseInt(await fs.readFile(PROXY_PORT_FILE, 'utf8'), 10)
                if (!isNaN(port) && port > 0) return port
            }
        } catch {}
        await new Promise(r => setTimeout(r, 100))
    }
    throw new Error('Timeout waiting for proxy to start')
}

async function ensureProxyRunning(serverFile: string): Promise<number> {
    await fs.mkdir(CFN_LSP_DIR, { recursive: true })

    if (await isProxyAlive()) {
        return parseInt(await fs.readFile(PROXY_PORT_FILE, 'utf8'), 10)
    }

    let release: (() => Promise<void>) | undefined
    try {
        release = await lockfile.lock(CFN_LSP_DIR, { retries: { retries: 5, minTimeout: 200 } })
    } catch {
        // Another window has the lock — wait for port file
        return await waitForPortFile()
    }

    try {
        // Double-check after lock acquired
        if (await isProxyAlive()) {
            return parseInt(await fs.readFile(PROXY_PORT_FILE, 'utf8'), 10)
        }

        const proxyScript = path.join(path.dirname(serverFile), 'cfn-lsp-proxy.js')
        const child = spawn('node', [proxyScript, '--server-path', serverFile, '--server-node', 'node'], {
            detached: true,
            stdio: 'ignore',
            env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' },
        })
        child.unref()

        return await waitForPortFile()
    } finally {
        if (release) await release()
    }
}

// --- MODIFIED: In startClient(), replace serverOptions ---
async function startClient(context: ExtensionContext) {
    // ... existing code to resolve serverFile ...

    const sharedServerEnabled = vscode.workspace.getConfiguration('aws.cloudformation')
        .get<boolean>('sharedServer', false)

    let serverOptions: ServerOptions

    if (sharedServerEnabled) {
        serverOptions = async (): Promise<StreamInfo> => {
            const port = await ensureProxyRunning(serverFile)
            const socket = net.connect({ port, host: '127.0.0.1' })
            await new Promise<void>((resolve, reject) => {
                socket.on('connect', resolve)
                socket.on('error', reject)
            })
            return { reader: socket, writer: socket }
        }
    } else {
        // Existing behavior — spawn per window
        serverOptions = {
            run: {
                module: serverFile,
                transport: TransportKind.ipc,
                options: { env: envOptions },
            },
            debug: {
                module: serverFile,
                transport: TransportKind.ipc,
                options: { execArgv: ['--no-lazy'], env: envOptions },
            },
        }
    }

    // ... rest of startClient() unchanged ...
}
```

**New setting** (add to VS Code `package.json` `contributes.configuration`):
```json
"aws.cloudformation.sharedServer": {
    "type": "boolean",
    "default": false,
    "markdownDescription": "Share a single CloudFormation language server across all VS Code windows. Reduces memory usage significantly when multiple windows are open. Requires restart.",
    "scope": "application"
}
```

#### 4. JetBrains Client Changes (`CfnLspServerSupportProvider.kt`)

```kotlin
// --- MODIFIED: createCommandLine() ---
override fun createCommandLine(): GeneralCommandLine {
    val serverPath = try {
        installer.getServerPath()
    } catch (e: CfnLspException) {
        LOG.warn(e) { "Failed to get CloudFormation LSP server" }
        notifyLspError(e)
        throw e
    }

    val nodePath = try {
        resolveNodeRuntime()
    } catch (e: Exception) {
        LOG.warn(e) { "Failed to resolve Node.js runtime" }
        notifyNodeError()
        throw (e as? CfnLspException) ?: CfnLspException(
            message("cloudformation.lsp.error.node_not_found"),
            CfnLspException.ErrorCode.NODE_NOT_FOUND,
            e
        )
    }

    val settings = CfnLspSettings.getInstance()

    if (settings.isSharedServerEnabled) {
        try {
            val port = ensureProxyRunning(nodePath, serverPath)
            val proxyClientPath = serverPath.parent.resolve("cfn-lsp-proxy-client.js")
            LOG.info { "Connecting to shared CloudFormation LSP proxy on port $port" }
            return GeneralCommandLine(nodePath.toString(), proxyClientPath.toString(), "--port=$port")
        } catch (e: Exception) {
            LOG.warn(e) { "Failed to start shared proxy, falling back to per-project server" }
            // Fall through to standard per-project startup
        }
    }

    LOG.info { "Starting CloudFormation LSP: node=$nodePath, server=$serverPath" }
    return GeneralCommandLine(nodePath.toString(), serverPath.toString(), "--stdio")
        .withWorkDirectory(serverPath.parent.toString())
}

// --- NEW: Add to companion object or new SharedProxyManager.kt ---
private val proxyLock = Any()

private fun ensureProxyRunning(nodePath: Path, serverPath: Path): Int {
    val cfnLspDir = Path.of(System.getProperty("user.home"), ".cfn-lsp")
    Files.createDirectories(cfnLspDir)

    val portFile = cfnLspDir.resolve("proxy.port")
    val pidFile = cfnLspDir.resolve("proxy.pid")
    val lockFile = cfnLspDir.resolve("proxy.lock")

    // Fast path: check if proxy is already running
    if (isProxyAlive(pidFile, portFile)) {
        return Files.readString(portFile).trim().toInt()
    }

    // Acquire file lock to prevent race between IDE windows
    synchronized(proxyLock) {
        val lockChannel = FileChannel.open(
            lockFile,
            StandardOpenOption.CREATE,
            StandardOpenOption.WRITE
        )
        lockChannel.lock().use {
            // Double-check after lock
            if (isProxyAlive(pidFile, portFile)) {
                return Files.readString(portFile).trim().toInt()
            }

            // Start the proxy
            val proxyScript = serverPath.parent.resolve("cfn-lsp-proxy.js")
            LOG.info { "Starting cfn-lsp-proxy: node=$nodePath, proxy=$proxyScript, server=$serverPath" }

            ProcessBuilder(
                nodePath.toString(),
                proxyScript.toString(),
                "--server-path", serverPath.toString(),
                "--server-node", nodePath.toString()
            )
                .directory(serverPath.parent.toFile())
                .redirectErrorStream(true)
                .redirectOutput(ProcessBuilder.Redirect.appendTo(cfnLspDir.resolve("proxy.log").toFile()))
                .start()

            // Wait for port file
            return waitForPortFile(portFile, timeoutMs = 15_000)
        }
    }
}

private fun isProxyAlive(pidFile: Path, portFile: Path): Boolean {
    if (!Files.exists(pidFile) || !Files.exists(portFile)) return false
    return try {
        val pid = Files.readString(pidFile).trim().toLong()
        val alive = ProcessHandle.of(pid).map { it.isAlive }.orElse(false)
        if (!alive) return false

        // Also verify the port is reachable
        val port = Files.readString(portFile).trim().toInt()
        java.net.Socket().use { socket ->
            socket.connect(java.net.InetSocketAddress("127.0.0.1", port), 1000)
            true
        }
    } catch (e: Exception) {
        false
    }
}

private fun waitForPortFile(portFile: Path, timeoutMs: Long): Int {
    val deadline = System.currentTimeMillis() + timeoutMs
    while (System.currentTimeMillis() < deadline) {
        if (Files.exists(portFile)) {
            try {
                val port = Files.readString(portFile).trim().toInt()
                if (port > 0) return port
            } catch (_: NumberFormatException) {}
        }
        Thread.sleep(100)
    }
    throw CfnLspException(
        "Shared proxy failed to start within ${timeoutMs}ms",
        CfnLspException.ErrorCode.NODE_NOT_FOUND
    )
}
```

**New setting** (add to `CfnLspSettings.kt`):
```kotlin
var isSharedServerEnabled: Boolean = false
```

**Add to settings UI** (in the CloudFormation settings panel):
```kotlin
// In the configurable/settings panel:
checkBox(message("cloudformation.settings.shared_server"))
    .bindSelected(settings::isSharedServerEnabled)
    .comment(message("cloudformation.settings.shared_server.comment"))
```

#### 5. Optional: Server `--socket` Flag (`standalone.ts`)

If the proxy should connect to an already-running server instead of spawning it:

```typescript
// Add to standalone.ts, before the existing createConnection code:
import * as net from 'net';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';

const socketArg = process.argv.find(a => a.startsWith('--socket='));

if (socketArg) {
    const port = parseInt(socketArg.split('=')[1], 10);
    const tcpServer = net.createServer((socket) => {
        // Accept exactly one connection (from the proxy)
        tcpServer.close(); // Stop accepting after first connection

        const connection = createConnection(
            new StreamMessageReader(socket),
            new StreamMessageWriter(socket)
        );

        const lsp = new LspConnection(connection, {
            onInitialize,
            onInitialized,
            onShutdown,
            onExit,
        });
        lsp.listen();
    });
    tcpServer.listen(port, '127.0.0.1', () => {
        console.error(`${ExtensionName} listening on port ${port}`);
    });
} else {
    // Existing behavior — stdio
    const lsp = new LspConnection(createConnection(ProposedFeatures.all), {
        onInitialize,
        onInitialized,
        onShutdown,
        onExit,
    });
    lsp.listen();
}
```

> **Note:** This server change is optional. The proxy can spawn the server via stdio instead of connecting via socket. The `--socket` flag is useful if you want the server to run as a persistent system daemon independently of the proxy.

#### Summary of All Files

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| `cfn-lsp-proxy.ts` | New | ~350 | Multiplexing proxy daemon (contract-compliant rewrite, July 22) |
| `cfn-lsp-proxy-client.js` | New | ~25 | stdio↔TCP bridge for JetBrains |
| `extension.ts` | Modified | +85 | VS Code shared server integration + `aws/proxy/credentialsChanged` handler |
| `package.json` (VS Code) | Modified | +6 | New `sharedServer` setting |
| `CfnLspServerSupportProvider.kt` | Modified | +75 | JetBrains shared server integration + `aws/proxy/credentialsChanged` handler |
| `CfnLspSettings.kt` | Modified | +1 | New `isSharedServerEnabled` setting |
| `standalone.ts` | Modified (optional) | +15 | `--socket` flag for daemon mode |

### Multiplexing Correctness Review (July 22, 2026)

**Status:** ✅ The proxy code above (rewritten July 22, 2026) implements this contract — each defect ID below is annotated in the code. This section remains the definitive requirements list and review record.

#### The server's real message surface (verified from source)

**Client → Server (offline, document-scoped):** `hover`, `completion`, `codeAction`, `codeLens`, `definition`, `documentSymbol`, `executeCommand`, document sync (`didOpen/didChange/didClose/didSave`).

**Client → Server (online, credential-dependent):** the entire custom `aws/cfn/*` surface (~25 request types: stacks, change sets, deployments, validations, resources, resource state) plus `aws/credentials/iam/update` (request) and `aws/credentials/iam/delete` (notification).

**Server → Client requests (the hard part):**
- `workspace/configuration` (`LspWorkspace.getConfiguration`) — the settings pull; has a response the proxy must route
- `window/showMessageRequest` (`LspCommunication`) — user-facing dialogs with a response

**Server → Client notifications:** `textDocument/publishDiagnostics` (URI-scoped!), `window/showMessage`, `window/logMessage`, `telemetry/event`, custom `aws/documents/metadata` and document-preview notifications.

**Precedent check:** `ra-multiplex`/`lspmux` explicitly **"drops any requests from the server"** because they can't be tracked to a client (README, verified July 2026). That's tolerable for rust-analyzer; it is **disqualifying for the CFN server**, whose settings sync depends on `workspace/configuration` round-trips. This also means the "use lspmux directly" alternative in the effort estimate is NOT viable — our proxy must be built and must do better than the precedent.

#### Defects in the drafted proxy code

| # | Severity | Defect | Consequence |
|---|----------|--------|-------------|
| D1 | 🔴 Protocol-corrupting | **Server→client requests are misrouted.** `handleServerMessage` treats any message with `method` as a notification and **broadcasts** it. A `workspace/configuration` request broadcast to N clients yields N responses to one request ID — undefined behavior; and client responses (id, no method) flow through `handleClientMessage`'s request path, get their IDs rewritten, and are forwarded as garbage. | Settings pull breaks; protocol stream corrupts |
| D2 | 🔴 Protocol-corrupting | **Shared ID-space collision.** `nextProxyId` is used for both client session naming AND request IDs, and clients' own numeric IDs are only remapped client→server. Correct, but responses from *clients* (for server→client requests) aren't distinguished from requests at all (see D1) — and `$/cancelRequest` params carry raw client IDs that are never remapped, so cancellation hits the wrong (or no) request. | Cancel storms from one window kill another window's in-flight requests |
| D3 | 🟠 Feature-breaking | **`workspace/didChangeConfiguration` broadcast asymmetry.** Any client's config-change notification is forwarded; the server then pulls `workspace/configuration` — which (post-D1-fix) must be routed to exactly one client. Which one? JetBrains app-level settings are identical across windows (fine), but VS Code settings can differ per workspace. | Server state = last-puller-wins; windows can observe each other's settings |
| D4 | 🟠 Feature-breaking | **`publishDiagnostics` broadcast to all clients.** Diagnostics are URI-scoped. Broadcasting means window A receives diagnostics for files it never opened. JetBrains tolerates unknown URIs; but on `didClose`, the server clears diagnostics with an empty publish — broadcast means one window closing a file clears/flashes state everywhere the file is open. | Diagnostic flicker/loss when same file open in 2 windows |
| D5 | 🟠 Feature-breaking | **Document ownership not refcounted.** Same file open in 2 windows: window A's `didClose` makes the proxy forward it; server drops the document while window B still has it open. Window B's subsequent requests against that URI fail. | Requests fail for a doc that is still open in another window |
| D6 | 🟠 Feature-breaking | **Credential/encryption-key conflict** (Gap 5 in the sync section). Each window sends `aws/credentials/iam/update` encrypted with *its* key; server holds one key from init. Every non-first window's update fails decryption. | Online features work in exactly one window |
| D7 | 🟡 Robustness | **Client disconnect leaks server state.** On socket close the proxy just deletes the session. The server keeps that window's open documents forever (leak) and its pending server→client requests dangle. | Slow memory growth in shared server; hung server-side awaits |
| D8 | 🟡 Robustness | **Late-joiner document/capability skew.** Cached `initializeResult` replay is right, but the second client's `initialize` params (workspaceFolders, capabilities) are silently dropped. Server never learns window 2's workspace folders → schema/workspace features scoped to window 1's folders only. | Wrong workspace scoping for windows 2..N |
| D9 | 🟡 Robustness | **`shutdown` swallowed but `exit` not handled.** The draft ACKs `shutdown` per-client without forwarding (correct) but doesn't intercept `exit` — a client sending `exit` after shutdown ACK kills the shared server for everyone. | One window closing takes down all windows |

#### Required proxy behaviors (the correctness contract)

1. **Full JSON-RPC message classification.** Distinguish four message kinds on both sides: request (id+method), response (id, no method), notification (method, no id), cancellation (`$/cancelRequest`). The draft only classifies client-side requests.
2. **Bidirectional ID remapping.** Client→server requests: remap as drafted. Server→client requests: assign per-proxy ID, route to the **owning** client (see 3), remap the client's response back. Cancellations: translate `params.id` through the same maps in both directions.
3. **Deterministic routing for server→client requests:**
   - `workspace/configuration` → route to the **primary client** (first-connected, or explicitly elected). Document that shared-server mode implies shared settings; per-window settings divergence is unsupported (matches the credential same-user constraint).
   - `window/showMessageRequest` → route to the client whose activity triggered it if attributable (request causality is not tracked in LSP, so default: primary client).
4. **URI-scoped routing for document notifications.** Maintain a per-URI open-set (which clients have the doc open) from `didOpen`/`didClose`. Route `publishDiagnostics` and custom document notifications only to clients with that URI open. Broadcast only truly global notifications (`showMessage`, `logMessage`, `telemetry/event`).
5. **Document refcounting.** Forward `didOpen` to the server only on 0→1 transition; forward `didClose` only on 1→0. Suppress (but track) intermediate opens/closes. Content-version conflicts between two windows editing the same file are out of scope — last-writer-wins, same as today's per-window behavior when the same file is open twice.
6. **Workspace folder merging.** On a late client's `initialize`, diff its workspaceFolders against the server's known set and send `workspace/didChangeWorkspaceFolders` (added) to the server. On client disconnect, remove folders no surviving client claims. (The server advertises `workspaceFolders.changeNotifications: true` — verified in `LspCapabilities.ts`.)
7. **Client disconnect cleanup.** Synthesize `didClose` for every URI whose refcount drops to 0, fail that client's pending server→client request routes with an error response to the server, and release its folder claims.
8. **Lifecycle interception.** Swallow per-client `shutdown` (ACK) *and* `exit` (drop). Only the proxy's own last-client grace timer shuts the real server down — via a proper `shutdown`→`exit` handshake, not `kill()` (the draft's `cleanup()` uses `lspProcess.kill()`, which is exactly the orphan-creating pattern found on July 21).
9. **Credential handling (resolves D6/Gap 5).** Decision needed — two options:
   - **(a) Proxy-owned key (recommended):** proxy generates the encryption key, passes it in the (first) `initialize` options to the server, and *re-encrypts* each client's `iam/update` payload: decrypt with that client's key (clients pass their key to the proxy at connect time via a proxy-local handshake), re-encrypt with the proxy key. Keeps server unchanged.
   - **(b) Plaintext-over-localhost inside proxy handshake:** simpler but weakens the encryption story; rejected unless (a) proves impractical.
   - Either way: last-writer-wins on credentials, and the proxy re-broadcasts a custom `aws/proxy/credentialsChanged` notification so other windows' explorers refresh (ties into the July 21 sync fixes).
10. **Settings notification dedup.** Forward `workspace/didChangeConfiguration` to the server at most once per change-burst (debounce ~100ms); the server's pull model makes the notification content irrelevant (it's empty today — verified in `CfnClientService.notifyConfigurationChanged`).

#### Validation plan (must pass before enabling by default)

**Offline path (per window):** with 2+ windows connected — hover, completion, documentSymbol, codeAction in each window; verify responses land in the requesting window with original IDs; open the *same* file in both windows, verify diagnostics in both, close in one, verify the other keeps diagnostics (D4/D5).

**Settings propagation:** change a CFN setting (e.g., cfn-lint delay) in one window → verify server logs one `syncConfiguration` and the resulting settings match; verify `workspace/configuration` gets exactly one response (D1/D3); toggle cfn-lint enabled and verify diagnostics behavior changes in **all** windows (shared-settings semantics documented).

**Online path:** profile switch in window A → `iam/update` re-encrypted, accepted by server; stacks listing works from **both** windows afterward (D6); disconnect credentials → `iam/delete` forwarded once, both windows show unauthenticated state (integrates the July 21 sync fixes).

**Lifecycle:** close window 1 → window 2 unaffected, server stays up, window 1's exclusive docs closed on server (D7/D9); close last window → grace period → clean `shutdown`/`exit` (no orphan, cross-check with `ps`); kill proxy → both windows' LSP clients fall back to per-window spawn (regression to current behavior, not breakage); kill server → proxy exits → clients fall back.

**Stress/edge:** `$/cancelRequest` from window A while window B has in-flight requests (D2); two windows racing `initialize` at startup (mutex on first-init); late joiner with a different workspace folder (D8 — folder appears in server's workspace).

#### Revised effort estimate

The correctness contract roughly doubles the proxy's complexity vs the draft: ID remapping is bidirectional, routing is stateful (URI open-sets, folder claims, pending-request maps in both directions), and credential re-encryption adds a proxy-local handshake.

| Component | Draft estimate | Revised |
|-----------|---------------|---------|
| Proxy core (classification, bidirectional remapping, routing) | 3-5 days | 5-7 days |
| Credential re-encryption + proxy handshake | — | 2-3 days |
| Document refcounting + folder merging | — | 1-2 days |
| Client integrations + coordination | 3-4.5 days | 3-4.5 days |
| Validation plan execution | 3-4 days | 4-5 days |
| **Total** | 10-15 days | **15-21 days** |

The `lspmux` shortcut is withdrawn (drops server→client requests — disqualifying, see precedent check above).

---

## Orphaned Server Processes (Field Investigation, July 21, 2026)

**Status:** ✅ **Fix implemented (July 22, 2026)** — `standalone.ts` now exits on stdin end/close and races `close()` against a 5s timeout in the shutdown handler. Field-confirmed on stock released bits (server 1.8.0 bundle + released toolkit plugin, macOS) on July 21; manual multi-window re-test on patched bits still pending.

### Observation

With **2** IntelliJ project windows open, `ps` showed **4** live CFN LSP server processes:

| PID | RSS | Age at capture |
|-----|-----|----------------|
| 26540 | 687 MB | 3:07 |
| 26547 | 652 MB | 3:06 |
| 26593 | 666 MB | 2:52 |
| 26669 | 825 MB | 2:28 |

**Total: ~2.8GB** — versus ~1.3GB expected for the per-window design, and versus the ~500MB/instance the GitHub issue reported (real instances run 650-825MB). All four shared one parent JVM PID.

`idea.log` showed 4 `Starting CloudFormation LSP` entries within 39 seconds (10:24:01.8, :02.2, :16.6, :40.4) — two window-startup spawns followed by two **restarts whose predecessors never exited**. A prior session (7/13) showed the same churn: 6 starts in ~18 minutes. The extra processes are orphans: alive, full-sized, invisible to the IDE.

### Root cause chain

1. The platform restarts the server (settings change via `stopAndRestartIfNeeded()`, or perceived failure) and sends `shutdown`
2. The server's shutdown handler awaits `CfnServer.close()` → a deep chain covering Pyodide worker teardown, Guard, schema retriever, **telemetry flush (network I/O)**, and logger close — any of which can stall
3. No `shutdown` response → the client gives up, closes the streams, spawns a replacement
4. The old process gets **stdin EOF — which nothing handles** (`standalone.ts` registers no stream-close handler), and it cannot exit naturally because live handles keep the event loop alive: the Pyodide worker thread and OTEL metric timers
5. The vscode-languageserver library's two built-in escapes both miss: its exit-notification handler force-exits in a `finally` — but the `exit` notification never arrives (handshake abandoned); and its parent-PID watchdog (3s poll) only fires when the parent **dies** — the IntelliJ JVM is still alive, so closing windows never triggers it

Net: every abandoned restart leaks a ~700MB immortal process until the JVM itself exits.

### Fix (server-side, Phase 1)

```typescript
// standalone.ts — exit when the client abandons the connection,
// regardless of handshake state (standard well-behaved stdio LSP server pattern)
process.stdin.on('end', () => process.exit(0));
process.stdin.on('close', () => process.exit(0));
```

Plus a timeout on `close()` so a hung telemetry flush cannot block the `shutdown` response indefinitely:

```typescript
function onShutdown() {
    getLogger().info(`${ExtensionName} shutting down...`);
    return Promise.race([
        (server as any).close(),
        new Promise((resolve) => setTimeout(resolve, 5_000)), // respond even if close() hangs
    ]);
}
```

This hardening matters for **both** architectures: today it stops the per-window orphan leak; under Phase 3 it protects the shared server if the proxy crashes without a handshake. Relatedly, the proxy's own server-shutdown path must use the proper `shutdown` → `exit` handshake rather than `kill()` (see Multiplexing Correctness Review, requirement 8).

### Impact on the investigation's numbers

The effective memory cost of the current design is **per restart, not per window**: N windows × (1 + restarts) × ~700MB. The measured 650-825MB per instance also updates the doc's baseline (previous working figure was ~500MB from the GitHub issue).

---

## Credential and Settings Sync Issues (Online Components)

**Status:** ✅ **Implemented (July 22, 2026)** — Gaps 1-3 fixed across all three packages; Gap 4 investigated and closed as working-as-intended; Gap 5 is resolved by the proxy's credential re-encryption design (implemented in `cfn-lsp-proxy.ts`). See "Implementation Notes" at the end of this section for where the final code diverged from the sketches below. *(A previous revision dated this work July 21 — that implementation was not present in this workspace and was re-done on July 22, verified by `CfnCredentialsServiceTest` and the server unit suite.)*

Online components (stacks explorer, resource state, change sets) stopped working or showed stale data after profile changes. Root causes traced through both clients and the server.

### The Sync Flow Today

```
JetBrains: ToolkitConnectionManagerListener / CONNECTION_SETTINGS_STATE_CHANGED
             → CfnCredentialsService.sendCredentials()
             → server: handleIamCredentialsUpdate → updateProfileSettings(profile, region)
             → notifies subscribers: SchemaRetriever, GetSchemaTaskManager,
               ResourceStateManager, McpTools

VS Code:   awsContext.onDidChangeContext
             → AwsCredentialsService.updateCredentialsFromActiveConnection()
             → same server path
```

The server side is sound: `AwsClient` constructs a fresh SDK client per call from `credentialsProvider.getIAM()`, so new credentials take effect immediately once they arrive. `SettingsParser` preserves the current profile when workspace config omits it, so `didChangeConfiguration` → `syncConfiguration()` does not clobber profile state. The gaps are in **what triggers a refresh and what happens on failure**.

### Gap 1: JetBrains — Profile Switch (Same Region) Never Refreshes Online Components

**File:** `CfnCredentialsService.kt`

The stacks/resources clear+reload only happens when `onRegionChange = true`:

```kotlin
fun sendCredentials(onRegionChange: Boolean = false) {
    // ...
    if (onRegionChange && result?.success == true) {
        stacksManager.clear()
        resourceLoader.clear(null)
        stacksManager.reload()
    }
}
```

`onRegionChange` is only true when the **region** changed (`lastRegionId != newRegionId`). Switching from profile A to profile B in the same region sends new credentials but leaves the explorer showing profile A's data. The `activeConnectionChanged` listener path calls `sendCredentials()` with no flag — it never refreshes.

**Fix:** Track credential identity (profile name), not just region. Refresh on any identity change:

```kotlin
private var lastRegionId: String? = ...
private var lastProfileName: String? = null  // NEW

override fun settingsStateChanged(newState: ConnectionState) {
    if (newState is ConnectionState.ValidConnection) {
        val newRegionId = newState.region.id
        val newProfileName = resolveCredentials()?.profile
        val identityChanged = (lastRegionId != null && lastRegionId != newRegionId) ||
                              (lastProfileName != null && lastProfileName != newProfileName)
        lastRegionId = newRegionId
        lastProfileName = newProfileName
        sendCredentials(refreshOnlineComponents = identityChanged)
    }
}
```

Rename `onRegionChange` → `refreshOnlineComponents` to reflect intent.

### Gap 2: Both Clients — Nothing Sent When Credentials Become Unavailable

- JetBrains `resolveCredentials()` returns `null` (no region selected, resolution failure) → `sendCredentials` silently returns. Server keeps operating on the old credentials.
- VS Code: `if (credentials && profileName)` guard — when falsy, no update is sent.

Neither client ever sends `IamCredentialsDeleteNotification` (`aws/credentials/iam/delete`). The server's `handleIamCredentialsDelete` handler exists but is effectively dead code. Result: online components keep using stale (possibly expired) credentials and fail with confusing auth errors instead of a clean unauthenticated state.

**Fix:** When the connection becomes invalid or credentials resolve to null, send the delete notification and put the explorer into an explicit "not connected" state:

```kotlin
// JetBrains
fun sendCredentials(refreshOnlineComponents: Boolean = false) {
    val credentials = resolveCredentials()
    if (credentials == null) {
        CfnClientService.getInstance(project).deleteIamCredentials()  // NEW
        StacksManager.getInstance(project).clear()
        ResourceLoader.getInstance(project).clear(null)
        return
    }
    // ... existing path
}
```

```typescript
// VS Code
if (credentials && profileName) {
    // ... existing update path
} else {
    await this.client.sendNotification('aws/credentials/iam/delete')  // NEW
}
```

### Gap 3: Failure Results Logged But Not Acted On

**Server** (`AwsCredentials.handleIamCredentialsUpdate` catch block): on decrypt/validation failure it wipes `iamCredentials` and resets profile settings to defaults. **Client** (JetBrains): logs `success=${result?.success}` and does nothing. A single bad update permanently breaks online features until the next profile-change event fires.

**Fixes:**
1. Server: on failed update, keep the previous valid credentials instead of resetting to defaults (a failed *new* credential push shouldn't destroy a working session). Log + count the fault.
2. Clients: on `success=false`, retry once; if still failing, surface a notification ("CloudFormation online features unavailable — credential sync failed") instead of failing silently.

### Gap 4: VS Code — Region Source-of-Truth Mismatch

`updateCredentialsFromActiveConnection()` sends `region: this.regionManager.getSelectedRegion()` — the CFN explorer's own region picker — paired with the active profile's credentials. If the explorer region and the profile's intended region disagree, stack/resource queries target the wrong region. Verify the initial value of `regionManager` matches the active profile's default region, and reconcile which component owns region selection.

### Gap 5: Interaction With the Phase 3 Shared Server

This must be resolved **before** Phase 3 ships, because the shared server makes it worse:

1. **Encryption keys are per-window.** Each JetBrains window generates its own AES key (`CfnCredentialsService.generateKey()`), and VS Code generates `encryptionKey` per extension host. The server stores **one** decryption key from initialization options. With N windows sharing one server, only the window whose key was used at init can push credentials — every other window's `iam/update` fails decryption (and, per Gap 3, wipes working credentials).
2. **Last-writer-wins on credentials.** `AwsCredentials` stores a single credential set. Windows using different profiles would fight over it.

**Design constraints for the Phase 3 proxy:**
- The proxy must own a single encryption key and pass it to the server at init; per-window keys are re-encrypted or replaced at the proxy boundary (or the proxy handles `iam/update` itself and forwards with the canonical key).
- Same-user assumption: document that all windows share one credential set; a credential update from any window applies to all (acceptable for same-user, same-machine).
- Fix Gap 3 first so a failed decrypt can't wipe the shared session's working credentials.

### Sync Work Items

| # | Item | Component | Status |
|---|------|-----------|--------|
| 1 | Refresh stacks/resources on any credential identity change (profile OR region) | JetBrains `CfnCredentialsService.kt` | ✅ Done |
| 2 | Send `iam/delete` on disconnect; explicit unauthenticated explorer state | Both clients | ✅ Done |
| 3 | Keep previous credentials on failed update; client retry + notify on `success=false` | Server + both clients | ✅ Done |
| 4 | Reconcile region source of truth | VS Code | ✅ Closed — working as intended (see notes) |
| 5 | Proxy credential/key design (prerequisite for Phase 3) | Proxy design | ✅ Done — proxy-owned key + re-encryption implemented in `cfn-lsp-proxy.ts` |

### Implementation Notes (July 21, 2026)

The final implementation diverged from the sketches above in a few places:

**Gap 1 — identity detection centralized in `sendCredentials` (not `settingsStateChanged`).** Instead of tracking `lastProfileName` in the listener, both `lastProfileName` and `lastRegionId` are compared inside `sendCredentials()` after `resolveCredentials()` succeeds. This gives every trigger path (`activeConnectionChanged`, `settingsStateChanged`, manual calls) identity-change detection for free, and the listener simplifies to just `sendCredentials()`. The `onRegionChange` parameter was renamed to `refreshOnlineComponents`; a change is detected when either profile or region differs from the last successful push.

**Gap 2 — new protocol plumbing on JetBrains.** `aws/credentials/iam/delete` had no client-side binding, so it was added:
- `CfnLspServerProtocol.kt`: `@JsonNotification("aws/credentials/iam/delete") fun deleteIamCredentials()`
- `CfnClientService.kt`: `deleteIamCredentials()` wrapper
- `CfnCredentialsService.kt`: new `handleCredentialsUnavailable()` — clears identity tracking, sends the delete, clears stacks + resources. Called when `resolveCredentials()` returns null AND on `ConnectionState.InvalidConnection` (previously ignored; transient states like validating/incomplete still wait for a terminal state).
- VS Code `credentials.ts`: else-branch sends `aws/credentials/iam/delete` (the existing unconditional `stacksManager.clear()` + `resourcesManager.reload()` already handled the UI side).

**Gap 3 — both directions fixed.**
- Server `AwsCredentials.handleIamCredentialsUpdate`: catch block no longer wipes `iamCredentials` or resets profile settings — previous valid credentials survive a failed push. *Additionally*, `handleIamCredentialsDelete` now resets profile settings to defaults (that reset moved from the failure path to the delete path, where it belongs — subscribers drop the stale profile on explicit sign-out).
- JetBrains: `pushCredentials()` retries once on `success=false` (`MAX_UPDATE_ATTEMPTS = 2`), then raises `notifyWarn` ("Online features may be unavailable").
- VS Code: `sendCredentialsUpdate()` mirrors this — one retry, then `showWarningMessage`.

**Gap 4 — closed without code change.** Investigation showed `CloudFormationRegionManager.getSelectedRegion()` already falls back correctly: explicit CFN panel selection → credential default region → AWS explorer region → us-east-1. The "mismatch" only occurs when the user has explicitly pinned a panel region, which is intended behavior.

**Tests updated:**
- Server `tst/unit/auth/AwsCredentials.test.ts`: failed-update test now asserts profile settings are *not* touched; new test proves previous credentials survive a failed update; delete test asserts the settings reset.
- JetBrains `CfnCredentialsServiceTest.kt`: no-region test now expects `deleteIamCredentials()`; mocks return real `UpdateCredentialsResult(success = true)` since the code now branches on it.

**Verification status (July 22, 2026):** Server `tsc -b` passes and the full vitest unit suite passes (3561 tests) — the host Node was upgraded to 20.20.2, clearing the earlier vite 7 version blocker. JetBrains `compileKotlin`/`compileTestKotlin` pass and `CfnCredentialsServiceTest` passes 5/5 (including new tests for the delete-on-unavailable, retry, and profile-change-refresh paths). VS Code `packages/core` typecheck (`tsc --noEmit`) passes.

---

## Recommendation

Implement in phases:

### Phase 1 (Immediate — Bug Fixes)
0. **Fix the bug** — Add `enabled` check to `CfnLintService.initialize()` (1 line!)
1. **Add memory limit** — `--max-old-space-size=512` on the main process in both clients + `resourceLimits` on the Pyodide worker thread
2. **Credential sync fixes** — Gaps 1-4 from "Credential and Settings Sync Issues": refresh online components on any credential identity change, send `iam/delete` on disconnect, handle failed updates gracefully, reconcile region source of truth
3. **Orphan-process fix** — exit on stdin EOF + timeout on `close()` (see "Orphaned Server Processes"). Each orphan costs a full ~700MB instance; field-confirmed on stock 1.8.0

### Phase 2 (High Impact — Lazy Loading)
3. **Lazy-load Pyodide** — Only load when cfn-lint is actually used
4. **Lazy-load Guard** — Only load when Guard rules are present
5. **Add master enable/disable toggle** — Let users disable CFN LSP entirely

> ⚠️ **Decision (July 2026):** Team decided **against** lazy loading (items 3-4). Rationale: the 5-10s Pyodide cold-start penalty would land on the user's first lint (worst moment); initialization failures would surface mid-workflow instead of at startup; and with lint-on-open/save defaults, most users with lint enabled trigger Pyodide anyway. The master toggle (item 5) remains — it's what the GitHub issue user asked for. Consequence: the memory story for active-linting users with many windows rests entirely on Phase 3.

### Phase 3 (Power Users — Shared Server)
6. **Shared LSP server via external multiplexing proxy** — A separate Node.js proxy process (Approach A) accepts connections from all IDE windows and multiplexes them to one server instance. See "Phase 3 Architecture Decision" section for full analysis of Approach A vs B. **Prerequisite:** credential/key design (Gap 5 in the sync issues section) — per-window encryption keys must be resolved at the proxy boundary.
7. **On-demand schema loading** — Reduce schema memory footprint

> ⚠️ **Note:** Both JetBrains and VS Code windows are separate OS processes. Both require the same external proxy/daemon pattern (validated by `ra-multiplex`/`lspmux`, 518 ⭐). Estimated effort: **15-21 days** per the Multiplexing Correctness Review — the `lspmux` shortcut was withdrawn (it drops server→client requests, which this server requires for `workspace/configuration` settings pulls and `window/showMessageRequest`).

## Expected Outcomes

| Scenario | Current | After Phase 1 | After Phase 2 | After Phase 3* |
|----------|---------|---------------|---------------|----------------|
| User has `cfnLint.enabled = false` | 500MB | **200MB** | 200MB | 200MB |
| User only uses autocompletion | 500MB | 500MB (capped) | **150-200MB** | 150-200MB |
| User uses cfn-lint actively | 500MB | 500MB (capped) | 400-500MB | 400-500MB |
| 5 IntelliJ windows (no linting) | 2.5GB | **1GB** | 1GB | 1GB |
| 5 IntelliJ windows (with linting) | 2.5GB | 2.5GB (capped) | 2-2.5GB | **~600MB** |
| 3 IntelliJ + 2 VS Code (linting) | 2.5GB | 2.5GB (capped) | 2-2.5GB | **~1.1GB**† |
| **10 IntelliJ + 5 VS Code (linting)** | **7.5GB** | 7.5GB (capped) | 6-7.5GB | **~1.1GB**†† |

*\*Phase 3 assumes same-IDE-family sharing (JetBrains shares with JetBrains, VS Code shares with VS Code)*

*†With same-IDE-family sharing: 3 IntelliJ windows share one ~500MB server + 2 VS Code windows share another ~500MB server + ~100MB proxy overhead = ~1.1GB total.*

*††With same-IDE-family sharing: 10 IntelliJ windows share one ~500MB server + 5 VS Code windows share another ~500MB server + ~100MB proxy overhead = ~1.1GB total. This is the target architecture — **2 servers total regardless of window count**, saving ~6.4GB compared to today.*

## Files to Modify

### Phase 1 (Bug Fix + Memory Limit)

**Language Server:**
- `src/services/cfnLint/CfnLintService.ts` — Add `if (!this.settings.enabled) return;` at top of `initialize()`

**JetBrains Client:**
- `plugins/toolkit/jetbrains-core/src-253+/software/aws/toolkits/jetbrains/services/cfnlsp/server/CfnLspServerSupportProvider.kt` — Add NODE_OPTIONS with `--max-old-space-size=512`

**VS Code Client:**
- `packages/core/src/awsService/cloudformation/extension.ts` — Add NODE_OPTIONS to ServerOptions

### Phase 2 (Lazy Loading + Toggle)

**Language Server:**
- `src/handlers/Initialize.ts` — Remove eager `cfnLintService.initialize()` and `mountFolder()` calls
- `src/services/cfnLint/CfnLintService.ts` — Add lazy mount in `lintTemplate()`/`lintFile()`
- `src/services/guard/GuardService.ts` — Verify lazy initialization

**JetBrains Client:**
- `plugins/toolkit/jetbrains-core/src/software/aws/toolkits/jetbrains/settings/CfnLspSettings.kt` — Add master `isEnabled` setting
- `plugins/toolkit/jetbrains-core/src-253+/software/aws/toolkits/jetbrains/services/cfnlsp/CfnLspStartupActivity.kt` — Guard with `isEnabled` check

**VS Code Client:**
- `packages/toolkit/package.json` — Add `aws.cloudformation.enabled` setting

### Phase 3 (Shared Server)

**Language Server:**
- `src/app/standalone.ts` — Ensure socket transport works correctly with multiple connections
- `src/protocol/LspConnection.ts` — May need modifications for multi-client credential handling
- `src/auth/AwsCredentials.ts` — Handle per-client credential storage

**JetBrains Client:**
- New file: `SharedCfnLspManager.kt` — Application-level service to manage shared server lifecycle
- `CfnLspServerSupportProvider.kt` — Modify to connect to shared server instead of spawning process
- May need custom LSP client implementation instead of using `ProjectWideLspServerDescriptor`

**VS Code Client:**
- `packages/core/src/awsService/cloudformation/extension.ts` — Modify to use socket connection and share server across workspace windows

## Implementation Steps

### Phase 1: Bug Fix + Memory Limit (1-2 days)

#### Step 1.0: Fix cfn-lint `enabled` Setting Bug

**File:** `src/services/cfnLint/CfnLintService.ts`

1. Open `CfnLintService.ts` and locate the `initialize()` method
2. Add the enabled check at the very top of the method:

```typescript
public async initialize(): Promise<void> {
    // NEW: Respect the enabled setting — skip Pyodide entirely if disabled
    if (!this.settings.enabled) {
        this.status = STATUS.Initialized;
        this.logger.info('cfn-lint is disabled, skipping Pyodide initialization');
        return;
    }

    if (this.status !== STATUS.Uninitialized) {
        return;
    }
    // ... rest of existing code unchanged
}
```

3. Run tests: `npm run test`
4. Verify manually:
    - Set `cfnLint.enabled = false` in IDE settings
    - Open a CFN template
    - Check Node.js process memory (should be ~200MB instead of ~500MB)

**Estimated time:** 30 minutes

#### Step 1.1: Add Memory Limit to JetBrains Client

**File:** `plugins/toolkit/jetbrains-core/src-253+/software/aws/toolkits/jetbrains/services/cfnlsp/server/CfnLspServerSupportProvider.kt`

1. Locate the method that creates the server command line (likely `createCommandLine()` or similar)
2. Add NODE_OPTIONS environment variable:

```kotlin
private fun createCommandLine(): GeneralCommandLine {
    return GeneralCommandLine(nodePath, serverPath, "--stdio")
        .withEnvironment("NODE_OPTIONS", "--max-old-space-size=512")
        // ... existing code
}
```

3. Build: `brazil-build release` (from the JetBrains package directory)
4. Test manually: Open IDE, open CFN template, monitor memory usage

**Estimated time:** 1-2 hours

#### Step 1.2: Add Memory Limit to VS Code Client

**File:** `packages/core/src/awsService/cloudformation/extension.ts`

1. Locate `ServerOptions` configuration
2. Add NODE_OPTIONS to the environment:

```typescript
const envOptions = {
    ...process.env,
    NODE_OPTIONS: '--max-old-space-size=512',
    // ... existing env options
};

const serverOptions: ServerOptions = {
    run: {
        module: serverFile,
        transport: TransportKind.ipc,
        options: { env: envOptions },
    },
    debug: {
        module: serverFile,
        transport: TransportKind.ipc,
        options: { env: envOptions, execArgv: ['--nolazy', '--inspect=6009'] },
    },
};
```

3. Build and test the extension
4. Verify memory is capped at ~512MB under load

**Estimated time:** 1-2 hours

---

### Phase 2: Lazy Loading (3-5 days)

> ⚠️ **REJECTED (July 2026):** the team decided against lazy loading — see the decision note in the Recommendation section (cold-start penalty on first lint, late failure surfacing). Steps 2.0-2.1 below are retained for the record only. **Step 2.2 (master toggle) remains in scope.**

#### Step 2.0: Lazy-Load Pyodide

**Files to modify:**
- `src/handlers/Initialize.ts`
- `src/services/cfnLint/CfnLintService.ts`

**Step 2.0.1: Remove eager initialization from Initialize.ts**

1. Open `src/handlers/Initialize.ts`
2. Find the `initializedHandler` function
3. Remove/comment the eager cfnLintService calls:

```typescript
// BEFORE:
components.settingsManager
    .syncConfiguration()
    .then(() => {
        components.schemaRetriever.initialize();
        return components.cfnLintService.initialize();  // REMOVE THIS
    })
    .then(() => {
        // REMOVE THIS BLOCK:
        for (const folder of workspace.getAllWorkspaceFolders()) {
            await components.cfnLintService.mountFolder(folder);
        }
    });

// AFTER:
components.settingsManager
    .syncConfiguration()
    .then(() => {
        components.schemaRetriever.initialize();
        // cfn-lint will initialize lazily on first lint request
    });
```

**Step 2.0.2: Add lazy mounting to CfnLintService**

1. Open `src/services/cfnLint/CfnLintService.ts`
2. Add a method to lazily ensure folders are mounted:

```typescript
private mountedFolders: Set<string> = new Set();
private initializationPromise: Promise<void> | null = null;

private async ensureInitializedAndMounted(uri: string): Promise<void> {
    // Lazy initialize if needed
    if (this.status === STATUS.Uninitialized) {
        if (!this.initializationPromise) {
            this.initializationPromise = this.initialize();
        }
        await this.initializationPromise;
    }

    // Find workspace folder for this URI and mount if needed
    const workspaceFolder = this.findWorkspaceFolder(uri);
    if (workspaceFolder && !this.mountedFolders.has(workspaceFolder)) {
        await this.mountFolder(workspaceFolder);
        this.mountedFolders.add(workspaceFolder);
    }
}

private findWorkspaceFolder(uri: string): string | undefined {
    // Get workspace folders from LspWorkspace
    const folders = this.workspace.getAllWorkspaceFolders();
    return folders.find(folder => uri.startsWith(folder));
}
```

3. Modify `lintTemplate()` and `lintFile()` to call the lazy initializer:

```typescript
public async lintTemplate(uri: string, content: string): Promise<Diagnostic[]> {
    if (!this.settings.enabled) {
        return [];
    }
    
    // NEW: Ensure initialized and folder mounted before linting
    await this.ensureInitializedAndMounted(uri);
    
    // ... existing linting logic
}

public async lintFile(uri: string): Promise<Diagnostic[]> {
    if (!this.settings.enabled) {
        return [];
    }
    
    await this.ensureInitializedAndMounted(uri);
    
    // ... existing linting logic
}
```

4. Remove the check that throws in `mountFolder()`:

```typescript
// BEFORE:
public async mountFolder(folder: string): Promise<void> {
    if (this.status === STATUS.Uninitialized) {
        throw new Error('CfnLintService not initialized. Call initialize() first.');
    }
    // ...
}

// AFTER:
public async mountFolder(folder: string): Promise<void> {
    // Removed the throw — caller ensures initialization via ensureInitializedAndMounted()
    // ...
}
```

**Step 2.0.3: Add tests**

1. Create test in `tst/unit/services/cfnLint/CfnLintService.test.ts`:

```typescript
describe('lazy initialization', () => {
    it('should not load Pyodide until first lint request', async () => {
        const service = new CfnLintService(/* mocks */);
        
        // Verify not initialized
        expect(service.status).toBe(STATUS.Uninitialized);
        
        // Call lint
        await service.lintTemplate('file:///test/template.yaml', 'AWSTemplateFormatVersion: "2010-09-09"');
        
        // Now should be initialized
        expect(service.status).toBe(STATUS.Initialized);
    });
    
    it('should skip initialization when disabled', async () => {
        const service = new CfnLintService(/* mocks with enabled=false */);
        
        const result = await service.lintTemplate('file:///test/template.yaml', 'content');
        
        expect(result).toEqual([]);
        expect(service.status).toBe(STATUS.Uninitialized);  // Never initialized Pyodide
    });
});
```

**Step 2.0.4: Verify**

1. Run full test suite: `npm run test`
2. Manual testing:
    - Start IDE, open a CFN template
    - Check memory immediately (~150-200MB expected)
    - Trigger validation (save file or manual validate)
    - Watch memory increase to ~400-500MB
    - Confirm linting still works

**Estimated time:** 2-3 days

#### Step 2.1: Lazy-Load Guard WASM

**File:** `src/services/guard/GuardService.ts`

1. Follow similar pattern as cfn-lint
2. Only initialize Guard WASM when `.guard` files are detected or validation is triggered
3. Add test coverage

**Estimated time:** 1 day

#### Step 2.2: Add Master Enable/Disable Toggle

**JetBrains:**

1. **File:** `plugins/toolkit/jetbrains-core/src/software/aws/toolkits/jetbrains/settings/CfnLspSettings.kt`

```kotlin
@State(name = "CfnLspSettings", storages = [Storage("aws.xml")])
class CfnLspSettings : PersistentStateComponent<CfnLspSettings.State> {
    data class State(
        var isEnabled: Boolean = true,  // NEW
        var cfnLintEnabled: Boolean = true,
        // ... existing settings
    )
    
    companion object {
        fun getInstance(): CfnLspSettings = service()
    }
    
    var isEnabled: Boolean
        get() = state.isEnabled
        set(value) { state.isEnabled = value }
    
    // ... existing code
}
```

2. **File:** `CfnLspStartupActivity.kt` — Add guard:

```kotlin
override fun runActivity(project: Project) {
    if (!CfnLspSettings.getInstance().isEnabled) {
        LOG.info("CloudFormation LSP is disabled")
        return
    }
    // ... existing startup logic
}
```

3. Add UI toggle in AWS Toolkit settings page

**VS Code:**

1. **File:** `packages/toolkit/package.json` — Add setting:

```json
"aws.cloudformation.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable CloudFormation language support (requires reload)",
    "scope": "window"
}
```

2. **File:** `extension.ts` — Check setting before starting server:

```typescript
export async function activate(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('aws.cloudformation');
    if (!config.get<boolean>('enabled', true)) {
        console.log('CloudFormation LSP is disabled');
        return;
    }
    
    // ... existing activation logic
}
```

**Estimated time:** 1 day

---

### Phase 3: Shared Server (7-10 days per IDE)
#### Step 3.0: Server-Side — Multiplexing Proxy

The LSP server itself (`standalone.ts`) remains unchanged — it still uses `createConnection(ProposedFeatures.all)` and speaks to a single connection via stdio. The proxy is a separate Node.js process that sits between multiple clients and the single server.

> **Canonical implementation:** see "Full Implementation Code → 1. Multiplexing Proxy (`cfn-lsp-proxy.ts`)" in the Phase 3 Architecture Decision section (rewritten July 22, 2026 to satisfy the Multiplexing Correctness Review contract). An earlier simplified sketch previously duplicated here was removed — it predated the correctness review and contained the D1-D9 defects (notification-broadcast of server→client requests, no cancellation remapping, no document refcounting, `kill()`-based shutdown).

Implementation tasks for this step:
1. Create `cfn-lsp-proxy.ts` from the canonical code
2. Wire it into the bundle build (webpack entry alongside `cfn-lsp-server-standalone.js`)
3. Unit-test the routing tables (c2s/s2c remapping, URI open-sets, folder claims) in isolation
4. Execute the "Validation plan" from the Multiplexing Correctness Review before enabling by default

#### Step 3.1: JetBrains Shared Server Manager

**New file:** `plugins/toolkit/jetbrains-core/src/software/aws/toolkits/jetbrains/services/cfnlsp/SharedCfnLspManager.kt`

```kotlin
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import java.io.File
import java.net.ServerSocket
import java.util.concurrent.atomic.AtomicInteger

@Service(Service.Level.APP)
class SharedCfnLspManager {
    private val LOG = logger<SharedCfnLspManager>()
    
    private var serverProcess: Process? = null
    private var serverPort: Int? = null
    private val connectedProjects = AtomicInteger(0)
    private val lock = Object()
    
    companion object {
        fun getInstance(): SharedCfnLspManager = service()
        private const val SHUTDOWN_DELAY_MS = 30_000L
    }
    
    /**
     * Ensures the shared CFN LSP server is running.
     * Returns the port to connect to.
     */
    fun ensureServerRunning(): Int {
        synchronized(lock) {
            if (serverProcess?.isAlive == true && serverPort != null) {
                return serverPort!!
            }
            
            // Find available port
            serverPort = findAvailablePort()
            
            // Start server
            val nodePath = findNodePath()
            val serverPath = findServerPath()
            
            LOG.info("Starting shared CFN LSP server on port $serverPort")
            
            serverProcess = ProcessBuilder(
                nodePath,
                serverPath,
                "--socket=$serverPort"
            )
                .redirectErrorStream(true)
                .start()
            
            // Wait for server to be ready
            waitForServerReady(serverPort!!)
            
            return serverPort!!
        }
    }
    
    /**
     * Called when a project connects to the shared server.
     */
    fun registerProject(projectId: String) {
        val count = connectedProjects.incrementAndGet()
        LOG.info("Project $projectId connected, total: $count")
    }
    
    /**
     * Called when a project disconnects.
     * Shuts down server after delay if no projects remain.
     */
    fun unregisterProject(projectId: String) {
        val count = connectedProjects.decrementAndGet()
        LOG.info("Project $projectId disconnected, remaining: $count")
        
        if (count == 0) {
            scheduleShutdown()
        }
    }
    
    private fun scheduleShutdown() {
        Thread {
            Thread.sleep(SHUTDOWN_DELAY_MS)
            synchronized(lock) {
                if (connectedProjects.get() == 0) {
                    LOG.info("No projects connected, shutting down server")
                    serverProcess?.destroy()
                    serverProcess = null
                    serverPort = null
                }
            }
        }.start()
    }
    
    private fun findAvailablePort(): Int {
        ServerSocket(0).use { socket ->
            return socket.localPort
        }
    }
    
    private fun waitForServerReady(port: Int, timeoutMs: Long = 10_000) {
        val start = System.currentTimeMillis()
        while (System.currentTimeMillis() - start < timeoutMs) {
            try {
                java.net.Socket("localhost", port).close()
                return  // Server is accepting connections
            } catch (e: Exception) {
                Thread.sleep(100)
            }
        }
        throw RuntimeException("Server failed to start within ${timeoutMs}ms")
    }
    
    private fun findNodePath(): String {
        // Use existing node path resolution logic
        return CfnLspServerSupportProvider.findNodePath()
    }
    
    private fun findServerPath(): String {
        // Use existing server path resolution logic
        return CfnLspServerSupportProvider.findServerPath()
    }
}
```

**Estimated time:** 2-3 days

#### Step 3.2: Modify JetBrains LSP Client to Use Shared Server

**File:** `CfnLspServerSupportProvider.kt`

```kotlin
class CfnLspServerSupportProvider : LspServerSupportProvider {
    
    override fun createServer(project: Project): LspServer {
        val manager = SharedCfnLspManager.getInstance()
        val port = manager.ensureServerRunning()
        
        // Register this project
        manager.registerProject(project.locationHash)
        
        // Create socket-based LSP client
        return SocketLspServer(
            project = project,
            port = port,
            onDispose = {
                manager.unregisterProject(project.locationHash)
            }
        )
    }
}

class SocketLspServer(
    private val project: Project,
    private val port: Int,
    private val onDispose: () -> Unit
) : LspServer {
    
    private var socket: Socket? = null
    private var client: LanguageClient? = null
    
    override fun start() {
        socket = Socket("localhost", port)
        
        // Initialize LSP client over socket
        client = LanguageClient(
            input = socket!!.getInputStream(),
            output = socket!!.getOutputStream()
        )
        
        // Send initialize request with this project's workspace folder
        client!!.initialize(InitializeParams().apply {
            workspaceFolders = listOf(
                WorkspaceFolder(project.basePath, project.name)
            )
        })
    }
    
    override fun stop() {
        // Send workspace/didChangeWorkspaceFolders to remove our folder
        client?.workspaceDidChangeWorkspaceFolders(
            DidChangeWorkspaceFoldersParams().apply {
                event = WorkspaceFoldersChangeEvent().apply {
                    removed = listOf(WorkspaceFolder(project.basePath, project.name))
                }
            }
        )
        
        socket?.close()
        onDispose()
    }
}
```

**Note:** This is a simplified example. The actual JetBrains LSP API may require different patterns. Consult `com.intellij.platform.lsp` documentation.

**Estimated time:** 3-4 days

#### Step 3.3: VS Code Shared Server Implementation

**File:** `packages/core/src/awsService/cloudformation/extension.ts`

```typescript
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { LanguageClient, StreamInfo } from 'vscode-languageclient/node';
import * as lockfile from 'proper-lockfile';

const LOCK_FILE = 'cfn-lsp.lock';
const PORT_FILE = 'cfn-lsp.port';
const PID_FILE = 'cfn-lsp.pid';

let sharedServerPort: number | undefined;
let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext) {
    const globalStoragePath = context.globalStorageUri.fsPath;
    await fs.promises.mkdir(globalStoragePath, { recursive: true });
    
    // Ensure shared server is running
    const port = await ensureSharedServerRunning(globalStoragePath, context);
    sharedServerPort = port;
    
    // Create language client with socket connection
    const serverOptions = (): Promise<StreamInfo> => {
        return new Promise((resolve, reject) => {
            const socket = net.connect({ port }, () => {
                resolve({
                    reader: socket,
                    writer: socket
                });
            });
            socket.on('error', reject);
        });
    };
    
    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'yaml' },
            { scheme: 'file', language: 'json' }
        ],
        // ... existing options
    };
    
    client = new LanguageClient(
        'cfn-lsp',
        'CloudFormation Language Server',
        serverOptions,
        clientOptions
    );
    
    await client.start();
    
    // Add workspace folder for this window
    if (vscode.workspace.workspaceFolders?.length) {
        await client.sendNotification('workspace/didChangeWorkspaceFolders', {
            event: {
                added: vscode.workspace.workspaceFolders.map(f => ({
                    uri: f.uri.toString(),
                    name: f.name
                })),
                removed: []
            }
        });
    }
    
    // Clean up on deactivate
    context.subscriptions.push({
        dispose: async () => {
            await removeWorkspaceFolders();
            // Don't stop server — other windows may be using it
        }
    });
}

async function ensureSharedServerRunning(
    storagePath: string,
    context: vscode.ExtensionContext
): Promise<number> {
    const lockPath = path.join(storagePath, LOCK_FILE);
    const portPath = path.join(storagePath, PORT_FILE);
    const pidPath = path.join(storagePath, PID_FILE);
    
    // Try to acquire lock
    let release: (() => Promise<void>) | undefined;
    try {
        release = await lockfile.lock(storagePath, {
            lockfilePath: lockPath,
            retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 }
        });
    } catch (e) {
        // Another window has the lock — wait for port file
        return await waitForPortFile(portPath);
    }
    
    try {
        // Check if server is already running
        if (fs.existsSync(portPath) && fs.existsSync(pidPath)) {
            const existingPort = parseInt(fs.readFileSync(portPath, 'utf8'), 10);
            const existingPid = parseInt(fs.readFileSync(pidPath, 'utf8'), 10);
            
            if (isProcessRunning(existingPid) && await isPortResponding(existingPort)) {
                return existingPort;
            }
        }
        
        // Start new server
        const port = await findFreePort();
        const serverProcess = await startServer(port, context);
        
        // Write port and PID files
        fs.writeFileSync(portPath, port.toString());
        fs.writeFileSync(pidPath, serverProcess.pid!.toString());
        
        // Wait for server to be ready
        await waitForServerReady(port);
        
        return port;
    } finally {
        if (release) {
            await release();
        }
    }
}

async function startServer(port: number, context: vscode.ExtensionContext): Promise<ChildProcess> {
    const serverPath = context.asAbsolutePath('dist/cfn-lsp-server-standalone.js');
    const nodePath = await findNodePath();
    
    const serverProcess = spawn(nodePath, [serverPath, `--socket=${port}`], {
        detached: true,  // Keep running after VS Code closes
        stdio: 'ignore',
        env: {
            ...process.env,
            NODE_OPTIONS: '--max-old-space-size=512'
        }
    });
    
    serverProcess.unref();  // Don't wait for this process
    
    return serverProcess;
}

async function findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, () => {
            const { port } = server.address() as net.AddressInfo;
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
}

async function waitForPortFile(portPath: string, timeoutMs = 10000): Promise<number> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (fs.existsSync(portPath)) {
            return parseInt(fs.readFileSync(portPath, 'utf8'), 10);
        }
        await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('Timeout waiting for shared server port file');
}

async function waitForServerReady(port: number, timeoutMs = 10000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await isPortResponding(port)) {
            return;
        }
        await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('Timeout waiting for server to be ready');
}

async function isPortResponding(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = net.connect({ port }, () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () => resolve(false));
    });
}

function isProcessRunning(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

async function removeWorkspaceFolders(): Promise<void> {
    if (!client || !vscode.workspace.workspaceFolders) return;
    
    await client.sendNotification('workspace/didChangeWorkspaceFolders', {
        event: {
            added: [],
            removed: vscode.workspace.workspaceFolders.map(f => ({
                uri: f.uri.toString(),
                name: f.name
            }))
        }
    });
}
```

**Estimated time:** 3-4 days

#### Step 3.4: Testing

1. **Unit tests** for SharedCfnLspManager (JetBrains) and ensureSharedServerRunning (VS Code)

2. **Integration tests:**
    - Open 3 IDE windows with different projects
    - Verify only one `cfn-lsp-server` process is running
    - Verify autocompletion/validation works in all windows
    - Close windows one by one, verify server shuts down after last

3. **Edge case tests:**
    - Server crash recovery
    - Simultaneous window opens (race condition)
    - Same file open in multiple windows
    - Network failures (for socket connection)

4. **Performance tests:**
    - Memory usage with 5 windows (should be ~500-600MB total)
    - Response latency compared to per-window servers

**Estimated time:** 2-3 days

---

### Implementation Checklist

#### Phase 1
- [ ] Fix `CfnLintService.initialize()` to check `settings.enabled`
- [ ] Add `NODE_OPTIONS=--max-old-space-size=512` to JetBrains client
- [ ] Add `NODE_OPTIONS=--max-old-space-size=512` to VS Code client
- [ ] Write tests for the bug fix
- [ ] Manual verification of memory savings

#### Phase 2
- [ ] Remove eager `cfnLintService.initialize()` from `Initialize.ts`
- [ ] Add `ensureInitializedAndMounted()` to `CfnLintService`
- [ ] Modify `lintTemplate()`/`lintFile()` for lazy initialization
- [ ] Write tests for lazy loading
- [ ] Lazy-load Guard WASM
- [ ] Add master enable/disable toggle (JetBrains)
- [ ] Add master enable/disable toggle (VS Code)
- [ ] Manual verification of lazy loading behavior

#### Phase 3
- [ ] Verify socket transport in standalone.ts
- [ ] Create `SharedCfnLspManager.kt` for JetBrains
- [ ] Modify JetBrains LSP client for socket connection
- [ ] Implement VS Code shared server coordination
- [ ] Add health monitoring and auto-reconnect
- [ ] Add shutdown coordination with timeout
- [ ] Write integration tests for multi-window scenario
- [ ] Test crash recovery
- [ ] Test race conditions
- [ ] Performance benchmarking

## References

- GitHub Issue: https://github.com/aws/aws-toolkit-jetbrains/issues/6380
- Pyodide Documentation: https://pyodide.org/
- LSP Specification: https://microsoft.github.io/language-server-protocol/
