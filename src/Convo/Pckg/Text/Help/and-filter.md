### AND filter

Combine multiple plain text filters and activate only when **all** of them match the same user request.

### When to use

Use **AND filter** when the user text must satisfy **several independent conditions** at once, for example:

- The request must both **start with** a keyword and **contain** another phrase.
- Multiple regex or string filters must all confirm the same intent.

Place individual filters (e.g. **Exact match filter**, **Simple string filter**, **Regex filter**) inside this container and wire the AND filter into your workflow.

### Properties

#### Child filters (`filters`)

List of child filters to evaluate.

- **Type**: service components (must implement `Plain text filter` interface).
- **Multiple**: yes.
- **Description**: Each child filter inspects the same user text and returns its own slot values when it matches.

### Runtime behavior

At runtime, the AND filter:

- Runs each child filter in order.
- Collects a **separate result** from each child.
- Checks that **every** child result is **non‑empty**.
- If all children matched, merges all child results into a single combined result.
- If **any** child produces an empty result, the AND filter’s result remains empty.

The AND filter itself does not inspect the text; it only delegates to the configured children and combines their results.

### Example

Suppose you want to match requests that:

- Start with “order”.
- Also contain the word “pizza”.

You can configure:

- A **Plain text request filter** in your workflow.
- Inside it, an **AND filter** with two **Simple string filters**:
  - First Simple string filter:
    - **Search string**: `order`
    - **Starts with**: `true`
    - **Slot name**: `action`
    - **Slot value**: `order`
  - Second Simple string filter:
    - **Search string**: `pizza`
    - **Starts with**: `false`
    - **Slot name**: `item`
    - **Slot value**: `pizza`

When the user says “Order a pizza please”, both children match, and the AND filter result contains:

> `action = "order"`, `item = "pizza"`

### Tips

- Use AND filter when several filters must **all** pass before you treat the request as valid.
- Combine AND filter with **OR Filter** to model complex conditions (e.g. “(yes OR ok) AND not (cancel)”).
- If a child filter is optional, do **not** put it into an AND filter, or it may prevent activation when it returns an empty result.


