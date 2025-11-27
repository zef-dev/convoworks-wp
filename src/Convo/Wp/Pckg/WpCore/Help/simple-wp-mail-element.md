### WP Mail

Send an email using WordPress’s `wp_mail()` function with simple configuration.

### When to use

Use **WP Mail** when:

- You need to send a simple notification email from a conversation (e.g. contact form, order confirmation).
- A full-featured mailing plugin or templating system is not required.
- You are comfortable with plain‐text or simple HTML message bodies.

### Properties

#### To (`to`)

Recipient email address(es).

- Can be a single address or multiple addresses separated by commas.
- Expressions are allowed, e.g. `${user.user_email}`.

Supported formats:

- `user@example.com`
- `user@example.com, anotheruser@example.com`
- `User <user@example.com>`
- `User <user@example.com>, Another User <anotheruser@example.com>`

#### Subject (`subject`)

Email subject line.

- Expression allowed.

Example:

- `New contact request from ${user.nickname}`

#### Message (`message`)

Email body content.

- Expression allowed, including basic HTML if supported by your mail setup.

Example:

- `User ${user.nickname} sent the following message: ${request.message}`

#### From (`from`)

Optional sender address.

- If omitted or empty, the WordPress admin email (from `admin_email` option) is used.
- Expression allowed, e.g. `${'Support <support@example.com>'}`.

### Runtime behavior

At runtime the element:

1. Evaluates `from`, `to`, `subject`, and `message`.
2. If **From** is empty, sets it to `get_option('admin_email')`.
3. Builds a `From:` header with the selected `from` value.
4. Logs and calls `wp_mail($to, $subject, $message, $headers)`.
5. If `wp_mail()` returns `false`, throws an exception:
   - `Could not send email [subject] to [to]`.

### Example

Send a contact form email:

- **To**: `support@example.com`
- **Subject**: `New message from ${user.nickname}`
- **Message**:
  - `User ${user.nickname} (${user.user_email}) says: ${request.message}`
- **From**: `` `${user.user_email}` `` (or leave empty to use admin email)

### Tips

- If you use user‑provided email addresses as **From**, ensure your server is configured properly to avoid spam issues (SPF, DKIM).
- Consider including both the user’s address and your own domain in **From** or **Reply‑To** headers if needed (advanced header use would require extending the component).
- For more complex email layouts or tracking, integrate with a dedicated mailing plugin and use its APIs instead.


