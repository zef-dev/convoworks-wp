### Create Appointment Element

Attempts to create a **new appointment** for the given user, date, and time, and reports whether the slot was successfully booked.

### When to use

Use **Create Appointment Element** when you want to:

- Book a new appointment after the user has confirmed a time slot.
- Capture additional appointment data (name, phone, notes, etc.) in a payload.
- Branch the dialogue depending on whether the slot is still available.

### Properties

#### Context ID (`context_id`)

ID of the referenced `IAppointmentsContext` implementation that will persist the appointment.

#### Email (`email`)

User identification (email address) for whom you are creating the appointment.

- Example: `${user.email}` or a literal address.

#### Appointment Date (`appointment_date`)

Requested appointment date in `Y-m-d` format (MySQL `DATE`).

- Example: `2025-01-31`

#### Appointment Time (`appointment_time`)

Requested appointment time in `H:i:s` format (MySQL `TIME`).

- Example: `14:30:00`

#### Payload (`payload`)

Array of additional fields used by the implementing plugin or context (e.g. customer details, notes, metadata).

- Editor lets you define multiple key–value pairs.
- Example: name, phone, reason, etc.

#### Result Variable Name (`result_var`)

Name of the **request-scope variable** that will hold the creation result. Default is `status`.

The variable typically contains:

- `appointment_id` – ID of the created appointment.
- `timezone` – selected timezone string.
- `requested_time` – timestamp of the requested appointment time.

Example access:

- `${status.appointment_id}`
- `${status.requested_time}`

#### Timezone Mode (`timezone_mode`)

How the timezone is chosen:

- `DEFAULT` – use default timezone from the appointments context.
- `CLIENT` – try to use the client’s timezone.
- `SET` – use the explicit **Timezone** value.

#### Timezone (`timezone`)

Used when `timezone_mode` is `SET`. Explicit PHP timezone identifier.

- Example: `Europe/Berlin`, `UTC`.

#### OK (`ok`)

Flow executed when the appointment **was created successfully**.

#### Not Available (`not_available`)

Flow executed when the appointment **could not be created** because the slot is no longer available or another domain-specific reason.

### Runtime behavior

On execution the element:

1. Resolves the effective timezone.
2. Attempts to create an appointment at the requested date and time.
3. Populates the **Result Variable Name** (`status` by default) with details of the created appointment or failure.
4. Executes **OK** or **Not Available** depending on the result.

General, unexpected errors are handled by the system’s global error handler.

### Example

Configuration:

- **Context ID**: `${appointments_ctx}`
- **Email**: `${user.email}`
- **Appointment Date**: `${date}`
- **Appointment Time**: `${time}`
- **Payload**: key–value pairs like `name`, `phone`, `note`.

In the **OK** flow you can say:

> “Your appointment is booked. Your confirmation ID is `${status.appointment_id}`.”

In the **Not Available** flow you might offer alternative slots or a different day.

### Tips & gotchas

- Use **Check Appointment Time Element** beforehand if you want to avoid race conditions and present suggestions proactively.
- Always validate and normalize user input for **Appointment Date** and **Appointment Time** to the expected formats.


