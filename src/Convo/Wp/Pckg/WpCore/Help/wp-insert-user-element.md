### WP Insert User Element

Create a new WordPress user (or reuse an existing one) and branch the flow depending on whether the user was created, already existed, or there was an error.

### When to use

Use **WP Insert User Element** when:

- You want to automatically create WordPress users from external account-linking flows (e.g. Alexa account linking).
- You need to ensure a user exists for a particular identifier (username/email) and act differently if it already exists.
- You want to store additional user meta upon creation.

### Properties

#### Name (`created_user_var`)

Name of the **request-scope** variable that will hold the result.

On completion it will contain either:

- On success or user already exists:  
  `{'user': WP_User}`
- On failure:  
  `{'wpError': WP_Error}`

Default: `status`.

#### Username (`username`)

Username for the user to be created.

- Required (element will not create a user if it is empty).
- Can be an expression, e.g. `${user.name}` from a previous step.

#### Email (`email`)

Email address for the user to be created.

- Strongly recommended so that the user can reset passwords and receive notifications.
- Can be an expression, e.g. `${user.email}`.

#### Role (`available_wp_roles`)

Role for the new user.

- Options are populated from `wp_roles()->get_names()`.
- Default is `get_option('default_role')`.

You can select a role directly in the editor or drive it via an expression.

#### WP User meta input (`user_meta_input`)

Key–value pairs for user meta to be inserted or updated after user creation.

- Keys are meta keys.
- Values are meta values (expressions allowed).

Example:

- `convoworks_service_id` → `${service.id}`
- `linked_from` → `alexa`

#### On User Exists (`on_user_exists`)

Child components executed when a user with the given **username** already exists.

- The existing user is loaded with `get_user_by('login', $username)` and stored under `${created_user_var}.user`.
- Use this flow when you want to attach behavior for returning users (e.g. “Welcome back”).

#### On Success (`on_success`)

Child components executed when a **new user is successfully created**.

You can access the user as:

```text
${status.user.ID}
${status.user.data.user_login}
${status.user.data.user_email}
```

#### On Failure (`on_failure`)

Child components executed when `wp_insert_user()` returns a `WP_Error`.

The `${created_user_var}` parameter will contain:

```text
${status.wpError}          // WP_Error
${status.wpError.errors}
${status.wpError.error_data}
```

### Runtime behavior

At runtime the element:

1. Evaluates `username`, `email`, `available_wp_roles`, and `user_meta_input`.
2. Checks `username_exists($username)`:
   - **If the username does not exist**:
     - Builds `$userArgs` with:
       - `user_login`, `user_email`, `user_pass` (generated via `wp_generate_password()`),
       - `user_activation_key` (SHA‑1 of email + timestamp),
       - `role`.
     - Calls `wp_insert_user($userArgs)`.
     - On success:
       - Loads the user with `get_user_by('ID', $createdUserResult)`.
       - Updates user meta from `user_meta_input`.
       - Stores `{'user': WP_User}` under `${created_user_var}` and runs **On Success**.
     - On failure:
       - Stores `{'wpError': WP_Error}` under `${created_user_var}` and runs **On Failure**.
   - **If the username already exists**:
     - Loads the user with `get_user_by('login', $username)`.
     - Stores `{'user': WP_User}` under `${created_user_var}`.
     - Runs **On User Exists**.

### Example

Create or reuse a user from an external profile:

- **Name**: `status`
- **Username**: `${amazon_user.name}`
- **Email**: `${amazon_user.email}`
- **Role**: `subscriber`
- **WP User meta input**:
  - `external_id` → `${amazon_user.id}`
  - `channel` → `alexa`

In **On Success**:

- Send a message:  
  `Your new account has been created. Your username is ${status.user.data.user_login}.`

In **On User Exists**:

- Send a message:  
  `Welcome back, ${status.user.data.user_login}. Your account is already linked.`

### Tips

- Use a stable and unique **username** derived from external identity (e.g. a provider ID) to avoid duplicates.
- Keep **email** in sync with the external account where possible, so that password recovery works as expected.
- Use **On User Exists** to handle idempotent flows gracefully instead of treating existing users as errors.
- Store important external IDs in **user meta** so future components can look up the WordPress user by that information.


