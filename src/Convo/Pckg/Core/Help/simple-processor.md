### Simple processor

Core processor used to react to what the user says and run appropriate elements.

### When to use

Use **Simple processor** as your main way to:

- Match incoming requests using filters (usually intent‑based).
- Execute elements in the **OK flow** when a filter matches.

### Properties

#### Request filters (flow)

Container for filters such as:

- **Intent Filter** (with **Convo Intent** / **Platform Intent** readers).
- Other request filters as needed.

If any filter in this container matches, the processor’s **OK flow** is executed.

#### OK flow

Elements to execute when the processor’s filters matched the incoming request.

### Example

Handle a user asking for help:

1. In **Request filters**, add an **Intent Filter** with a **Convo Intent** reader for `HelpIntent`.
2. In **OK flow**, add elements that explain how to use the skill.

### Tips

- Use one **Simple processor** per logical intent group or conversational branch.
- Keep filters focused and avoid mixing too many unrelated conditions in a single processor.


