### Check Appointment Time Element

Checks whether a requested appointment slot is available and exposes **suggested alternative time slots** when it is not.

### When to use

Use **Check Appointment Time Element** when you have a requested date and time and you need to:

- Verify that the slot is still free before creating or updating an appointment.
- Offer alternative time suggestions back to the user (for example via voice or chat).
- Branch the conversation based on whether the requested slot is available or not.

### Properties

#### Context ID (`context_id`)

ID of the referenced `IAppointmentsContext` implementation that actually manages appointments.

- Example: `${appointments_ctx}`

#### Appointment Date (`appointment_date`)

Optional requested appointment date in `Y-m-d` format (MySQL `DATE`).

- Example: `2025-01-31`
- Can be an expression, for example: `${date}`.

#### Appointment Time (`appointment_time`)

Optional requested appointment time in `H:i:s` format (MySQL `TIME`).

- Example: `14:30:00`
- Can be an expression, for example: `${time}`.

#### Result Variable Name (`result_var`)

Name of the **request-scope variable** that will hold the check result. Default is `status`.

The variable contains:

- `suggestions` – array of suggested alternative slots.
- `requested_time` – requested appointment as a timestamp.
- `timezone` – preferred timezone used for evaluation.

Example access:

- `${status.suggestions}`
- `${status.requested_time}`
- `${status.timezone}`

#### Timezone Mode (`timezone_mode`)

Controls how timezone is resolved:

- `DEFAULT` – use the default timezone from the referenced `IAppointmentsContext`.
- `CLIENT` – try to obtain the client’s timezone.
- `SET` – use an explicitly configured timezone (see **Timezone**).

#### Timezone (`timezone`)

Only used when `timezone_mode` is `SET`. The explicit PHP timezone identifier.

- Example: `Europe/Berlin`, `America/New_York`

#### Suggestion Builder (`suggestions_builder`)

Component (service element) implementing `\Convo\Pckg\Appointments\Freeslot\IFreeSlotQueueFactory` used to build the suggestions list.

- You can use **Default free slot collector** or **Simple Free Slot Generator**, or your own implementation.

#### Available (`available_flow`)

Child flow executed when the requested slot **is available**.

#### Suggestions (`suggestions_flow`)

Default child flow that is executed when suggestions are available (and other more specific flows do not handle the case).

#### Single Suggestion (`single_suggestion_flow`)

Child flow executed when **exactly one suggestion** is available.

- If this flow is empty, the **Suggestions** flow is used instead.

#### No Suggestions (`no_suggestions_flow`)

Child flow executed when **no suggestions** are available.

- If this flow is empty, the **Suggestions** flow is used instead.

### Runtime behavior

On execution, the element:

1. Resolves the effective timezone from the **Timezone Mode** / **Timezone** and context.
2. Checks whether the requested date/time is available.
3. Populates the **Result Variable Name** (`status` by default) and executes one of the configured flows.

Example structure of `${status.suggestions}`:

```json
[
  {
    "timestamp": 1641913200,
    "timezone": "UTC"
  },
  {
    "timestamp": 1641996000,
    "timezone": "UTC"
  }
]
```

### Example

Suppose you have a context with ID `${appointments_ctx}` and you collected `date` and `time` from the user.

- **Context ID**: `${appointments_ctx}`
- **Appointment Date**: `${date}`
- **Appointment Time**: `${time}`
- **Result Variable Name**: `status`
- **Timezone Mode**: `DEFAULT`

In the **Available** flow, you can proceed to create an appointment:

> “Great, that time is free. I will book it now.”

In the **Suggestions** or **Single Suggestion** flow, you can present `${status.suggestions}` as alternative options.

### Tips & gotchas

- Make sure the **appointment date/time format** matches the expected MySQL formats (`Y-m-d` and `H:i:s`).
- Use a dedicated **Result Variable Name** per check if you need to keep multiple results in the same request.
- When using a custom **Suggestion Builder**, ensure it implements `IFreeSlotQueueFactory` and returns suggestions compatible with your flows.


