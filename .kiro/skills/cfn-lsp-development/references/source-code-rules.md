# Source Code Rules

Apply all rules below when writing or modifying source code.

## Priority

**Critical** — always enforce:
#1 Self-Documenting Names, #2 Comments Only for Why, #3 Reuse Before Writing, #4 Correct Abstraction Level, #5
Architectural Layers, #6 Law of Demeter, #7 Existing Design Patterns, #8 Single Responsibility, #9 Immutability, #15
Tell Don't Ask, #28 Null Safety, #30 Thread Safety, #34 Error Handling

**Contextual** — apply with judgment:
#16 YAGNI vs Abstraction, #18 KISS vs SOLID, #23 Inheritance vs Composition

**Standard** — apply consistently: all remaining rules.

---

## Naming

### 1. Self-Documenting Names — CRITICAL

- Every name must be immediately understandable to an unfamiliar engineer without needing a comment
- Names unambiguously describe role, behavior, or purpose
- Never use vague or generic names: `data`, `info`, `temp`, `manager`, `processor`, `handler`, `Helper`, `utils`,
  `stuff`, `val`, `obj`
- Short conventional names are acceptable when local context makes the meaning obvious — e.g., `item` as the element in
  a loop, or `result` as a function's accumulated return value. Avoid a generic name only when it hides what the value
  actually represents
- Function names describe the single action performed: `calculateTax`, not `process` or `doWork`
- Variable names describe what the value represents: `maxRetryCount`, not `n` or `count`
- Boolean names read as true/false questions: `isValid`, `hasPermission`, `canRetry`
- Collection names indicate plurality and content: `activeUsers`, not `list` or `data`

### 2. Comments Only for Why — CRITICAL

- Code must be readable without comments — if it isn't, improve the names and structure
- Only write comments that explain a non-obvious reason, constraint, or trade-off behind a decision
- Never write comments that restate what the code does: no `// initialize service`, `// return result`,
  `// loop through items`, `// set the value`, `// check if null`
- Never write comments that restate a function or variable name
- Never add section-separator comments like `// --- Helper Methods ---` or `// ===== Private =====`
- Do not change or remove existing comments unless the code they describe has changed
- Javadoc/docstrings: only on public API boundaries where the contract isn't obvious from the signature

## Reuse and Placement

### 3. Reuse Before Writing — CRITICAL

- Before writing new code, search the existing codebase for similar functionality and reuse it
- Extract duplicate or structurally identical code into shared methods
- Check new code against itself and the existing codebase for duplication
- Every piece of knowledge has a single authoritative representation (DRY)
- Caveat: do not force DRY onto code that is only incidentally similar. A premature or wrong abstraction couples
  unrelated callers more tightly than the duplication it removes — when two usages may diverge, prefer duplication until
  the right shared abstraction is clear

### 4. Correct Abstraction Level — CRITICAL

- Place shared code at the level where all its callers can reach it — no higher, no lower
- A utility used by one module belongs in that module, not in a shared utils package
- A utility used across modules belongs in a shared location accessible to all callers
- Do not create god-classes or catch-all utility files — group by cohesive purpose

## Architecture

### 5. Respect Architectural Layers — CRITICAL

- Follow the established layer boundaries found in the project
- Never bypass layers (e.g., handler must not call DB directly — go through service layer)
- New code conforms to the same layer structure as existing code

### 6. Law of Demeter — CRITICAL

- Only call methods on objects you have direct access to
- Do not reach through a foreign object graph to pull out distant state: `order.getCustomer().getAddress().getCity()`
  violates this
- If you need something deep in an object graph, add a method on the intermediate object that exposes only what the
  caller needs
- This does not forbid chaining on a single fluent API: builders (`builder.withX().withY().build()`), stream pipelines (
  `stream.filter(...).map(...).collect(...)`), and other self-returning chains are fine — each call acts on the same
  object or pipeline rather than navigating an object graph

### 7. Follow Existing Design Patterns — CRITICAL

- Conform to patterns already established in the project (Repository, Factory, Builder, etc.)
- New code of the same kind follows the same pattern
- Do not introduce a different pattern for the same concern

## SOLID

### 8. Single Responsibility — CRITICAL

- Each class has one reason to change and a single well-defined purpose
- Each function does one thing — break down multi-step functions
- Do not mix unrelated concerns (business logic + persistence + serialization in one class)

### 9. Immutability — CRITICAL

- Use `final`/`const`/`readonly`/`val` by default for all variables and fields
- Only make mutable when mutation is required by the logic
- Fields set once (in constructor or initialization) must be immutable

### 10. Open/Closed Principle

- Design for extension without modification — use abstractions so new behavior can be added without changing existing
  code

### 11. Liskov Substitution

- Subtypes must be substitutable for base types without breaking correctness
- Overrides must not violate the parent contract, throw unexpected exceptions, or no-op parent behavior

### 12. Interface Segregation

- No client should depend on methods it doesn't use
- Prefer small, focused interfaces over large general-purpose ones

### 13. Dependency Inversion

- High-level modules depend on abstractions, not concrete low-level classes
- Do not directly instantiate low-level dependencies from high-level code

### 14. Command Query Separation

- Prefer methods that either mutate state (command, returns void) or return data (query, no side effects) rather than
  doing both — it keeps call sites easier to reason about
- This is a preference, not an absolute: well-established idioms that both mutate and return are fine — `stack.pop()`,
  `map.put(key, value)` returning the previous value, `iterator.next()`, `queue.poll()`, atomic `getAndIncrement()`.
  Follow the conventions of the language and its standard library

### 15. Tell, Don't Ask — CRITICAL

- Tell objects to perform actions — do not pull data out with getters and act on it externally
- Move logic to where the data lives

### 16. YAGNI vs Abstraction

- Do not add functionality or abstractions without a present requirement
- Do not write overly generic structures for a single concrete use
- Exception: interfaces for clear contracts are acceptable even with a single implementation

### 17. Encapsulation

- Apply the most restrictive visibility that works — do not default to `public`
- Hide implementation details — expose only what's necessary
- Do not expose internal data structures

### 18. KISS

- Keep it simple — avoid overly complex conditionals and clever one-liners
- Do not add premature abstractions
- When KISS conflicts with SOLID, favor SOLID for long-term maintainability

## Clean Code

### 19. Function Design

- Two or fewer arguments ideally — more than three suggests encapsulating in an object
- Do not use boolean arguments that switch behavior — split into two distinct functions
- Prefer early returns over deeply nested conditionals

### 20. Variables and Constants

- No magic numbers or strings — use named constants for all literal values
- Extract complex expressions into well-named intermediate variables
- Signal errors explicitly rather than through sentinel return values like `null` or `-1`. Use the project's established
  mechanism — exceptions, Result types, or `Optional` (see Error Handling) — and in languages where returning error
  values is idiomatic (e.g., Go), follow that idiom

### 21. Logging

- Logs must be purposeful with a clear audience and meaningful context
- Do not log verbosely in loops or performance-sensitive paths

### 22. Abstraction

- Abstract classes and interfaces define clear contracts
- Do not expose internal data structures through public APIs

### 23. Inheritance vs Composition

1. True "is-a" relationship? → Consider inheritance
2. Need polymorphic behavior? → Interfaces + inheritance
3. Need code reuse only? → Composition
4. Hierarchy > 2-3 levels deep? → Refactor to composition

### 24. Polymorphism

- Prefer polymorphic dispatch over `instanceof`/`typeof` chains that branch on an object's runtime type
- Exception: exhaustive pattern matching over a closed/sealed set of types is a valid, often clearer modern
  alternative — sealed classes/interfaces with an exhaustive `switch`, Kotlin `when`, Rust `match`, or TypeScript
  discriminated unions
- Overrides must maintain the base class behavioral contract

### 25. Program to Interfaces

- Depend on abstractions for parameters and return types when possible
- Balance with YAGNI: single-implementation interfaces are fine for clear contracts

### 26. Cohesion and Coupling

- Group related functionality within classes (high cohesion)
- Minimize dependencies between classes (low coupling)
- Do not group unrelated methods in one class

### 27. Code Hygiene

- Do not write unnecessary getters/setters on simple data classes
- Do not write public symbols without a caller in the source — no dead code
- Do not leave commented-out code

## Bug Prevention

### 28. Null Safety — CRITICAL

- Guard against null/undefined dereferences
- Add null checks before method calls and property access on nullable values
- Use null-safe operators (`?.`, `Optional`) where the language supports them
- Check bounds/existence before array/map access

### 29. Resource Management

- Always close resources — use try-with-resources, `using`, `defer`, or equivalent
- Do not leave resources open on error paths

### 30. Thread Safety — CRITICAL

- Synchronize shared mutable state properly
- Use thread-safe collections and atomic operations for concurrent access
- Maintain consistent lock ordering to avoid deadlocks

### 31. Boundary Conditions

- Validate: empty collections, zero values, max values, division by zero
- Guard against integer overflow/underflow
- Handle empty strings, null collections, and edge cases

## Modern Standards

### 32. Modern Language Features

- Use modern syntax and idioms (arrow functions, destructuring, optional chaining, etc.)
- Do not use deprecated methods — use modern replacements

### 33. Naming Conventions

- Follow language-specific conventions (camelCase, PascalCase, snake_case)
- Be consistent with the existing codebase's naming patterns

### 34. Error Handling — CRITICAL

- Use the project's established mechanism: exception hierarchies, Result types, or Optional types
- Fail fast — validate inputs and preconditions at boundaries and raise immediately on violation. When code reaches an
  unexpected condition or a state that should be impossible (an unhandled enum value or `switch`/`else` branch, a
  violated invariant, a "can't happen" case), raise an error immediately rather than continuing, returning a default, or
  silently ignoring it
- Never hide bugs, errors, or unexpected conditions. Do not suppress them, substitute a fallback or empty value to make
  the problem disappear, or downgrade an unexpected failure to a silent no-op — surface them so they can be diagnosed
  and fixed
- Catch the narrowest exception type that applies — never an empty block or catch-all that hides failures
- Never swallow an exception. If you catch it, handle it, rethrow it, or log it with context — never leave the handler
  empty
- Preserve the original cause and stack trace when wrapping (chained exceptions / `cause`) — do not discard diagnostics
- Error messages must state what failed and the relevant context (identifiers, expected vs. actual)
- Do not use exceptions for normal control flow
- Release resources on every error path (see Resource Management)

### 35. Performance

- Choose efficient algorithms and data structures — know the complexity of the path you write
- Do not create unnecessary objects in loops
- Use StringBuilder/equivalent for string concatenation in loops
- Prefer efficient collection operations over nested loops
- Avoid N+1 access patterns — batch or join repeated per-item queries and calls
- Paginate or stream unbounded result sets instead of loading everything into memory
- Cache expensive, repeated, deterministic work — but only with a clear invalidation strategy
- Do not micro-optimize at the cost of readability without measurement showing it matters

### 36. Modern API Usage

- Use modern APIs over legacy equivalents
- Use functional constructs (streams, map/filter/reduce) where appropriate
- Use standard library functionality — do not reinvent it

### 37. Complexity Reduction

- Simplify complex conditionals — extract into well-named methods
- Replace nested if-else chains with polymorphism or early returns
- Replace switch/case with polymorphism or lookup tables when the cases are an open set likely to grow; for a
  closed/sealed set, a single exhaustive switch or pattern match is fine and often clearer than spreading the logic
  across subclasses

### 38. Dependency Discipline

- Prefer the standard library and existing project dependencies before adding a new one
- Every new third-party dependency must earn its place — weigh its benefit against the long-term cost of maintaining it
- Pin or constrain versions per the project's convention so builds are reproducible
- Prefer well-maintained, widely-used libraries over unmaintained or single-purpose micro-packages
- Remove dependencies once they are no longer used

### 39. Public API and Compatibility

- Treat published signatures, serialized formats, and persisted schemas as contracts — do not change them silently
- Make additive, backward-compatible changes by default
- Deprecate before removing; provide a migration path for breaking changes and version them per project convention
- Keep public surfaces minimal — expose only what callers need (see Encapsulation)