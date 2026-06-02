# CFN LSP Testing Infrastructure

## Overview

The CloudFormation LSP Project employs a multi-layer testing strategy:

- **Unit Tests**: Component-level testing via Vitest (TypeScript)
- **Integration Tests**: End-to-end LSP request testing
- **Release Tests**: GitHub Actions CI for cross-platform builds

Unit tests use **Vitest**. The language server is open-source at https://github.com/aws-cloudformation/cloudformation-languageserver.

---

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual LSP components in isolation

**Framework**: Vitest (with coverage thresholds: 88% statements, 82% branches, 90% functions)

**Location**: `tst/unit/`

**Key Test Areas**:

- `tst/unit/autocomplete/` — Completion providers (resource type, property, intrinsic function)
- `tst/unit/hover/` — Hover documentation generation
- `tst/unit/context/` — AST parsing, semantic model, entity building
- `tst/unit/services/cfnLint/` — Pyodide worker, cfn-lint integration
- `tst/unit/datastore/` — LMDB store operations
- `tst/unit/handlers/` — LSP request handlers

**Execution**:

```bash
npm run test          # Run all unit tests
npm run test:coverage # Run with coverage report
```

### 2. Integration Tests

**Purpose**: End-to-end testing of LSP server against live AWS services

**Test Types**:

- LSP request/response validation (completion, hover, definition, diagnostics)
- Online component testing (stack operations, resource listing, change sets)
- Telemetry metric emission verification
- cfn-lint/Pyodide initialization validation

### 3. Release Tests (GitHub Actions)

**Purpose**: Cross-platform build validation before release

**Workflow**: `.github/workflows/release.yml`

**Build Matrix**:

| Platform | Architecture | Node Version | Build Target |
|----------|-------------|--------------|--------------|
| Ubuntu (latest) | x86_64 | 22 | Standard |
| Ubuntu (buster/legacy) | x86_64 | 18 | Legacy (old glibc) |
| Windows | x86_64 | 22 | Standard |
| macOS | x86_64 + ARM64 | 22 | Standard |

---

## Build & Runtime Dependencies

### Build-Time Dependencies

Webpack build requires:

- Node.js 18+ 
- Python 3.9+ with pip (for cfn-lint wheel downloads)
- node-gyp (for native LMDB bindings)
- gcc/g++ (for native modules)

### Runtime Dependencies (Online Features)

LSP Server requires:

- AWS Credentials
- CloudFormation APIs: DescribeStacks, CreateChangeSet/ExecuteChangeSet, DescribeStackEvents, GetTemplate
- Cloud Control API (CCAPI): ListResources, GetResource
- S3 (template upload for large templates)
- Pyodide/cfn-lint (validation): micropip + cfn-lint from bundled wheels

### External Dependencies

| Dependency | Impact if Down | Mitigation |
|-----------|---------------|------------|
| **GitHub** | No source updates | N/A |
| **CloudFormation APIs** | Online tests fail | Offline tests still pass |
| **Cloud Control API** | Resource listing/state fails | Offline tests still pass |
| **Pyodide CDN** | cfn-lint can't load packages | Wheels committed to repo (fallback) |

---

## Running Tests Locally

### Prerequisites

- **Clone the repo**: `git clone https://github.com/aws-cloudformation/cloudformation-languageserver.git && cd cloudformation-languageserver`
- **Install dependencies**: `npm ci`
- **Python + pip** (for wheel downloads): Need Python 3.9+

### Unit Tests

```bash
npm run test          # Run all unit tests
npm run test:coverage # Run with coverage report
npx vitest run tst/unit/services/cfnLint/PyodideWorkerManager.test.ts  # Specific file
```

### Build the Server

```bash
npm run bundle:alpha                          # Development build
npm run bundle:prod                           # Production build
npm run bundle:alpha -- --env buildTarget=legacy  # Legacy (old glibc)
npm run bundle:alpha -- --env skipWheels=true     # Skip wheel download
```

### Integration Tests (Local)

```bash
node bundle/production/cfn-lsp-server-standalone.js --stdio  # Start server manually
```

### Download Wheels Manually

```bash
npm run download-wheels

# Or manually:
python3 -m pip download --dest assets/wheels \
  --only-binary=:all: --python-version 313 --platform any \
  --implementation py --abi none --no-deps \
  -r requirements-pyodide.txt
```

---

## References

### Source Code

- [Language Server (GitHub)](https://github.com/aws-cloudformation/cloudformation-languageserver)
- [AWS Toolkit VSCode - CFN Client](https://github.com/aws/aws-toolkit-vscode/tree/master/packages/core/src/awsService/cloudformation)
- [AWS Toolkit JetBrains - CFN Client](https://github.com/aws/aws-toolkit-jetbrains/plugins/toolkit/jetbrains-core/src/software/aws/toolkits/jetbrains/services/cloudformation/)

---

## Appendix: Test Coverage Matrix

| Component | Unit Tests | Integration Tests | GitHub CI |
|-----------|-----------|--------------|-----------|
| **Completion** | ✅ Vitest | ✅ | ✅ |
| **Hover** | ✅ Vitest | ✅ | ✅ |
| **Diagnostics/cfn-lint** | ✅ Vitest | ✅ | ✅ |
| **Definition** | ✅ Vitest | ✅ | ✅ |
| **Document Symbols** | ✅ Vitest | ✅ | ✅ |
| **Code Actions** | ✅ Vitest | ✅ | ✅ |
| **LMDB Store** | ✅ Vitest | ✅ (implicit) | ✅ |
| **Pyodide/cfn-lint** | ✅ Vitest | ✅ | ✅ |
| **Online: Stacks** | ❌ | ✅ | ❌ |
| **Online: Resources** | ❌ | ✅ | ❌ |
| **Online: Deployment** | ❌ | ✅ | ❌ |
| **Online: Validation** | ❌ | ✅ | ❌ |
| **Telemetry Emission** | ✅ Vitest | ✅ | ❌ |
| **Guard Rules** | ✅ Vitest | ✅ | ✅ |
