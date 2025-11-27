### Exact match filter

Match the user text against a **single expected phrase** (case‑insensitive, trimmed) and store a value into a slot when it matches exactly.

### When to use

Use **Exact match filter** when:

- You need the user to say or type **one specific phrase** (e.g. “yes”, “no”, “cancel”).
- You want strict matching without partial matches or additional words.

This filter is often used inside **Plain text request filter** and combined in **OR Filter** for multiple allowed exact phrases.

### Properties

#### Search string (`search`)

Text that is expected from the user.

- **Type**: text (can use expressions via `${...}`).
- **Default**: empty string.
- **Description**: The filter trims and normalizes the case of this string before comparing it to the user input.

#### Slot name (`slot_name`)

Name of the slot to store the match into.

- **Type**: text.
- **Default**: empty string (you should usually set this).
- **Description**: When the text matches exactly, this slot is set to either the user text or a predetermined value.

#### Slot value (`slot_value`)

Value to store when the text matches.

- **Type**: text (can be expression).
- **Default**: `null`.
- **Behavior**:
  - If provided, this value is stored into the slot.
  - If empty, the **user text** (normalized) is stored.

### Runtime behavior

At runtime, the filter:

- Reads the request text, trims it, and converts it to lowercase.
- Evaluates `search`, trims it, and converts it to lowercase.
- Compares the two normalized strings.
- If they are equal:
  - Chooses the slot value:
    - `slot_value` if provided.
    - Otherwise, the normalized user text.
  - Sets that value into the filter result under `slot_name`.
- If they differ, the filter result is empty.

Punctuation or extra words will cause the match to fail (e.g. `yes please` does **not** match `yes`).

### Example

To handle a strict **“cancel”** command:

- Add an **Exact match filter** inside a **Plain text request filter**.
- Configure properties:
  - **Search string**: `cancel`
  - **Slot name**: `command`
  - **Slot value**: `cancel`

When the user types `cancel`, the filter sets:

> `command = "cancel"`

If the user types `cancel order` or `please cancel`, the filter does **not** match.

### Tips

- Use Exact match filter for **short, unambiguous commands** or answers.
- For more flexible “contains” behavior, prefer **Simple string filter** or **Regex filter**.
- To support multiple exact phrases with the same meaning, place several Exact match filters inside an **OR Filter** and give them the same `slot_name` / `slot_value`.


