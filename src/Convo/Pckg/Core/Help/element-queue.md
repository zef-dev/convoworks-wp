### Element Queue

Execute child elements **in sequence**, one by one, each time the queue is called. You can control how often the queue advances and what happens when it completes.

### When to use

Use **Element Queue** when you want to:

- Walk through a predefined list of messages or actions step by step.
- Run each element only once per **request**, **session**, or **installation**.
- Have a separate “Done” flow to execute after the queue is exhausted.

Typical examples:

- A multi‑step onboarding or tutorial.
- A limited series of tips or announcements.

### Properties

#### Elements (flow)

Child elements executed **one at a time**.

- On each execution of the queue, the next element in this flow runs.

#### Done (flow)

Optional flow that runs when the queue has already executed all its child elements for the configured scope.

- Used when you want special behavior after users have “seen everything”.

#### Should reset

Expression that, when truthy, **resets** the queue so it starts again from the first element.

- If true, the next execution starts from the first child in **Elements**.

#### Wraparound

Whether to loop back to the first element after the last one is executed.

- **true** – when the end is reached, start again from the beginning.
- **false** – after the last element, only **Done** flow (if configured) is used.

#### Scope type

Controls **how often** the queue runs for a user:

- **installation** – once per installation on the device.
- **session** – once per session.
- **request** – once per request.

If `Should reset` is empty/false and `Wraparound` is false, **Scope type** governs how long the queue’s “done” state is remembered.

### Example

You want to show 3 onboarding tips once per installation:

- Place 3 **Text response** elements in **Elements**.
- Set **Scope type** to `installation`.
- Leave **Wraparound** unchecked.
- Optionally, add a **Text response** in **Done** that says “You’re all set!”.

### Tips

- Use an **If element** inside the queue to conditionally skip steps entirely by putting the actual content in its **Then** flow.
- Remember that placing elements in **Else** or adding **Else If** inside such IF elements will cause the IF itself to always be considered, so it won’t be skipped.


