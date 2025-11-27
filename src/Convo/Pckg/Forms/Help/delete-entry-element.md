### Delete Form Entry

Delete an existing form entry in the configured **forms context** by its id.

### When to use

Use **Delete Form Entry** when you need to:

- Remove a previously created entry (e.g. user cancels a request or asks to delete stored data).
- Clean up obsolete or duplicate records in a forms-powered workflow.

### Properties

#### Context ID (`context_id`)

- Id of the referenced **forms context** where the entry is stored.
- Must match the **Context ID** of the context that owns the entry.

#### Entry ID (`entry_id`)

- Id of the **existing entry** you want to delete.
- Typically comes from a previous operation, for example:
  - `${status.entry_id}` from **Create Form Entry**.
  - `${status.entry.entry_id}` from **Load Form Entry**.

#### Result Variable Name (`result_var`)

- Name of the **status variable** that contains additional information about the delete operation.
- Default: `status`.
- Available in the **request scope** after the element executes.

#### OK flow (`ok`)

- Child workflow that runs **when the entry was successfully deleted**.
- Use it to confirm deletion or continue with follow-up actions.

### Result variable structure

Assuming the default `Result Variable Name` is `status`, the component populates:

- `${status.previous}` – the previous entry value **before** deletion.

If you change `Result Variable Name` to something else (for example `delete_result`), adjust expressions accordingly:

- `${delete_result.previous}`

### Examples

#### Delete the last created entry

1. Use **Create Form Entry** and store its result in `create_status`.
2. Use **Delete Form Entry** with:
   - **Context ID**: `forms`
   - **Entry ID**: `${create_status.entry_id}`
   - **Result Variable Name**: `delete_status`

In the **OK** flow you can say:

> Entry `${delete_status.previous.entry_id}` was deleted.

### Tips

- Be careful with **Entry ID** – if you pass an id that does not exist, behavior depends on the underlying forms context (it may fail silently or throw an error).
- Keep the **previous** value if you need to show the user what was removed or to support an “undo” pattern.
- Use a specific result variable name (e.g. `delete_status`) to avoid overwriting status from other components.


