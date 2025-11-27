### WP Insert Post Element

Insert or update a WordPress post and branch the flow based on success or failure.

### When to use

Use **WP Insert Post Element** when:

- You want to create posts (or custom post types) from a conversation (e.g. contact requests, orders, tickets).
- You need to **update** an existing post by ID from user input or previous steps.
- You want a convenient wrapper around `wp_insert_post()` / `wp_update_post()` with conversation-aware success and error handling.

### Properties

#### Name (`created_post_var`)

Name of the **request-scope** variable that will hold the result.

- On success it will contain:  
  `{'post': WP_Post}`
- On failure it will contain:  
  `{'wp_error': WP_Error}`

Default: `status`.

#### Fire After Hooks (`fire_after_hooks`)

Whether to fire the **"after insert" hooks** in WordPress.

- `true` (default) – behaves like normal `wp_insert_post()` / `wp_update_post()` with hooks.
- `false` – skip firing the after-insert hooks.

#### WP Post args (`post_args`)

Key–value pairs that become the `$postarr` argument for `wp_insert_post()` / `wp_update_post()` (except `tax_input` and `meta_input` which are handled separately).

Defaults:

- `post_type`: `post`
- `post_title`: `Hello World!`
- `post_content`: ``
- `post_status`: `publish`

You can add any other valid field described in the WordPress documentation for `wp_insert_post()`, and you can use expressions:

- `post_title` → `${request.title}`
- `post_content` → `${request.body}`

To **update** an existing post, include `ID` with the post ID you want to update.

#### WP Post tax input (`post_tax_input`)

Key–value pairs that fill the `tax_input` field in the final `$postarr`.

- Keys are taxonomy names (e.g. `category`, `post_tag`, or custom taxonomy).
- Values are term IDs, slugs, or arrays depending on the taxonomy configuration.

Example:

- `category` → `${selected_categories}`

#### WP Post meta input (`post_meta_input`)

Key–value pairs that fill the `meta_input` field in the final `$postarr`.

- Keys are meta keys.
- Values are meta values.

Example:

- `source` → `conversation`
- `conversation_id` → `${session.conversation_id}`

#### On Success (`on_success`)

Child components to execute when the post is **successfully inserted or updated** (no `WP_Error`).

The `${created_post_var}` parameter will look like:

```text
${status.post}        // WP_Post
${status.post.ID}
${status.post.post_title}
${status.post.post_content}
```

#### On Failure (`on_failure`)

Child components to execute when `wp_insert_post()` / `wp_update_post()` returns a **`WP_Error`**.

The `${created_post_var}` parameter will look like:

```text
${status.wp_error}         // WP_Error
${status.wp_error.errors}
${status.wp_error.error_data}
```

### Runtime behavior

At runtime the element:

1. Evaluates all `post_args`, `post_tax_input`, and `post_meta_input` with the service’s expression language.
2. Builds a `$post_arr` that merges post, taxonomy, and meta data.
3. Calls:
   - `wp_update_post($post_arr, true, $fire_after_hooks)` if `ID` is set and non-empty.
   - Otherwise `wp_insert_post($post_arr, true, $fire_after_hooks)`.
4. If no error:
   - Loads the full `WP_Post` using `get_post()`.
   - Stores it under `${created_post_var}.post` in **request** scope.
   - Executes all **On Success** components.
5. If there is a `WP_Error`:
   - Stores it under `${created_post_var}.wp_error` in **request** scope.
   - Executes all **On Failure** components.

### Example

Create a new support ticket as a custom post type:

- **Name**: `status`
- **WP Post args**:
  - `post_type` → `support_ticket`
  - `post_title` → `Ticket from ${user.nickname}`
  - `post_content` → `${request.message}`
  - `post_status` → `publish`
- **WP Post tax input**:
  - `ticket_category` → `${selected_category_ids}`
- **WP Post meta input**:
  - `user_id` → `${user.ID}`
  - `channel` → `alexa`

In **On Success**:

- Respond with something like:
  - `Your ticket #${status.post.ID} has been created.`

In **On Failure**:

- Log `${status.wp_error.errors}` and tell the user there was a problem creating the ticket.

### Tips

- Always set a meaningful **Name** (`created_post_var`) and use it consistently in your flows.
- Use `ID` in **WP Post args** to update existing posts instead of creating new ones.
- Keep `fire_after_hooks` enabled unless you have a specific reason to bypass post-insert hooks.
- When debugging, log the arguments using a `Log` element or inspect the service JSON to verify that your expressions evaluate as expected.


