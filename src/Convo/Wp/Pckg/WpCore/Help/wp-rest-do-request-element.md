### WP REST Do Request

Perform an internal WordPress REST API request via `rest_do_request()` and store the result in a variable.

### When to use

Use **WP REST Do Request** when:

- You want to call **existing WordPress REST routes** from within Convoworks (e.g. `/wp/v2/posts`).
- You prefer to stay inside WordPress (no external HTTP request) and reuse server-side REST handlers.
- You need access to the structured `WP_REST_Response` object to drive your flows.

For external APIs, use **WP Remote Request**.

### Properties

#### HTTP Method (`method`)

HTTP method for the internal REST request.

Examples:

- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`

The value is evaluated as a string expression.

#### REST Route (`route`)

REST API route to call.

- Can be a bare route (e.g. `/wp/v2/posts`) or a full URL; any query string is parsed and merged with **Query Parameters**.
- The path is normalized to start with a `/`.

Examples:

- `/wp/v2/posts`
- `/wp/v2/users/1`
- `https://example.com/wp-json/wp/v2/posts?per_page=5`

#### Query Parameters (`query_params`)

Key–value pairs passed as query parameters to the request.

- Merged with any query parameters already present in the `route`.

Example:

- `per_page` → `5`
- `status` → `publish`

#### Body Parameters (`body_params`)

Key–value pairs passed as **body parameters** to the REST request.

- Used mostly for `POST`, `PUT`, and `PATCH` requests.
- Passed via `$request->set_body_params()` to the REST route.

Example:

- `title` → `${request.title}`
- `content` → `${request.body}`

#### Result variable name (`result_name`)

Name of the **request-scope** variable where the `WP_REST_Response` will be stored.

- Default: `wp_rest_result`.
- This is the raw result of `rest_do_request()`, which you can inspect with:

```text
${wp_rest_result.data}          // response data
${wp_rest_result.status}        // status code
${wp_rest_result.headers}       // headers (if exposed)
```

#### On Success (`on_success`)

Child components executed when the REST request is considered successful for your scenario.

Typically you first inspect `${result_name}` to decide what “success” means in context.

#### On Failure (`on_failure`)

Child components executed when the request should be treated as a failure (e.g. non‑2xx status, specific errors).

You decide how to interpret the status and data.

### Runtime behavior

At runtime the element:

1. Evaluates `method`, `route`, `query_params`, and `body_params`.
2. Parses the `route`:
   - Extracts the path and strips out any query part.
   - Ensures the path starts with `/`.
   - Merges route query string parameters into `query_params`.
3. Constructs a `WP_REST_Request`:
   - Sets method, route, query params, and body params.
4. Calls `rest_do_request($wp_request)`.
5. Stores the `WP_REST_Response` returned by `rest_do_request()` under `${result_name}` in **request** scope.
6. You can then use **On Success** and **On Failure** flows to inspect `data` and `status` and respond accordingly.

### Example

Get the latest published posts via REST:

- **HTTP Method**: `GET`
- **REST Route**: `/wp/v2/posts`
- **Query Parameters**:
  - `per_page` → `3`
  - `status` → `publish`
- **Result variable name**: `wp_rest_result`

In **On Success**:

- Assume the REST route returns a list of posts in `${wp_rest_result.data}`.  
  Use a `Loop`:
  - **Items**: `${wp_rest_result.data}`
  - **Data collection item name**: `post`
  - Inside the loop:  
    `Post ${post.index + 1}: ${post.value.title.rendered}`

### Tips

- Use the same routes you would normally use from JavaScript; the only difference is that you call them server-side.
- Check response codes (`${wp_rest_result.status}`) to distinguish success and error conditions.
- For complex REST structures, log or dump `${wp_rest_result.data}` once to understand its shape, then structure your loops and expressions accordingly.


