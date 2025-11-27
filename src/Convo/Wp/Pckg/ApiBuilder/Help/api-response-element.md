### API Response

Build and send an HTTP response from an API Builder workflow by setting status, headers, and body, then immediately ending the session.

### When to use

Use **API Response** whenever your API Builder route should **return an HTTP response**:

- Normal success responses (`200`, `201`, etc.).
- Error responses (`400`, `404`, `500`, …).
- JSON or plain-text payloads generated from workflow data.

Place this element in the **read** workflow where you want execution to stop and the HTTP
response to be sent back to the client.

### Properties

#### Http status (`status`)

Numeric HTTP status code to return.

- Default: `200`.
- Examples:
  - `200` – OK.
  - `201` – Created.
  - `400` – Bad Request.
  - `404` – Not Found.
  - `500` – Internal Server Error.
- The value is evaluated as an expression, so you can also use:
  - `` `${someStatusCode}` ``
  - `` `${condition ? 201 : 400}` ``

#### Headers (`headers`)

Key–value pairs that define HTTP headers for the response.

- Default: `Content-Type: application/json`.
- The headers are evaluated via service argument evaluation, so values can contain expressions:
  - `Content-Type: application/json`
  - `X-Request-Id: ${request.id}`
  - `Cache-Control: no-store`

#### Body (`body`)

Raw response body.

- This is a string field; its value is evaluated as an expression-aware string, so you can mix
  literals and `${...}` expressions.
- Typical use is to output **JSON**:
  - `{"success": true}`
  - `{"id": ${entity.id}, "name": "${entity.name}"}`  
- You can also output the result of helper functions:
  - `` `${json_encode(myArrayValue)}` `` – serialize an array as JSON.
  - `` `{"field": ${intval(myNumericValue)}}` `` – cast a numeric value and embed it.

### Runtime behavior

During execution:

- The element only acts when the response object is an **API Builder response**
  (`ApiCommandResponse`).
- When executed, it:
  - Evaluates `status` and sets it on the response.
  - Evaluates `headers` via service argument evaluation and sets them on the response.
  - Evaluates `body` and sets it as the response body.
- After setting these values, it **throws a session-ended exception**, which stops further
  workflow processing and sends the HTTP response to the client.

If the current response is not an `ApiCommandResponse`, the element does nothing.

### Examples

#### Simple JSON success response

- **Http status**: `200`
- **Headers**:
  - `Content-Type: application/json`
- **Body**:

```text
{"success": true}
```

#### JSON response with dynamic values

Assume you have a variable `${user}` with fields `id` and `email`:

- **Http status**: `200`
- **Body**:

```text
{"id": ${user.id}, "email": "${user.email}"}
```

#### Using helper functions in body

- **Body**:

```text
{"total": ${intval(totalAmount)}, "items": ${json_encode(items)}}
```

Here:

- `totalAmount` is cast to an integer.
- `items` (an array) is serialized to JSON.

### Tips

- Always set a correct `Content-Type` header (for example, `application/json`) that matches the
  response body format.
- Use expressions in the body to avoid building JSON manually in PHP – keep logic in the workflow.
- Remember that after this element runs, the session ends; place it **last** in the branch that
  should return the response.
- For error handling, create separate branches with different status codes (e.g. `400`, `404`,
  `500`) and different bodies.


