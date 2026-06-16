# Test Code Rules

Apply all rules below when writing or modifying test code. Do not apply source code rules to test files.

---

### 1. Meaningful Coverage

- Every test validates a specific business behavior or functional requirement
- Never write tests that only check instantiation, getters/setters, or `!= null`
- Every assertion checks a concrete outcome tied to business logic

### 2. Descriptive Names

- Test names describe the scenario and expected outcome: `shouldRejectOrder_whenInventoryInsufficient`
- Never use generic names that don't explain what is being tested
- Follow the project's established test naming convention

### 3. Arrange-Act-Assert Structure

- Separate setup, execution, and verification clearly
- Each test method focuses on one specific behavior
- Do not mix multiple actions or assertions for unrelated behaviors

### 4. Mock and Stub Quality

- Mock external dependencies; use real objects when safe
- Do not over-mock (testing mocks instead of behavior) or under-mock (hitting real external systems)
- Mock expectations must match actual usage patterns

### 5. Test Data

- Use meaningful, realistic test data
- Extract repeated test data into constants or builders
- Never include sensitive or production-like data

### 6. Independence

- Each test runs independently in any order
- No shared mutable state between tests
- Proper setup and teardown for each test

### 7. Assertion Quality

- Use specific assertions: `assertEquals(expected, actual)` not `assertTrue(result != null)`
- Include descriptive error messages for debugging
- Match the assertion style used in the project's existing tests

### 8. Test Code Hygiene

- Simplify setup with test utilities or builders — reduce boilerplate
- Do not write comments that restate the test name
- Use the simplest mocking approach that works
- Follow the project's existing testing style, framework, and utilities

### 9. Determinism — No Flaky Tests

- A test must produce the same result on every run, in any order, on any machine
- Control time, randomness, and concurrency — inject clocks and seeds; never rely on wall-clock timing or `sleep` to
  synchronize
- No dependence on execution order or state left behind by other tests
- No real network calls and no reliance on live external services or data

### 10. Test Behavior, Not Implementation

- Assert observable outcomes and contracts, not private internals or incidental call sequences
- Tests should survive any refactor that preserves behavior
- Do not assert on log output or incidental details unless that output is the behavior under test

### 11. Cover Edge and Failure Paths

- Test the happy path, boundary values, and the error/exception paths — not just the success case
- Include empty, null, zero, maximum, and malformed inputs where applicable
- Assert that the correct error is raised for invalid input, with the expected type and message

### 12. Fast and Isolated

- Unit tests run in-memory with no I/O, network, or sleeps, and stay fast enough to run on every change
- Each test sets up and tears down its own state
- Push slow, integration-level concerns into the appropriate separate test tier per project convention