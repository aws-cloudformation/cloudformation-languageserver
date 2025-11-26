# Testing Guidelines

## Purpose

Tests verify code changes work correctly and prevent regressions. Each test must:

1. Validate production behavior
2. Detect bugs before release
3. Document feature intent

Tests that fail these criteria likely provide low value.

## Never Make Network Calls in Tests

Tests must never make real network calls. Network calls cause test flakiness, slow execution, and external dependencies.

## Mocking Strategy

### Mock Only Inputs

Mock constructor parameters, function arguments, and injected dependencies. Never mock internal logic, language-level
APIs, or external libraries (except timing/dates and network operations).

Mocking internal logic prevents validating production behavior. When you mock `Array.prototype.map` or internal library
calls, tests validate fake implementations instead of actual code. If source code breaks, tests pass because they check
mocks, not real behavior.

**Mock in unit tests:**

- Constructor parameters
- Function arguments
- Injected dependencies

**Mock at all test levels:**

- Network operations (AWS SDK, HTTP requests, WebSocket)
- External processes (cfn-lint, cfn-guard)

### When You Need to Mock Internal APIs

If you need to mock language-level APIs or external libraries, the problem is likely either:

1. Wrong test level (unit vs integration vs E2E)
2. Poor function signature (Dependency injection) - refactor to accept the dependency as input

Refactor class constructors or function signatures to accept dependencies as parameters. This isolates the unit under
test and eliminates internal mocking.

## Test Levels

### Unit Tests (`tst/unit/`)

**Objective:** Verify a single function or class in isolation.

**Scope:** Mock constructor parameters, function arguments, and injected dependencies. Never mock internal runtime APIs.
Tests validate algorithms, not the JavaScript runtime.

**Key indicator:** Tests instantiate a single class or call a single function.

### Integration Tests (`tst/integration/`)

**Objective:** Verify collaboration between two or more internal modules.

**Scope:** All internal modules interact normally. Mock external dependencies (cfn-lint, cfn-guard, AWS SDK, network
calls).

**Key indicator:** Tests instantiate and call multiple internal classes/functions. Does not use `MockServerComponents`.

### End-to-End Tests (`tst/e2e/`)

**Objective:** Validate the entire application as a black box, simulating a real LSP client.

**Scope:** No internal modules are mocked. Tests send real LSP messages (`textDocument/didOpen`, `textDocument/hover`)
and assert real LSP responses. Mock external dependencies (cfn-lint, cfn-guard, AWS SDK, network calls). Tests verify
protocol compliance and artifact generation.

**Key indicator:** Tests use `TestExtension` to spawn a real LSP server process and communicate via LSP protocol
messages.

## What to Test

### Test Production Behavior

Tests verify inputs and outputs. Unless testing integration or E2E scenarios, avoid testing side effects.

**Test:**

- Business logic correctness
- Functional requirements
- Edge cases and boundary conditions
- Error handling
- User workflows

**Do not test:**

- Object instantiation (`new MyClass()`)
- Basic getters/setters without logic

### Meaningful Assertions

Tests must assert specific outcomes related to business logic. Tests covering many lines with weak assertions provide no
value.

## Tooling

### Vitest

Vitest is the test framework:

- **Test Runner** - Executes test suites (`vitest`)
- **Test Structure** - Provides BDD syntax (`describe`, `it`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`)
- **Assertion Library** - Provides assertion functions (`expect`)

### Sinon

Sinon handles test doubles and fakes:

- **Test Doubles** - Creates spies (`sinon.spy`), stubs (`sinon.stub`), and mocks
- **Assertions** - Provides assertion functions for test doubles (`sinon.assert`)
- **Time Control** - Manages system time via `sinon.useFakeTimers()` for debouncing and time-sensitive logic

**Note:** Never use `vi.mock` for module mocking. Use only as a last resort.
