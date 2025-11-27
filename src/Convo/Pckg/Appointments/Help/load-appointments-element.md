### Load Appointments Element

Loads **one or more appointments** for a user identified by email and exposes them for further processing.

### When to use

Use **Load Appointments Element** when you need to:

- Retrieve the user’s upcoming, past, or all appointments.
- Present the user with a list to choose from.
- Branch the conversation differently for multiple, single, or no results.

### Properties

#### Context ID (`context_id`)

ID of the referenced `IAppointmentsContext` implementation that manages appointments.

#### Email (`email`)

User identification (email address) for which appointments are loaded.

- Example: `${user.email}` or `john@example.com`.

#### Mode (`mode`)

Controls which appointments are loaded:

- `current` – (default) load currently active / future appointments.
- `past` – load only already finished appointments.
- `all` – load both current and past appointments.

#### Number of Appointments to Load (`limit`)

Maximum number of appointments to load.

- Default: `10`

#### Return Variable Name (`return_var`)

Name of the **request-scope variable** that will contain the result. Default is `status`.

The variable will typically include:

- `appointments` – array of appointment objects.
- `timezone` – preferred timezone used for the query.

Example access:

- `${status.appointments}`
- `${status.timezone}`

#### Timezone Mode (`timezone_mode`)

How timezone is selected:

- `DEFAULT` – use default timezone from the appointments context.
- `CLIENT` – try to use the client’s timezone.
- `SET` – use the explicit **Timezone** value.

#### Timezone (`timezone`)

Used when `timezone_mode` is `SET`. Explicit PHP timezone identifier.

- Example: `Europe/Berlin`, `UTC`.

#### Multiple (`multiple`)

Flow executed when **two or more** appointments are found, or when other flows are not defined.

#### Single (`single`)

Flow executed when **exactly one** appointment is found.

- If this flow is empty and there is only one appointment, **Multiple** flow is executed instead.

#### Empty (`empty`)

Flow executed when **no appointments** are found.

- If this flow is empty and there are no appointments, **Multiple** flow is executed instead.

### Runtime behavior

On execution the element:

1. Resolves the effective timezone.
2. Loads appointments for the given **Email**, **Mode**, and **Limit**.
3. Stores them in the **Return Variable Name** (`status` by default).
4. Executes one of the flows: **Multiple**, **Single**, or **Empty**, depending on how many appointments were found and which flows are configured.

Example structure of `${status.appointments}`:

```json
[
  {
    "appointment_id": "123",
    "timestamp": 123345678,
    "payload": {
      "some_other_fields": "Used by your appointment context & WP plugin",
      "more_fields": "Some other data"
    }
  },
  {
    "appointment_id": "456",
    "timestamp": 223345678,
    "payload": {
      "some_other_fields": "Used by your appointment context & WP plugin",
      "more_fields": "Some other data"
    }
  }
]
```

### Example

Typical configuration:

- **Context ID**: `${appointments_ctx}`
- **Email**: `${user.email}`
- **Mode**: `current`
- **Number of Appointments to Load**: `10`
- **Return Variable Name**: `status`

In the **Multiple** flow, you might list all appointments; in **Single**, directly confirm the appointment; in **Empty**, offer to create a new one.

### Tips & gotchas

- Use **Mode** and **Limit** together to keep results manageable for the user.
- Always check the length of `${status.appointments}` in your flows if you do custom branching.


