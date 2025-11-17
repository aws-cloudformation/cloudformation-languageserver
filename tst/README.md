# Testing Guidelines

## Purpose

Testing gives us confidence in code changes. Tests answer: Does this impact customer experience? Can we detect regressions before release? Does it test production code? Does it test the feature? Does it test production behavior or user workflows?

A test that cannot answer these questions is not useful.

## Mocking Strategy

### Mock Only Inputs

Mock constructor parameters, function arguments, and injected dependencies. Do not mock internal logic, language-level APIs, or external libraries.

Mocking internal logic prevents guaranteeing how source code behaves in production. When we mock `Array.prototype.map` or an internal library call, we test against a fake implementation. If source code changes incorrectly, the test passes because it validates against the mock, not actual behavior. This creates brittle tests that fail to catch regressions.

### When You Need to Mock Internal APIs

If you need to mock language-level APIs or external libraries, one of two things is wrong:

1. Wrong test level (unit vs integration vs E2E)
2. Wrong function signature - refactor to accept the dependency as an input

Modify class constructors or function inputs to accept dependencies. This isolates the unit under test and eliminates the need to mock internal implementation details.

### What to Mock

**Mock:**
- Constructor parameters
- Function arguments
- Injected dependencies
- External boundaries (LSP connection, AWS SDK clients, HTTP requests)

**Do Not Mock:**
- Language-level APIs (`Array.prototype.map`, `String.prototype.split`, `Date.now()` unless testing time-dependent logic)
- Internal implementation details
- Libraries used internally (unless they are explicit inputs)
- The function or class under test

## Test Levels

### Unit Tests (`tst/unit/`)

**Objective:** Verify logical correctness of a single, isolated function or class.

**Method:** Tests follow a functional style. Inputs (including complex objects or fakes) are provided to the function, and the output is asserted.

**Scope:** Do not mock internal runtime APIs. Tests validate the algorithm, not the JavaScript runtime.

### Integration Tests (`tst/integration/`)

**Objective:** Verify collaboration between two or more internal modules.

**Method:** Tests validate a complete feature from an internal perspective. Trigger a handler and assert that dependent modules are invoked correctly.

**Scope:** Only external boundaries (LSP connection object) are mocked. All internal modules under test interact normally. Tests may read from the file system to load fixtures.

### End-to-End Tests (`tst/e2e/`)

**Objective:** Validate the entire application as a black box, simulating a real client (VS Code).

**Method:** The LSP server spawns as a live process. A test client connects to its stdio and communicates using JSON-RPC protocol.

**Scope:** No part of the server is mocked. Tests send real LSP messages (`textDocument/didOpen`, `textDocument/hover`) and assert against real LSP responses. These tests verify protocol compliance and artifact generation.

## What to Test

### Test Production Behavior

Tests verify inputs and outputs. Unless it's an integration or E2E test, avoid testing side-effects.

**Test:**
- Business logic correctness
- Functional requirements
- Edge cases and boundary conditions
- Error handling
- User workflows

**Do Not Test:**
- Object instantiation (`new MyClass()`)
- Basic getters/setters without logic
- Null checks without meaningful business logic validation
- Trivial operations that add no value

### Meaningful Assertions

Tests must contain assertions that check specific outcomes related to business logic. Tests that cover many lines but have weak assertions are superficial.

## Test Structure

### Arrange-Act-Assert Pattern

Tests follow the AAA pattern:

1. **Arrange** - Set up test data and dependencies
2. **Act** - Execute the function or method under test
3. **Assert** - Verify the outcome

### Descriptive Test Names

Test names clearly describe the scenario being tested.

**Good:**
- `should return documentation for a resource type`
- `should handle complete workflow for JSON template extraction`
- `should update all settings`

**Bad:**
- `test1`
- `testHover`
- `works`

### Test Independence

Tests run independently and in any order. Tests do not depend on execution order or state from other tests. Use `beforeEach` and `afterEach` for proper setup and teardown.

## Tooling

### Vitest

Vitest serves as the test framework:

- **Test Runner** - Executes test suites (`vitest`)
- **Test Structure** - Provides BDD syntax (`describe`, `it`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`)
- **Assertion Library** - Provides assertion functions (`expect`)

### Sinon

Sinon handles all test doubles and fakes:

- **Test Doubles** - Creates spies (`sinon.spy`), stubs (`sinon.stub`), and mocks
- **Assertions** - Provides assertion functions for test doubles (`sinon.assert`)
- **Time Control** - Manages system time via `sinon.useFakeTimers()` for debouncing and time-sensitive logic

**Note:** `vi.mock` for module mocking is highly NOT recommended. Use only as a last resort.

## Test Organization

### Directory Structure

```
tst/
├── unit/                    # Unit tests organized by module
│   ├── settings/
│   ├── hover/
│   ├── autocomplete/
│   └── ...
├── integration/             # Integration tests by feature
│   ├── hover/
│   ├── autocomplete/
│   └── ...
├── e2e/                     # End-to-end protocol tests
│   └── ...
├── resources/               # Test fixtures and data
│   ├── templates/
│   ├── schemas/
│   └── ...
└── utils/                   # Test utilities and helpers
    ├── MockServerComponents.ts
    ├── TemplateTestOrchestrator.ts
    └── ...
```

## Test Quality Checklist

Before submitting a test, verify:

- [ ] Test validates business logic, not trivial operations
- [ ] Test name describes the scenario being tested
- [ ] Test follows Arrange-Act-Assert pattern
- [ ] Test uses meaningful assertions
- [ ] Test mocks only inputs (constructor parameters, function arguments, injected dependencies)
- [ ] Test does not mock internal implementation details or language-level APIs
- [ ] Test can run independently and in any order
- [ ] Test is at the correct level (unit, integration, or E2E)
- [ ] Test provides value - it can detect regressions and verify correctness
