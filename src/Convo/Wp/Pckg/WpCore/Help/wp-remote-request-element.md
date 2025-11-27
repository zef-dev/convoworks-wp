### WP Remote Request

Perform an external HTTP request using `wp_remote_request()` and store the result for later use in the conversation.

### When to use

Use **WP Remote Request** when:

- You need to call an **external API** (e.g. REST JSON API, form endpoint).
- You want to control method, headers, query string, body encoding, and timeout.
- You want to branch the flow on **success** / **failure** and inspect the response payload.

For internal WordPress REST API routes, prefer **WP REST Do Request**.

### Properties

#### HTTP Method (`method`)

HTTP method to use for the request.

Examples:

- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`

The value is evaluated as a string expression.

#### Full URL (`url`)

Full URL of the external endpoint.

Examples:

- `https://api.example.com/v1/posts`
- `` `${get_option('my_api_base')}/v1/orders` ``

#### Query Parameters (`query_params`)

Key–value pairs appended to the URL’s query string.

- Values can be expressions.
- Combined with any query string already present in the `url`.

Example:

- `page` → `${page_no}`
- `limit` → `10`

#### Body Parameters (`body_params`)

Key–value pairs sent in the **request body** for methods like `POST`, `PUT`, `PATCH`.

- Encoded according to **Content Type**:
  - `application/json` → JSON‐encoded body.
  - `application/x-www-form-urlencoded` → URL-encoded form.

Example:

- `name` → `${user.name}`
- `email` → `${user.email}`

#### Headers (`headers`)

Key–value pairs added to HTTP headers for the request.

Examples:

- `Authorization` → `Bearer ${access_token}`
- `X-Request-ID` → `${request_id}`

#### Content Type (`content_type`)

Content type of the **request body** for non‑GET methods.

Options:

- `application/json` (default)
- `application/x-www-form-urlencoded`

This setting controls how `body_params` is encoded.

#### Timeout (seconds) (`timeout`)

Maximum time in seconds to wait for a response.

- Default: `30`.
- Parsed as integer from the evaluated expression.

#### Result variable name (`result_name`)

Name of the **request-scope** variable where the response will be stored.

- Default: `wp_rest_result`.
- The value is a `WP_REST_Response`-like object constructed from the HTTP response:
  - Data: decoded JSON (if possible) or raw body string.
  - Status: HTTP status code.
  - Headers: all response headers.

#### On Success (`on_success`)

Child components executed when the request **does not return** a `WP_Error`.

- Use this flow to inspect `${wp_rest_result}` and continue the conversation.

#### On Failure (`on_failure`)

Child components executed when `wp_remote_request()` returns a **`WP_Error`**.

- The error is passed through so you can log or surface it.

### Runtime behavior

At runtime the element:

1. Evaluates `url`, `headers`, `content_type`, `timeout`, and the `query_params` / `body_params`.
2. Builds an `$args` array for `wp_remote_request()`:
   - Sets `method`, `headers`, `timeout`.
   - Encodes the body according to **Content Type** if needed.
3. Appends `query_params` to the URL query string.
4. Calls `wp_remote_request($url, $args)`.
5. If the result is a `WP_Error`, it is returned as‑is to be handled in **On Failure**.
6. Otherwise:
   - Retrieves body, status, and headers.
   - Wraps them into a `WP_REST_Response` instance and stores it under `${result_name}`.
   - Runs the **On Success** flow.

### Example

Fetch a list of products from an external API:

- **HTTP Method**: `GET`
- **Full URL**: `https://api.example.com/v1/products`
- **Query Parameters**:
  - `search` → `${request.query}`
  - `limit` → `10`
- **Result variable name**: `api_result`

In **On Success**:

- Use a `Loop` over `${api_result.data}` to read products:
  - `Product ${item.value.name} costs ${item.value.price}.`

In **On Failure**:

- Log the error and inform the user that the external service is currently unavailable.

### Tips

- For JSON APIs, keep **Content Type** as `application/json` and send structured data via `body_params`.
- Always handle **On Failure** to avoid silent errors and to provide better user feedback.
- Consider logging the request and response status codes for troubleshooting external integrations.


