### Simply Schedule Appointments Context

Provides appointment management using the [Simply Schedule Appointments](https://wordpress.org/plugins/simply-schedule-appointments/) WordPress booking plugin.

Use this context to load, check, create, update, and cancel appointments for users identified by email.

### When to use

Use **SSA Appointments Context** when:

- You have Simply Schedule Appointments installed and configured.
- You want to check availability and suggest time slots for an appointment type.
- You need to manage appointments (CRUD) from a conversational flow.

Supported scenarios include:

- Loading a single appointment for a user by email.
- Loading multiple appointments for a user by email.
- Checking appointment availability.
- Suggesting available slots for a given appointment type.
- Creating, updating, and canceling appointments.

### Properties

#### Context ID (`id`)

Unique identifier for this context.

- Can be a plain string or an expression, for example:

  - `${APPOINTMENT_TYPE}`
  - `ssa_appointment`

This ID is used when referencing the context in other components:

```text
${contexts['ssa_appointment']}
```

#### Appointment Type (`appointment_type`)

Identifies which appointment type from SSA this context will operate on.

- Can be:
  - A numeric appointment type **ID**, or
  - The **title** of the appointment type (case-insensitive).
- The available options are populated from `SSAAppointmentsContext::getAppointmentTypesOptions()`.

Examples:

- `3`
- `"Initial Consultation"`
- `${APPOINTMENT_TYPE_ID}`

### Runtime behavior

This context encapsulates common SSA operations. Depending on which element you use (check availability, suggest slots, create appointment, etc.), the context will:

- Look up existing appointments for a given email and appointment type.
- Validate requested date/time against SSA rules and schedule.
- Create, modify, or cancel bookings.

The actual exposed methods and payload structure depend on the specific SSA-related elements you pair with this context.

### Example

1. Add **Simply Schedule Appointments Context** with:

   - **Context ID**: `ssa_appointment`
   - **Appointment Type**: `${APPOINTMENT_TYPE_ID}`

2. Use an SSA element configured with Context ID `ssa_appointment` to:

   - Check availability for the date/time collected from the user.
   - Create a booking for that user’s email.

### Tips

- Use expressions for **Context ID** and **Appointment Type** if you plan to support multiple appointment types or flows.
- Validate user email and desired date/time before calling SSA operations to avoid failed bookings.
- Log or surface errors from SSA (e.g. time slot no longer available) and guide the user to choose a new time.


