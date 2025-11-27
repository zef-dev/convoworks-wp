### Timezone Wrapper Element

Executes its child elements in a specific **timezone mode** and exposes the selected timezone in a result variable.

### When to use

Use **Timezone Wrapper Element** when you need to:

- Normalize date/time handling to a specific timezone (default, client’s, or explicit).
- Run a sequence of elements under a consistent timezone context.
- Expose the resolved timezone to child components and expressions.

### Properties

#### Context ID (`context_id`)

ID of the referenced `IAppointmentsContext` that provides default timezone information.

#### Result Variable Name (`result_var`)

Name of the variable that will hold the resulting timezone information. Default is `status`.

- The variable typically contains a `timezone` object (e.g. `\DateTimeZone`), accessible as `${status.timezone}`.
- To get the timezone name: `${status.timezone.getName()}`.

#### Elements (`elements`)

Child elements to be executed in the selected timezone mode.

- Any `IConversationElement` instances can be placed here.

#### Timezone Mode (`timezone_mode`)

Controls which timezone is used:

- `DEFAULT` – use default timezone from the appointments context.
- `CLIENT` – attempt to use the client’s timezone.
- `SET` – use the explicit **Timezone** value.

#### Timezone (`timezone`)

When **Timezone Mode** is `SET`, this is the explicit PHP timezone identifier that will be used.

- Example: `Europe/Berlin`, `UTC`.

### Runtime behavior

On execution the element:

1. Resolves the effective timezone based on **Timezone Mode** / **Timezone** and context.
2. Stores it in the **Result Variable Name** (e.g. `${status.timezone}`).
3. Executes all **Elements** within that timezone context so date/time-related operations align with this setting.

### Example

Configuration:

- **Context ID**: `${appointments_ctx}`
- **Result Variable Name**: `status`
- **Timezone Mode**: `CLIENT`

Inside **Elements**, you can reference:

> “Your local timezone is `${status.timezone.getName()}`.”

### Tips & gotchas

- Wrap date- and time-sensitive flows (like appointment checks and creations) in this element to avoid timezone inconsistencies.
- When using `SET`, ensure the value is a valid PHP timezone identifier; otherwise runtime errors can occur.


