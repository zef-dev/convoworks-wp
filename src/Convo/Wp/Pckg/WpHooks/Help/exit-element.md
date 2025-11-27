### Exit

Immediately stop Convoworks workflow execution for the current request.

### When to use

Use **Exit** when you want to **terminate processing right away** from inside a WordPress hook workflow. Typical scenarios:

- After you have already produced the final output (e.g. with **Echo**).
- When you detect a condition where **no further elements should run**.
- When you want to **short‑circuit** complex flows for performance or safety reasons.

### Properties

This element has **no configurable properties**.

### Runtime behavior

- On `read()`, this element throws an internal **`EndRequestException`**, which:
  - Stops execution of the remaining elements in the current workflow.
  - Signals the Convoworks runtime that the request has been fully handled.
- It does **not** modify the response by itself – it only stops further processing.

Combine **Exit** with other elements (for example **Echo**, **WP Filter Result**, or **WP Hook Error**) that actually build the response you need.

### Example

You want to print a debug message and then stop:

- In the **OK flow** of a **WP Hook Processor**:
  - Add **Echo** with:
    > `Debug: hook ${request.getHook()} called with args: ${request.getArguments()}`
  - Add **Exit** immediately after Echo.

When the hook runs, the message is printed and the workflow stops right away.

### Tips

- Be careful when using Exit in hooks that other plugins rely on – make sure you are only stopping **Convoworks’ own workflow**, not breaking the overall page behavior.
- Place Exit as **late as possible** in a flow, after you have done all necessary work (logging, setting params, sending responses).


