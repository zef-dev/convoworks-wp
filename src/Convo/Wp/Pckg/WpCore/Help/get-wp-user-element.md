### Get WP User Element (Init Current Auth User)

Load the currently authenticated WordPress user associated with an external account (e.g. Alexa) and optionally set them as the current WP user.

### When to use

Use **Get WP User Element** when:

- You are using **account linking** (currently Amazon Alexa) and want to load the WordPress user behind the access token.
- You want to expose the linked user object to the service as a variable.
- You optionally want to set `wp_get_current_user()` so other code that relies on it works.

### Properties

#### Name (`name`)

Name under which the loaded user will be stored in **request** scope.

- Default: `user`.
- The stored value is a `ConvoWpUser` wrapper around the underlying `WP_User`.

Examples:

- `${user.ID}`
- `${user.nickname}`
- `${user.user_email}`
- `${user.get().get('user_email')}`
- `${user.get().to_array()['user_email']}`
- `${user.get().has_cap('manage_convoworks')}`

#### Set as Current User? (`should_set_as_current_user`)

Whether to call `wp_set_current_user()` with the loaded user ID.

- Default: `true`.
- When enabled, functions that rely on `wp_get_current_user()` will see this user.

#### Prompt for linking (`prompt_for_linking`)

Whether to **prompt for account linking** if a user cannot be loaded.

- Default: `false`.
- Currently implemented for Alexa:
  - Calls `$response->promptAccountLinking()`.
  - Ends the session (`setShouldEndSession(true)`).
  - Throws `EndRequestException` to stop the service.

### Runtime behavior

At runtime the element:

1. Evaluates `name`, `should_set_as_current_user`, and `prompt_for_linking`.
2. Checks the request type:
   - Currently supports `AmazonCommandRequest` (Alexa) and sets `type = 'amazon'`.
   - If request type is unsupported:
     - Logs a warning.
     - Sets the target variable (e.g. `${user}`) to `null` and returns.
3. Retrieves the access token and service ID from the request:
   - If the token is missing:
     - Throws `DataItemNotFoundException`.
4. Uses `AdminUserDataProvider` to find the user by access token and service ID.
5. Wraps the resulting WP user in `ConvoWpUser` and stores it in request scope under `${name}`.
6. If `should_set_as_current_user` is true:
   - Calls `wp_set_current_user()` with the user’s ID.
7. If a `DataItemNotFoundException` is thrown and `prompt_for_linking` is true:
   - For Alexa, prompts account linking and ends the session.
   - Otherwise sets `${name}` to `null` and returns.

### Example

Link Alexa account to a WordPress user and check their capabilities:

- **Name**: `user`
- **Set as Current User?**: `true`
- **Prompt for linking**: `true`

Later in the flow:

- Check if the user has the capability:
  - `${user.get().has_cap('manage_convoworks')}`
- Use the email:
  - `${user.user_email}`

If the account is not linked and `prompt_for_linking` is true, the user is taken through the account linking flow and the session ends.

### Tips

- Always handle the case where `${user}` may be `null` (e.g. unsupported platform or missing token).
- If you rely on WordPress APIs that use `wp_get_current_user()`, keep **Set as Current User?** enabled.
- Combine this element with **WP Insert User Element** and **WP Update User Meta Element** to complete account linking and profile enrichment flows.


