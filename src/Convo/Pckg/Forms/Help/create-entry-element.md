### Create Form Entry

Create a new form entry in the configured **forms context** based on the provided field values.

### When to use

Use **Create Form Entry** when you need to:

- **Store a new submission** coming from a user (e.g. contact form, survey, registration).
- Validate that the data satisfies the rules defined by the underlying forms context.
- Branch your workflow depending on whether the entry was successfully created or there were validation errors.

### Properties

#### Context ID (`context_id`)

- Id of the referenced **forms context** that actually persists the entry.
- Defaults to `forms`.
- Must match the **Context ID** of a matching forms context component (for example `Dummy Form Context` or a custom implementation).

#### Entry (`entry`)

- Associative array of **field key → field value** pairs.
- Represents the data you want to save as a new entry.
- Typical values:

  - `${request.params}` – forward all collected parameters.
  - An explicit map built with the params editor, e.g. `email = ${user_email}`, `name = ${user_name}`.

#### Result Variable Name (`result_var`)

- Name of the **status variable** that will contain additional information about the operation.
- Default: `status`.
- Available in the **request scope** after the element executes.

#### OK flow (`ok`)

- Child workflow that runs **when the entry was successfully created** (no validation errors).
- Use it to confirm the submission, continue the conversation, or show a success message.

#### Validation error flow (`validation_error`)

- Child workflow that runs **when validation fails**.
- Use it to tell the user what went wrong and to ask for corrections.

### Result variable structure

Assuming the default `Result Variable Name` is `status`, the component populates:

- `${status.entry_id}` – id of the newly created entry (available in **OK** flow).
- `${status.message}` – string error message (available in **Validation error** flow).
- `${status.errors}` – array of validation errors (available in **Validation error** flow).

If you change `Result Variable Name` to something else (for example `create_result`), adjust expressions accordingly:

- `${create_result.entry_id}`
- `${create_result.message}`
- `${create_result.errors}`

### Examples

#### Basic create

- **Context ID**: `forms`
- **Entry** (params editor):
  - `email` = `${user_email}`
  - `name` = `${user_name}`
- **Result Variable Name**: `status`

In the **OK** flow you can say:

> Your form was submitted successfully. Reference: `${status.entry_id}`.

In the **Validation error** flow you can say:

> There was a problem with your submission: `${status.message}`.

And optionally inspect `${status.errors}` for a more detailed list per field.

### Tips

- Make sure **Context ID** matches an existing forms context; otherwise, the element cannot create entries.
- Use a **dedicated result variable name** (e.g. `create_status`) if you have several form operations in the same block.
- Use the **Validation error** flow to guide the user through fixing individual fields, not just to display a generic error.


