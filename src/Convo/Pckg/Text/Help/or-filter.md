### OR Filter

Combine multiple plain text filters and activate when **any** of them matches the user request.

### When to use

Use **OR Filter** when you have several alternative phrases or patterns that should all lead to the **same** outcome, for example:

- Matching either “yes”, “sure”, or “of course” as a positive confirmation.
- Matching different variations of the same intent (e.g. “help”, “support”, “I need assistance”).

Place individual filters (e.g. **Exact match filter**, **Simple string filter**, **Regex filter**) inside this container and wire the OR Filter into your workflow.

### Properties

#### Child filters (`filters`)

List of child filters to evaluate.

- **Type**: service components (must implement `Plain text filter` interface).
- **Multiple**: yes.
- **Description**: Each child filter inspects the same user text and contributes its own slot values if it matches.

#### Collect all values (`collect_all`)

Control how many matching children should contribute to the result.

- **Type**: boolean.
- **Default**: `true`.
- **When true**: all matching child filters are evaluated and their slot values are merged into a single result.
- **When false**: evaluation stops on the **first** child that produces a non‑empty result; only that child’s slots are used.

### Runtime behavior

At runtime, the OR Filter:

- Runs each child filter in order.
- For every child whose filter result is **not empty**, copies its slots into the OR Filter’s own result.
- If **Collect all values** is disabled, stops after the first matching child.

The OR Filter itself does **not** inspect the text; it only delegates to the configured children.

### Example

Suppose you want to recognize a **positive answer** using several exact phrases:

- Add a **Plain text request filter** to your workflow.
- Inside it, add an **OR Filter**.
- Inside the OR Filter, add three **Exact match filters**:
  - **Search string**: `yes`, **Slot name**: `answer`, **Slot value**: `yes`.
  - **Search string**: `sure`, **Slot name**: `answer`, **Slot value**: `yes`.
  - **Search string**: `of course`, **Slot name**: `answer`, **Slot value**: `yes`.
- In OR Filter, keep **Collect all values** set to `false`.

When the user says “sure”, the OR Filter activates, and the final filter result contains:

> `answer = "yes"`

### Tips

- Use OR Filter to **simplify branching** for multiple equivalent phrases instead of creating many separate branches.
- When you expect several child filters to match at once (for example, multiple regex captures), enable **Collect all values**.
- Combine OR Filter with **AND filter** and **Simple string / Regex filters** to build more complex text‑matching logic.


