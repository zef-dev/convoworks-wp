### Simple string filter

Match a **substring** in the user text, optionally requiring that the text **starts with** that substring, and store the match into a slot.

### When to use

Use **Simple string filter** when you want to:

- Detect that the user text **contains** a specific phrase (case‑insensitive).
- Or ensure the text **begins with** a keyword like “order”, “cancel”, or “help”.
- Map the detected phrase to a **slot value** for later use in your workflow.

This filter is often used inside **Plain text request filter**, **OR Filter**, or **AND filter**.

### Properties

#### Search string (`search`)

Phrase to look for in the user text.

- **Type**: text (can use expressions via `${...}`).
- **Default**: empty string.
- **Description**: If found, the filter can store either this phrase or a predetermined value into a slot.

#### Starts with (`starts_with`)

Whether the text must start with the search string.

- **Type**: boolean (can be expression).
- **Default**: `false`.
- **When true**: the filter only matches if the user text begins with the search string.
- **When false**: the filter matches when the search string appears **anywhere** in the text.

#### Slot name (`slot_name`)

Name of the slot to store the match into.

- **Type**: text.
- **Default**: `match`.
- **Description**: If empty, the filter uses `match` as a default name.

#### Slot value (`slot_value`)

Value to assign to the slot when a match is found.

- **Type**: text (can be expression).
- **Default**: `null`.
- **Description**:
  - If provided, that value is stored in the slot.
  - If empty, the **search string** is stored instead.

### Runtime behavior

At runtime, the filter:

- Reads the current request text and evaluates `search`, `starts_with`, and `slot_value` (expressions are resolved).
- Performs a case‑insensitive search:
  - If **Starts with** is enabled, it checks that the text begins with `search`.
  - Otherwise, it checks that `search` appears anywhere in the text.
- When a match is found:
  - Determines the **slot value**:
    - If `slot_value` is set (after evaluation), uses that.
    - Otherwise, uses the `search` phrase.
  - Determines the **slot name**:
    - If `slot_name` is set, uses that.
    - Otherwise, uses `match`.
  - Sets the slot in the filter result.

If no match is found, the filter result is empty.

### Example

To detect that the user wants to order food:

- Add a **Simple string filter** inside a **Plain text request filter**.
- Configure properties:
  - **Search string**: `order`
  - **Starts with**: `true`
  - **Slot name**: `action`
  - **Slot value**: `order`

When the user types “Order a pizza”, the filter matches and sets:

> `action = "order"`

### Tips

- Use **Starts with** for commands that should begin with a keyword (e.g. “order”, “cancel”).
- For synonyms that mean the same thing, wrap multiple Simple string filters inside an **OR Filter**.
- Keep `slot_value` stable across several filters when they represent the same conceptual action (e.g. always set `"yes"` for positive confirmations).


