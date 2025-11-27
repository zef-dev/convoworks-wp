### API Route Filter

Match incoming HTTP requests to a specific API Builder route based on HTTP method and URI path, and expose parsed route data to the workflow.

### When to use

Use **API Route Filter** at the beginning of an API Builder workflow when you need to:

- Match only certain HTTP methods (e.g. `GET`, `POST`) for a route.
- Match a specific URI path or a group of paths.
- Extract **path variables** from the URL (like `userId` in `/users/{userId}`) and use them later in the workflow.

Typically this component is used as a **filter block** for an entry point in an API Builder–enabled service.

### Properties

#### Http method (`method`)

HTTP method to match for this route.

- Examples: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`.
- Special value: `*` – matches **any** HTTP method.
- The value is evaluated as an expression, so you can also use something like:
  - `` `${request.method}` ``

#### Uri path (`path`)

URI path pattern for the route. This is compared against the request path handled by the API Builder endpoint.

- If left **empty**, the filter matches the **default route** (base API Builder URL).
- If set to `*`, it matches **all routes** for the selected method.
- You can use **path variables** in curly braces:
  - Example: `/my/{userId}`
  - When this route matches, a slot with the same name is available in the result
    (e.g. `${result.userId}`).
- If the value does **not** start with `/`, it is automatically prefixed with `/`.
- If the value does **not** contain the API Builder base path (`service-run/convo-api-builder`),
  it is automatically expanded to:

```text
service-run/convo-api-builder/{variant}/{serviceId}<your-path>
```

So a path defined as `/my/{userId}` is internally matched against:

```text
service-run/convo-api-builder/{variant}/{serviceId}/my/{userId}
```

### Runtime behavior

When an incoming request arrives at the API Builder endpoint:

- The filter first checks that the request is an **API Builder command request**.
- It lowercases the configured `method` and evaluates the `path`.
- If the method matches and `path` is `*`:
  - The filter **always matches** and:
    - Sets `${result._uri}` to the full request URI.
    - Sets `${result._parsedBody}` to the parsed request body.
- Otherwise it normalizes and expands the path as described above and tries to route it.
  - If the route matches:
    - `${result._uri}` – full request URI.
    - `${result._parsedBody}` – parsed body.
    - For every path variable (e.g. `{userId}`), a slot with the same name is set:
      - `${result.userId}`, `${result.orderId}`, etc.
  - If nothing matches, the filter result is empty and the route is not selected.

This component works as a **filter** in the workflow (`_workflow = "filter"`).

### Examples

#### Match a specific GET route with a path variable

- **Http method**: `GET`
- **Uri path**: `/users/{userId}`

When a request hits:

```text
GET /service-run/convo-api-builder/live/123/users/42
```

and the service/variant match, the filter:

- Matches the route.
- Exposes:
  - `${result.userId} = "42"`
  - `${result._uri}` – full request URI.
  - `${result._parsedBody}` – parsed body (if any).

You can then use `${result.userId}` in subsequent elements (e.g. to load a user from a database).

#### Match any method and any path

- **Http method**: `*`
- **Uri path**: `*`

This will match **all** requests for the API Builder service and provide `_uri` and `_parsedBody`
for every call. Path variables are not used in this case.

### Tips

- Use `*` for **method** when you want a single workflow to handle multiple HTTP methods.
- Use `*` for **path** when you want a single filter to handle all paths for a given method.
- Prefer descriptive path variable names (`{userId}`, `{orderId}`) so slots like
  `${result.userId}` are self-explanatory.
- Remember that the base path (`service-run/convo-api-builder/{variant}/{serviceId}`) is
  automatically handled; you usually only define the **service-specific** part (like `/users/{userId}`).


