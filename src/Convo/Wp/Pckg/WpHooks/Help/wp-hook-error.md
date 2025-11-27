### WP Hook Error

Return a `WP_Error` object from a WordPress hook and stop the workflow.

### When to use

Use **WP Hook Error** inside a **WP Hook Processor** flow when you need to:

- Signal an error to WordPress by returning a `WP_Error` instance.
- Abort further processing in the Convoworks workflow for this hook call.
- Provide structured error information (`code`, `message`, `data`) that other code can inspect.

This is particularly useful in **filters or actions** that are expected to short‑circuit on failure (for example validation, permission checks, or pre‑save hooks).

### Properties

#### Code (`code`)

Expression that evaluates to the **error code** (string).

- Keep this short and machine‑friendly (e.g. `invalid_request`, `no_permission`).
- Example: `"convoworks_invalid_state"` or `${"convoworks_" ~ request.getHook()}`.

#### Message (`message`)

Expression that evaluates to the **human‑readable error message**.

- Example: `"You are not allowed to perform this action."`
- Or with expressions: `"Hook " ~ request.getHook() ~ " failed for user " ~ wp_get_current_user().ID`

#### Data (`data`)

Expression that evaluates to **additional data** passed to `WP_Error`.

- Can be a string, array, or object.
- Example: `${{'hook': request.getHook(), 'args': request.getArguments()}}`

### Runtime behavior

- On `read()`:
  - If the response is a `WpHooksCommandResponse`, the element:
    - Evaluates `Code`, `Message`, and `Data`.
    - Creates a new `WP_Error` with those values.
    - Calls `setFilterResponse()` with the created `WP_Error`.
  - Otherwise, it logs a warning (non‑hooks response) and does not set the result.
- Then it throws a **`SessionEndedException`** to stop any remaining elements in the workflow.

### Example

You want to prevent a hook from continuing if a precondition fails:

- In the **OK flow** of a **WP Hook Processor**:
  - Add a rule (or other logic) to detect an invalid state.
  - When invalid, use **WP Hook Error** with:
    - **Code**: `"convoworks_forbidden"`
    - **Message**: `"Operation is not allowed in the current context."`
    - **Data**: `${{'hook': request.getHook(), 'user_id': wp_get_current_user().ID}}`

WordPress code that receives this result can check `is_wp_error()` and react accordingly.

### Tips

- Always use **meaningful error codes**; they make debugging and conditional handling easier.
- Consider including the **hook name** and **arguments** in `Data` for easier tracing.
- In filter hooks that normally return a non‑error value, make sure the surrounding code is prepared to receive a `WP_Error`.


