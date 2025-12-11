### WP Filter Result

Return the final value for a WordPress **filter** hook and stop the workflow.

### When to use

Use **WP Filter Result** inside the **OK flow** of a **WP Hook Processor** that is configured as a **filter** when you want Convoworks to:

- Compute the **modified filter value**, and
- Return it back to WordPress as the hook result.

If you do **not** use this element in a filter workflow, WordPress will typically receive the **original argument** unchanged.

### Properties

#### Return value (`return_value`)

Expression that evaluates to the value which should be returned from the filter.

- It can be any scalar or complex value supported by the hook (`string`, `int`, `array`, `object`, etc.).
- You usually start from the original filter argument and modify it.

Typical examples:

- `${request.getArgument(0)}` – **default**, just pass the original value through.
- `${request.getArgument(0) ~ " – modified by Convoworks"}` – append text to a string.
- `${request.getArgument(0) * 2}` – double a numeric value.

### Runtime behavior

- On `read()`:
  - If the response is a `WpHooksCommandResponse`, the element:
    - Evaluates `Return value`.
    - Calls `setFilterResponse()` with the evaluated value.
  - Otherwise, it logs a warning (non‑hooks response) and does not set the filter result.
- After setting the result, it throws a **`EndRequestException`** to stop any remaining elements.

In a proper **filter** workflow, this means:

- The filter value is set once.
- The workflow stops immediately after this element.

### Example

You want to customize the post title via the `the_title` filter:

- Configure **WP Hook Processor**:
  - **Hook type**: `Filter`
  - **Hook**: `the_title`
  - **Accepted arguments**: `2` (title and post ID)
- In the **OK flow**, add **WP Filter Result** with:

> `Return value`: `${"[HOOKED] " ~ request.getArgument(0)}`

Now all titles handled by this workflow will be prefixed with `[HOOKED]`.

### Tips

- Make sure **Hook type** in `WP Hook Processor` is set to **Filter**, otherwise the returned value may not be used by WordPress.
- If you only want to **pass through** the original value, keep the default expression `${request.getArgument(0)}`.
- Use `${request.getArguments()}` when you need access to all filter arguments (e.g. `$value`, `$post_id`, `$context`).


