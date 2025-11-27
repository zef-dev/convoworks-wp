### Load Form Entry

Load a single form entry from the configured **forms context** by its id and expose it to the workflow.

### When to use

Use **Load Form Entry** when you need to:

- Retrieve the full details of a specific entry (for example to show or edit it).
- Fetch an entry that was created or found earlier in the conversation.

### Properties

#### Context ID (`context_id`)

- Id of the referenced **forms context** where the entry is stored.
- Must match the **Context ID** of the context that owns the entry.

#### Entry ID (`entry_id`)

- Id of the **existing entry** you want to load.
- Typically comes from:
  - `${status.entry_id}` from **Create Form Entry**.
  - `${status.value.entry_id}` from **Search Form Entries** (single flow).

#### Result Variable Name (`result_var`)

- Name of the **status variable** that will contain the loaded entry and operation metadata.
- Default: `status`.
- Available in the **request scope** after the element executes.

#### OK flow (`ok`)

- Child workflow that runs **when the entry was successfully found and loaded**.

### Result variable structure

Assuming the default `Result Variable Name` is `status`, the component populates:

- `${status.entry}` – the loaded entry object/array.

Typical JSON representation of `${status.entry}`:

```json
{
  "entry_id": "123",
  "user_id": "123",
  "meta_values": {
    "key_1": "value 1",
    "key_2": "value 2"
  }
}
```

If you change `Result Variable Name` (for example to `load_status`), access it as `${load_status.entry}`.

### Examples

#### Load entry and read one field

- **Context ID**: `forms`
- **Entry ID**: `${status.entry_id}` (from a previous Create/Search step)
- **Result Variable Name**: `load_status`

In the **OK** flow you can use:

> The email on this entry is `${load_status.entry.meta_values.email}`.

### Tips

- Always verify that you have a valid **Entry ID** before calling this element; otherwise, behavior will depend on the underlying context.
- Use a dedicated result variable (e.g. `load_status`) when combining multiple form operations in the same block to avoid overwriting data.
- When building UI or responses, avoid exposing raw internal ids to end users unless necessary.


