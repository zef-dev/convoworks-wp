### NOP filter

A **no‑operation** filter used primarily for testing workflows.

### When to use

Use **NOP filter** when:

- You want to test processor flows without depending on real intents or input.
- You need a simple on/off switch to trigger a processor’s OK flow.

### Properties

#### Is Empty

Determines whether the filter matches:

- **empty** – will **not** match; the processor’s OK flow is not activated.
- **match** – always matches; the processor’s OK flow is triggered.

Typically used inside a **Simple processor**’s **Request Filters** container.

### Example

To test an OK flow:

- Place **NOP filter** in the **Request Filters** container.
- Set **Is Empty** to `match`.
- The processor’s OK flow will run for each request, regardless of user input.

### Tips

- Do not leave NOP filters in production flows unless you explicitly want unconditional matching.
- Use them as a convenient tool during development and debugging.


