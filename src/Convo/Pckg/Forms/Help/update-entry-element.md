### Update Form Entry

Update an existing form entry in the configured **forms context** with new field values.

### When to use

Use **Update Form Entry** when you need to:

- Change or correct data in an already stored entry (e.g. user updates their email or preferences).
- Support “edit” flows where a user reviews and modifies previously submitted information.

### Properties

#### Context ID (`context_id`)

- Id of the referenced **forms context** where the entry is stored.
- Must match the **Context ID** of the context that owns the entry.

#### Entry ID (`entry_id`)

- Id of the existing entry you want to update.
- Typically comes from:
  - `${status.entry_id}` from **Create Form Entry**.
  - `${status.value.entry_id}` or `${status.entry.entry_id}` from **Search / Load Form Entry**.

#### Entry (`entry`)

- The new entry data that will overwrite the previous data.
- Associative array of **field key → field value** pairs.
- You can update only some fields; behavior for missing fields depends on the underlying forms context.

#### Result Variable Name (`result_var`)

- Name of the **status variable** that contains information about the update operation.
- Default: `status`.
- Available in the **request scope** after the element executes.

#### OK flow (`ok`)

- Child workflow that runs **when the entry was successfully updated**.

#### Validation error flow (`validation_error`)

- Child workflow that runs **when validation fails** for the updated data.

### Result variable structure

Assuming the default `Result Variable Name` is `status`, the component typically populates:

- `${status.previous}` – the entry **before** update (OK flow).
- `${status.updated}` – the entry **after** it has been updated (OK flow).
- `${status.message}` – string error message (Validation error flow).
- `${status.errors}` – array of validation errors (Validation error flow).

If you change `Result Variable Name` (for example to `update_status`), use:

- `${update_status.previous}`
- `${update_status.updated}`
- `${update_status.message}`
- `${update_status.errors}`

### Examples

#### Update a single field

1. Load an entry using **Load Form Entry** into `load_status`.
2. Use **Update Form Entry** with:
   - **Context ID**: `forms`
   - **Entry ID**: `${load_status.entry.entry_id}`
   - **Entry** (params editor): `email` = `${new_email}`
   - **Result Variable Name**: `update_status`

In the **OK** flow you can say:

> Email changed from `${update_status.previous.meta_values.email}` to `${update_status.updated.meta_values.email}`.

In the **Validation error** flow:

> There was a problem updating your entry: `${update_status.message}`.

### Tips

- Reuse the same **Entry ID** you got from create/search/load operations to avoid inconsistencies.
- Use both `previous` and `updated` values to explain changes or for auditing/logging.
- When you perform multiple updates in a row, consider using separate result variable names or immediately copying key values you need to preserve.


