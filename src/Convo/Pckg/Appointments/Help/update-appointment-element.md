### Update Appointment Element

Updates the **time and/or payload** of an existing appointment for a user.

### When to use

Use **Update Appointment Element** when you need to:

- Reschedule an already booked appointment to a new date and/or time.
- Modify additional appointment data (payload).
- Handle the case where the new slot is not available.

### Properties

#### Context ID (`context_id`)

ID of the referenced `IAppointmentsContext` implementation that manages appointments.

#### Appointment ID (`appointment_id`)

ID of the existing appointment to be updated.

- Example: `${appointment_id}`.

#### Email (`email`)

User identification (email address) for whom the appointment belongs.

#### Appointment Date (`appointment_date`)

New appointment date in `Y-m-d` format (MySQL `DATE`).

#### Appointment Time (`appointment_time`)

New appointment time in `H:i:s` format (MySQL `TIME`).

#### Payload (`payload`)

Array of additional fields used by the implementing plugin or context for the updated appointment.

- Use key–value pairs for additional data (notes, metadata, etc.).

#### Result Variable Name (`result_var`)

Name of the **request-scope variable** that will hold the update result. Default is `status`.

The variable typically contains:

- `existing` – previous appointment version (similar to result from **Load Appointment Element**).
- `timezone` – selected timezone.
- `requested_time` – requested new timestamp.

Example:

- `${status.existing}`
- `${status.requested_time}`

#### Timezone Mode (`timezone_mode`)

How the timezone is chosen:

- `DEFAULT` – use default timezone from the appointments context.
- `CLIENT` – try to use the client’s timezone.
- `SET` – use the explicit **Timezone** value.

#### Timezone (`timezone`)

Used when `timezone_mode` is `SET`. Explicit PHP timezone identifier.

#### OK (`ok`)

Flow executed when the appointment **was successfully updated** and the new time slot is available.

#### Not available (`not_available`)

Flow executed when the **new time slot is not available** for the requested update.

### Runtime behavior

On execution the element:

1. Resolves the effective timezone.
2. Tries to update the appointment identified by **Appointment ID** and **Email** to the new date/time and payload.
3. Stores details about the update in the **Result Variable Name** (`status` by default), including the previous appointment under `existing`.
4. Executes:
   - **OK** if the update succeeded.
   - **Not available** if the new slot is not available.
   - Optionally a “not found” path in your service if the appointment does not exist (implementation dependent).

### Example

Configuration:

- **Context ID**: `${appointments_ctx}`
- **Appointment ID**: `${appointment_id}`
- **Email**: `${user.email}`
- **Appointment Date**: `${new_date}`
- **Appointment Time**: `${new_time}`
- **Result Variable Name**: `status`

In the **OK** flow you might confirm:

> “Your appointment has been moved from `${status.existing.timestamp}` to the new time.”

In the **Not available** flow you can handle the conflict and offer new suggestions.

### Tips & gotchas

- Validate that the user is allowed to update the given appointment (by **Appointment ID** and **Email**) at the dialog level if necessary.
- It is often helpful to read the current appointment with **Load Appointment Element** before calling **Update Appointment Element**, so you can confirm changes back to the user.


