### Formidable Forms Context

Provides integration with the [Formidable Forms](https://wordpress.org/plugins/formidable/) plugin so you can work with form entries from Convoworks.

Use this context to create, update, delete, and search form entries.

### When to use

Use **Formidable Forms Context** when:

- You already have one or more forms built with Formidable Forms.
- You want to collect data through a conversational interface and store it as Formidable entries.
- You need to search and load existing entries, possibly using custom queries.

Typical use cases:

- Creating a new entry when the user completes a dialog.
- Updating an existing entry based on user input.
- Searching user submissions by meta data or other criteria.

### Properties

#### Context ID (`id`)

Unique ID used to reference this context from other components.

Examples:

- `contact_form`
- `${CURRENT_FORM_CONTEXT_ID}`

You can access the context later via:

```text
${contexts['contact_form']}
```

#### Form ID (`form_id`)

ID or **form key** of the Formidable form this context will operate on.

- Accepts either the numeric form ID or the unique form key.
- Can be a literal or an expression:

  - `5`
  - `"contact-form"`
  - `${FORM_ID}`

#### User ID (`user_id`)

Optional WordPress user ID that should be associated with operations in this context.

- Can be left empty to use the default user or anonymous context.
- Can be an expression, for example:

  - `${user.ID}`
  - `${customer_user_id}`

### Searching entries

When using this context together with a **Search Forms Element**, the `search` parameter is expected to be a **string**.

- That string is passed as the `$where` argument to:

  ```text
  \FrmEntry::getAll($where, $order_by, $limit, $meta, $inc_form)
  ```

- You are responsible for building a valid `$where` expression that Formidable understands.

### Available helper functions

You can use the following helper functions in expressions (registered by this package):

- `formidable_get_form_id(formKey)`  
  Returns the **numeric form ID** for a given form key.

- `formidable_get_field_id(fieldKey)`  
  Returns the **numeric field ID** for a given field key.

- `formidable_get_field_key(fieldId)`  
  Returns the **field key (string)** for a given numeric field ID.

Examples:

```text
${formidable_get_form_id('contact-form')}
${formidable_get_field_id('email')}
${formidable_get_field_key(25)}
```

### Custom queries and loading entries

If you perform custom queries with **WP DB Element** to fetch entry IDs, you can use this context to get fully loaded Formidable entries:

```text
${contexts['my_form_context'].getEntry(entryId)}
```

This lets you:

- Run complex SQL via WP DB Element.
- Convert returned entry IDs into full Formidable entries through the context.

### Example

1. Add **Formidable Forms Context** with:

   - **Context ID**: `contact_form`
   - **Form ID**: `${formidable_get_form_id('contact-form')}`
   - **User ID**: `${user.ID}`

2. Use a forms-related element (e.g. *Create Form Entry Element*) and set its Context ID to `contact_form`.

3. When you need to load an entry by ID:

```text
${contexts['contact_form'].getEntry(entry_id)}
```

### Tips

- Prefer using form keys together with `formidable_get_form_id()` so your configuration is resilient to ID changes.
- Store commonly used form IDs and user IDs in variables or service parameters to avoid repetition.
- Be careful when crafting `$where` conditions for `\FrmEntry::getAll()` – test them on a staging site first.


