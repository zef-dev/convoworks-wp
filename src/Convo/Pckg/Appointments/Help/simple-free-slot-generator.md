### Simple Free Slot Generator

Implementation of `IFreeSlotQueueFactory` that collects **all available free slots** without complex filtering.

### When to use

Use **Simple Free Slot Generator** when you want to:

- Retrieve a broad list of all free appointment slots.
- Offload the “which slot is best” decision to another layer (for example GPT-based logic or custom code).
- Plug it into **Check Appointment Time Element** as a suggestion source.

### Properties

#### Max Suggestions (`max_suggestions`)

Maximum number of free slots to return.

- Default: `${50}`
- Use `0` if your system does not support free-slot listings.

### Runtime behavior

This component:

1. Asks the underlying appointments context for available free slots.
2. Collects them into a list and applies the **Max Suggestions** limit.
3. Exposes them to the caller (e.g. via `${status.suggestions}` when used as a suggestion builder).

Compared to **Default free slot collector**, this generator is aimed at collecting a **wider set of slots** with minimal filtering.

### Example

In **Check Appointment Time Element**:

- **Suggestion Builder**: `Simple Free Slot Generator`

Then use `${status.suggestions}` in your suggestion flows to present or post-process the results.

### Tips & gotchas

- Use this when you need **flexible, post-processed suggestions**, for example when GPT chooses from a long list.
- If you only need a small, ready-to-show list, consider **Default free slot collector** instead.


