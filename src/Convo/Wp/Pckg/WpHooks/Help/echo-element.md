### Echo

Print text directly to the WordPress response output (using PHP `echo`).

### When to use

Use **Echo** when you need to send raw text or HTML directly to the page/output from inside a WordPress hook workflow. Typical cases:

- **Debugging** – quickly print values during a hook execution.
- **Output small snippets** into templates or layout hooks.
- **Combining with expressions** to render dynamic values from the request, parameters, or other components.

### Properties

#### Text (`text`)

Text that will be printed with PHP `echo`.

- You can enter **plain text**, **HTML**, or a **mix with expressions**.
- Expressions are evaluated before output, so you can pull values from `${request}`, `${params}`, etc.

Examples:

- `Hello from Convoworks`
- `<strong>${request.getHook()}</strong> was triggered.`
- `Current user ID: ${wp_get_current_user().ID}`

### Runtime behavior

- On `read()`, this element evaluates the `Text` property and calls PHP `echo` with the resulting string.
- It **does not** automatically stop the workflow or end the request.
  - Combine it with `Exit` or other terminating elements if you need to stop execution afterward.

### Example

Suppose you want to print a short message when a specific action runs:

- Add **WP Hook Processor** for your hook.
- In the **OK flow**, add **Echo** with:

> `Hook ${request.getHook()} fired with first argument: ${request.getArgument(0)}`

When the hook runs, the message will be printed to the output.

### Tips

- Be careful when using Echo in **admin** or **AJAX** requests – extra output can break JSON or HTML structure.
- Prefer using Echo for **simple text or debugging**, and use dedicated response elements where possible.
- You can combine Echo with `Exit` to output something and then **terminate** the request.


