### Plain text request filter

Top‑level request filter that activates on **any non‑empty** text request and delegates matching to child plain text filters.

### When to use

Use **Plain text request filter** when you:

- Work with text‑only channels (chat, generic HTTP text input).
- Want to apply one or more **plain text filters** (string, exact match, regex, AND/OR combinations) to the incoming user text.

This component accepts the request when the text is **not empty** and then executes its child filters.

### Properties

#### Plain Text request filter (`filters`)

List of child plain text filters to evaluate.

- **Type**: service components (must implement the Text package `Plain text filter` interface).
- **Multiple**: yes.
- **Description**: Each child filter inspects the current user text and contributes its own slot values to the combined result.

### Runtime behavior

At runtime, the Plain text request filter:

1. Checks the incoming request text:
   - If the text is empty (after trimming), it **does not accept** the request.
   - If the text is non‑empty, it accepts the request and proceeds.
2. Executes each configured child plain text filter in order.
3. Merges all child filter results into a single combined filter result, which can later be used by your workflow.

You typically place this component in a **Request filters** collection of a block or service.

### Example

To recognize simple “yes/no” answers:

- Add a **Plain text request filter** to your block.
- Inside it, add an **OR Filter**.
- Inside the OR Filter, add:
  - One **Exact match filter** for `yes` / `yep` / `sure` setting slot `answer = "yes"`.
  - One **Exact match filter** for `no` / `nope` setting slot `answer = "no"`.

When the user types “sure”, the Plain text request filter accepts the non‑empty text, the OR Filter activates, and your downstream logic can inspect `${request.filter.answer}`.

### Tips

- Combine this component with **other request filters** (intent‑based, slot‑based, etc.) to cover different types of input.
- Keep child filters **focused and reusable** (e.g. one filter per concept such as confirmation, cancellation, product choice).
- Use logging and test chat to validate which child filters are triggering for representative user messages.


