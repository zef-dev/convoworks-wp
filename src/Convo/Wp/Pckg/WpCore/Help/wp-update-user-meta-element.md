### WP Update User Meta Element

Update meta fields for an existing WordPress user and branch the flow depending on whether the user was found and meta was provided.

### When to use

Use **WP Update User Meta Element** when:

- You already have a specific user ID (e.g. from account linking or prior logic).
- You want to add or update one or more **user meta** fields.
- You need separate flows for “update succeeded” vs. “user not found” or “invalid configuration”.

### Properties

#### Status Var (`updated_user_var`)

Name of the **request-scope** variable that will hold the result.

On completion it will contain either:

- On success: `{'user': WP_User}`
- On failure: `{'error': string}`

Default: `status`.

#### User ID (`user_id`)

ID of the user to update.

- Required; evaluated as an expression.
- Typical usage:
  - `${user.ID}` from `Init current auth user element` or `Get WP User Element`.

#### WP User meta input (`user_meta_input`)

Key–value pairs of user meta to set.

- Keys are meta keys.
- Values are meta values (expressions allowed).

Example:

- `preferred_language` → `${request.language}`
- `last_seen` → `${now()}`

### Flows

#### On Success (`on_success`)

Executed when the user is found and at least one meta value is provided.

The `${updated_user_var}` parameter will contain:

```text
${status.user}               // WP_User
${status.user.ID}
${status.user.data.user_email}
```

#### On Failure (`on_failure`)

Executed when:

- The user with the given ID does not exist, or
- No meta values were provided (in which case an exception is thrown rather than a normal failure flow).

`${updated_user_var}.error` will contain a descriptive error message when the user is not found.

### Runtime behavior

At runtime the element:

1. Evaluates `updated_user_var`, `user_id`, and `user_meta_input`.
2. Attempts to load the user via `get_user_by('ID', $userId)`.
3. If no user is found:
   - Sets `${updated_user_var}` to `{'error': "User with ID [...] was not found"}`.
   - Logs and runs **On Failure**.
4. If the user exists:
   - If `user_meta_input` is empty:
     - Throws `InvalidComponentDataException` (misconfiguration).
   - Otherwise:
     - Calls `update_user_meta($userId, $metaKey, $metaValue)` for each meta pair.
     - Sets `${updated_user_var}` to `{'user': WP_User}`.
     - Runs **On Success**.

### Example

Update a user’s phone number and newsletter preference:

- **Status Var**: `status`
- **User ID**: `${user.ID}`
- **WP User meta input**:
  - `phone` → `${request.phone}`
  - `newsletter_opt_in` → `${request.opt_in}`

In **On Success**:

- `Your contact preferences have been updated for ${status.user.data.user_email}.`

In **On Failure**:

- `I couldn't update your profile. Please try again later.` (and optionally log `${status.error}`).

### Tips

- Ensure you always provide at least one meta field; otherwise the component will throw an exception.
- Prefer using `Get WP User Element` to obtain a reliable `user.ID` before updating meta.
- Model the **Status Var** name carefully (e.g. `user_update`) so it does not clash with other status variables in the same scope.


