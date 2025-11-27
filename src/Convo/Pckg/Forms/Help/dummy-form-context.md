### Dummy Form Context

Example implementation of the **Convoworks Forms** context that stores form entries in the **User** scope.

### When to use

Use **Dummy Form Context** when you need to:

- Quickly **prototype and test** form-based workflows without connecting to a real forms system.
- Understand how a forms context behaves before you implement your own context class.
- Keep all entries stored per user during experimentation.

### Properties

#### Context ID (`id`)

- Unique identifier for this forms context.
- Default: `form_ctx`.
- Other components (Create/Load/Update/Delete/Search Form Entries) must point their **Context ID** to this value.

#### Required Fields (`required_fields`)

- Comma-separated list of **required field names**.
- Used by the context to validate incoming entries.
- Example:

  - `name,email,message`

### Searching entries

When you use this context with **Search Form Entries**:

- The **Search** property is expected to be an **associative array** containing field name → expected value pairs.
- Example:

  - `${ { "email" : ${user_email}, "status" : "new" } }`

The exact matching behavior (equality, partial matching, etc.) is defined by the dummy context implementation, but the shape of the search value follows the “field → value” pattern.

### Examples

#### Basic setup

1. Add **Dummy Form Context** to your service.
2. Set:
   - **Context ID**: `forms`
   - **Required Fields**: `name,email`
3. In all Forms elements, set **Context ID** to `forms`.

This gives you a simple, in-memory forms backend you can use with **Create / Load / Update / Delete / Search Form Entries**.

### Tips

- Use **Dummy Form Context** only for testing and examples; for production scenarios you should replace it with a real forms context implementation.
- Keep the **Context ID** short and readable (e.g. `forms`, `contact_forms`) so it is easy to reference across components.
- Start with a minimal set of **Required Fields** and extend it as you refine your validation rules.


