### Cancel Appointment Element

Cancels an **existing appointment** for a user and exposes the previous appointment data.

### When to use

Use **Cancel Appointment Element** when you need to:

- Allow a user to cancel an already booked appointment.
- Retrieve and possibly present information about the canceled appointment.
- Handle the case where the appointment does not exist.

### Properties

#### Context ID (`context_id`)

ID of the referenced `IAppointmentsContext` implementation that manages appointments.

#### Appointment ID (`appointment_id`)

ID of the appointment to cancel.

#### Email (`email`)

User identification (email address) associated with the appointment.

#### Result Variable Name (`result_var`)

Name of the **request-scope variable** that will hold the cancellation result. Default is `status`.

The variable may contain:

- `existing` – previous appointment version (as you would get with **Load Appointment Element**).
- `timezone` – timezone used for evaluation.

Example:

- `${status.existing}`
- `${status.timezone}`

#### Timezone Mode (`timezone_mode`)

How the timezone is chosen:

- `DEFAULT` – use default timezone from the appointments context.
- `CLIENT` – try to use the client’s timezone.
- `SET` – use the explicit **Timezone** value.

#### Timezone (`timezone`)

Used when `timezone_mode` is `SET`. Explicit PHP timezone identifier.

#### OK (`ok`)

Flow executed when the appointment **was successfully canceled**.

#### Not Found (`not_found`)

Flow executed when the appointment **could not be found** for the given **Appointment ID** and **Email**.

### Runtime behavior

On execution the element:

1. Resolves the effective timezone.
2. Attempts to cancel the appointment identified by **Appointment ID** and **Email**.
3. Stores details of the canceled appointment (if any) in the **Result Variable Name** (`status` by default).
4. Executes:
   - **OK** when the appointment is canceled.
   - **Not Found** when no matching appointment exists.

### Example

Configuration:

- **Context ID**: `${appointments_ctx}`
- **Appointment ID**: `${appointment_id}`
- **Email**: `${user.email}`
- **Result Variable Name**: `status`

In the **OK** flow you could say:

> “Your appointment on `${status.existing.timestamp}` has been canceled.”

In the **Not Found** flow you might inform the user that there is no matching appointment to cancel.

### Tips & gotchas

- Always confirm the appointment the user wants to cancel (e.g. by reading it with **Load Appointment Element**) before executing this element.
- Make sure your **Appointment ID** and **Email** values are consistent with how appointments are created and stored in your implementation.


