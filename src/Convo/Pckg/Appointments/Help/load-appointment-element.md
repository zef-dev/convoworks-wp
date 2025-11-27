### Load Appointment Element

Loads a **single appointment** by appointment ID and email and exposes its data to your flow.

### When to use

Use **Load Appointment Element** when you need to:

- Fetch the details of an existing appointment for a specific user.
- Confirm, display, or further process a previously created appointment.
- Branch your conversation depending on whether the appointment exists.

### Properties

#### Context ID (`context_id`)

ID of the referenced `IAppointmentsContext` implementation that manages appointments.

#### Appointment ID (`appointment_id`)

Identifier of the existing appointment you want to load.

- Example: `${appointment_id}` or a literal like `123`.

#### Email (`email`)

User identification (email address) associated with the appointment.

- Example: `${user.email}` or `john@example.com`.

#### Return Variable Name (`return_var`)

Name of the **request-scope variable** that will hold the result. Default is `status`.

The variable will include:

- `appointment` – appointment data object.
- `timezone` – preferred timezone used for this appointment.

Example access:

- `${status.appointment}`
- `${status.timezone}`

#### Timezone Mode (`timezone_mode`)

Controls which timezone is used:

- `DEFAULT` – use default timezone from the appointments context.
- `CLIENT` – try to use the client’s timezone.
- `SET` – use the explicit value from **Timezone**.

#### Timezone (`timezone`)

Used when `timezone_mode` is `SET`. A PHP timezone identifier.

- Example: `Europe/Berlin`, `UTC`.

#### OK (`ok`)

Child flow that executes when the appointment **was found**.

### Runtime behavior

On execution the element:

1. Resolves the effective timezone.
2. Tries to load the appointment matching **Appointment ID** and **Email** in the given context.
3. Stores the result in the **Return Variable Name** (`status` by default).
4. Executes the **OK** flow if the appointment exists; otherwise, no flow is executed unless your service handles the “not found” case elsewhere.

Example structure of `${status.appointment}`:

```json
{
  "appointment_id": "123",
  "timestamp": 123345678,
  "payload": {
    "some_other_fields": "Used by your appointment context & WP plugin",
    "more_fields": "Some other data"
  }
}
```

### Example

Typical configuration:

- **Context ID**: `${appointments_ctx}`
- **Appointment ID**: `${slot.id}`
- **Email**: `${user.email}`
- **Return Variable Name**: `status`

In the **OK** flow you can say:

> “Your appointment is scheduled for `${status.appointment.timestamp}`.”

### Tips & gotchas

- Make sure both **Appointment ID** and **Email** match what your context expects; a mismatch will result in “not found”.
- Use a dedicated **Return Variable Name** if you need to keep multiple results separately.


