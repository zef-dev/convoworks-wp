### Dummy Appointments Context

Provides a **dummy, test implementation** of an appointments context that you can use for demos, prototyping, or testing.

### When to use

Use **Dummy Appointments Context** when you:

- Want to quickly test appointment-related flows without integrating a real backend.
- Need an example implementation for creating your own `IAppointmentsContext`.
- Want to store appointments in the Convoworks user scope only.

### Properties

#### Context ID (`id`)

Unique ID by which this context is referenced.

- Default: `appointments_ctx`
- Use this value in other appointment elements as their **Context ID**.

### Behavior and characteristics

This context has the following fixed characteristics:

- **Business hours**: 09:00–17:00 on workdays.
- **Appointment duration**: 30 minutes.
- **Storage**: appointments are stored in the **Convoworks user scope**, not in an external system.

It is intended only for **development and testing** and should not be used as a production-ready appointment backend.

### Example

1. Add **Dummy Appointments Context** with:
   - **Context ID**: `appointments_ctx`
2. In other appointment elements (Create, Load, etc.), set **Context ID** to `${appointments_ctx}`.

This allows you to try out the entire appointments package without any external dependencies.

### Tips & gotchas

- Do not rely on this context for persistent, long-term storage; it is designed as a lightweight demo implementation.
- Use it as a reference when implementing your own `IAppointmentsContext` for a real scheduling system.


