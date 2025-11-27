### Regex filter

Match user text using a **regular expression** and store captured values into slots for downstream logic.

### When to use

Use **Regex filter** when:

- You need more powerful pattern matching than simple substring search.
- You want to extract structured data (numbers, dates, parts of a phrase) from the user text.
- You need full control over what counts as a match and what is captured.

This filter is typically used inside a **Plain text request filter**, optionally combined with other text filters.

### Properties

#### Regex (`regex`)

Regular expression pattern to apply to the user text.

- **Type**: text.
- **Default**: empty string.
- **Important**: You do **not** need to enter the enclosing `/.../` delimiters; they are added automatically.
- **Example values**:
  - `\d+` – one or more digits.
  - `order\s+(\w+)` – keyword `order` followed by a single word.

#### Slot name (`slot_name`)

Name of the slot to store the main match into.

- **Type**: text.
- **Default**: `regex`.
- **Description**: The filter stores the **chosen value** (see below) into this slot when a match is found.

#### Slot value (`slot_value`)

Override value to store instead of the raw match.

- **Type**: text.
- **Default**: `null`.
- **Behavior**:
  - If provided, this value is stored into `slot_name`.
  - If empty, the first full match (`$matches[0]`) is stored instead.

#### Slot name (raw) (`slot_name_raw`)

Name of the slot to store the **entire matches array** into.

- **Type**: text.
- **Default**: `raw`.
- **Description**: When the regex matches, the full `$matches` array (including capture groups) is stored under this slot.

### Runtime behavior

At runtime, the Regex filter:

- Reads the user text from the request.
- Applies `preg_match` with the configured regex:
  - Delimiters `/.../` are automatically added around your pattern.
  - The first match (if any) is captured into an array.
- Logs the input, pattern, and raw matches for easier debugging.
- Determines the final value:
  - If `slot_value` is set, uses that.
  - Otherwise, uses the full match (`matches[0]`).
- If the resulting value is not empty:
  - Sets `slot_name` to that value.
  - Sets `slot_name_raw` to the **entire matches array**.

If there is no match, the filter result remains empty.

### Example

To extract a **quantity** from user text such as “order 3 pizzas”:

- Add a **Regex filter** inside a **Plain text request filter**.
- Configure properties:
  - **Regex**: `(\d+)\s+pizzas?`
  - **Slot name**: `quantity`
  - **Slot value**: leave empty (use raw number).
  - **Slot name (raw)**: `quantity_raw`

When the user types “order 3 pizzas”, the filter sets:

> `quantity = "3"`  
> `quantity_raw = ["3 pizzas", "3"]`

### Tips

- Use capture groups to extract specific pieces of data, then read them from the **raw matches** array in your expressions.
- Keep your regex patterns as **simple and readable** as possible; test them with real user sentences.
- Combine Regex filter with **Simple string filter** or **Exact match filter** when you need both high‑level intent and detailed extraction.


