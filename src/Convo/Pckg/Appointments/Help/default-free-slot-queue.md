### Default free slot collector

Component that collects and prepares a limited list of **free slot suggestions** for use in appointment flows.

### When to use

Use **Default free slot collector** when you want a simple, out-of-the-box implementation of `IFreeSlotQueueFactory` to:

- Build a list of suggested appointment times.
- Feed these suggestions into **Check Appointment Time Element** flows.
- Limit the number of alternatives you offer to users.

### Properties

#### Max Suggestions (`max_suggestions`)

Maximum number of suggestions to return.

- Default: `${5}`
- Use `0` if your system does not support suggestions (no suggestions will be generated).

### Runtime behavior

This component implements `IFreeSlotQueueFactory` and is typically referenced from **Check Appointment Time Element** as its **Suggestion Builder**.

When executed, it:

1. Collects available slots from the underlying appointments context.
2. Limits the number of suggestions to **Max Suggestions**.
3. Exposes them via the element that uses the factory (for example `${status.suggestions}` in **Check Appointment Time Element**).

### Example

In **Check Appointment Time Element**:

- **Suggestion Builder**: `Default free slot collector`

Then, in one of the suggestion flows you can access:

> Use `${status.suggestions}` to list suggested times to the user.

### Tips & gotchas

- If you need more advanced logic (e.g. prioritizing certain days or hours), create a custom component implementing `IFreeSlotQueueFactory`.
- Keep **Max Suggestions** reasonably low (e.g. 3–10) to avoid overwhelming end users with too many options.


