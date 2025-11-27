### Search Form Entries

Search form entries in the configured **forms context** by a given filter and branch the workflow based on the number of matches.

### When to use

Use **Search Form Entries** when you need to:

- List or locate entries that match certain criteria (e.g. all submissions from a user, all “open” requests).
- Branch the conversation depending on whether there are **no results**, **one**, or **many**.

### Properties

#### Context ID (`context_id`)

- Id of the referenced **forms context** where entries are stored.
- Must match the **Context ID** of the target context.

#### Search (`search`)

- Value that represents the **search criteria**.
- The exact shape and meaning is defined by the referenced forms context.
- With `Dummy Form Context`, this is typically an **associative array** of `field → value` pairs.

#### Limit (`limit`)

- Maximum number of entries to return.
- Default: `IFormsContext::DEFAULT_LIMIT`.
- Use it to implement paging or to limit result size for large datasets.

#### Offset (`offset`)

- Index of the first entry to return.
- Default: `0`.
- Use it together with **Limit** to navigate through pages of results.

#### Order by (`order_by`)

- Array of **field name → direction** pairs.
- Direction is usually `"ASC"` or `"DESC"`.
- Example (params editor):
  - `created_at` = `DESC`
  - `id` = `ASC`

#### Multiple flow (`multiple_flow`)

- Child workflow that runs when the search finds **multiple entries**.

#### Single flow (`single_flow`)

- Child workflow that runs when the search finds **exactly one entry**.
- If left empty, the **Multiple** flow is used instead.

#### Empty flow (`empty_flow`)

- Child workflow that runs when the search finds **no entries**.
- If left empty, the **Multiple** flow is used instead.

#### Result Variable Name (`result_var`)

- Name of the **status variable** that holds the search result and metadata.
- Default: `status`.
- Available in the **request scope** after the element executes.

### Result variable structure

Assuming the default `Result Variable Name` is `status`, the component populates:

- `${status.result}` – array of entries found.
- `${status.count}` – total count of found results.
- `${status.value}` – single entry, available only in the **Single** flow.

If you change `Result Variable Name` (for example to `search_status`), adjust expressions:

- `${search_status.result}`
- `${search_status.count}`
- `${search_status.value}`

### Examples

#### Basic search with all flows

- **Context ID**: `forms`
- **Search**: `${ { "email": ${user_email} } }`
- **Limit**: `10`
- **Offset**: `0`
- **Result Variable Name**: `status`

- **Multiple flow**:
  - Iterate over `${status.result}` and tell the user how many entries you found.
- **Single flow**:
  - Directly use `${status.value}` to show or edit the single entry.
- **Empty flow**:
  - Inform the user that nothing was found and maybe offer to create a new entry.

### Tips

- Use **Limit** and **Offset** to create paginated experiences in your conversation.
- Prefer a dedicated result variable name (e.g. `search_status`) when combining multiple form operations.
- Be explicit about how your forms context interprets the **Search** value (e.g. exact match vs. partial match) and document that in your service design.


