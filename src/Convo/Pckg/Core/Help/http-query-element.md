### Http Client

Perform an HTTP request to a specified endpoint and store the result in service parameters.

### When to use

Use **Http Client** when you need to:

- Fetch data from an external API.
- Send data to a remote endpoint (POST/PUT).
- Enrich your conversation with remote content.

### Properties

#### Scope type

Controls how long the stored response lives:

- **installation** – for the whole installation lifetime on a device.
- **session** – for the duration of the current session.
- **request** – for a single request only.

#### Parameters

Where to store the response parameters:

- **Service** – available anywhere in the service.
- **Block** – available only within the current block.

#### Result name

Name under which the result will be stored.

Example: `response` → `${response.status}`, `${response.body}`, `${response.error}`.

#### Endpoint URL

The URL to send the request to.

- Supports expressions, e.g.  
  `http://ohmanda.com/api/horoscope/${sign}/`

#### Content type

Expected response content type.

- Common: `JSON` or `Auto` (auto‑detect).

#### HTTP method

HTTP method to use:

- `GET`, `POST`, or `PUT`.

For `GET`:

- Optional **Cache timeout** (seconds) to cache responses.

For `POST` / `PUT`:

- Configure **Body** as JSON or expression.

#### Timeout

Maximum time (in seconds) to wait before aborting the request.

#### Headers

Additional HTTP headers to send.

#### Parameters (query)

URL query parameters (e.g. `?parameter=value`).

### Flows

#### OK flow

Executed when the request succeeds.

#### NOK flow

Executed when the request fails.

### Result status variables

For a result stored as `response`:

- `${response.status}` – HTTP status code.
- `${response.body}` – response body (JSON‑decoded when content type is JSON).
- `${response.error}` – error message when status is 400+ (and `body` is not set).

### Example

Fetch and read a horoscope for `${sign}`:

- **Scope type**: `installation`
- **Parameters**: `Block Params`
- **Result name**: `response`
- **Endpoint URL**: `http://ohmanda.com/api/horoscope/${sign}/`
- **Content type**: `JSON` or `Auto`
- **HTTP method**: `GET`
- **Timeout**: `10`
- In **OK flow**, add a Text Response:  
  > `The current horoscope for ${sign} is: ${response.body.horoscope}`

### Tips

- Validate and sanitize any user‑supplied parts of the URL or body.
- Use **Cache timeout** for frequently requested read‑only data.


