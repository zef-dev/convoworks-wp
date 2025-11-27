### Set Parameter

Define and set variables (key–value pairs) that you can reuse throughout your workflow using the Expression Language.

### When to use

Use **Set Parameter** when you want to:

- Store intermediate results (trimmed text, parsed values, counters).
- Build objects or arrays for later use.
- Control where and how long parameters are available.

### Scopes

#### Visibility scope

Controls **where** parameters are accessible:

- **Service** – available across the entire service.
- **Block** – limited to the current block.
- **Parent** – limited to the parent component.
- **Function** – limited to a specific function (works only with request scope).

#### Persistence scope

Controls **how long** parameters persist:

- **Request** – for the duration of a single request.
- **Session** – for the duration of the user’s session.
- **Installation** – across the installation’s lifecycle.
- **User** – linked to the logged‑in user.

### Properties

#### Properties (key–value pairs)

Define one or more parameters as key–value pairs:

Examples:

- `trimmed : ${trim(text)}`
- `title : "My Title"`
- `myObject : ${{"key": "value", "other": []}}`

You can also create or grow arrays and nested structures:

- `players[0]["name"] : ${"John"}`
- `players[1]["name"] : ${"Jane"}`

Later access:

- `${players[0]["name"]}` → `John`
- `${players[1]["name"]}` → `Jane`

For dynamic arrays (unknown size), use a counter:

- `players[${counter}]["name"] : ${user.input}`

### Usage

1. Choose **Visibility scope** and **Persistence scope**.
2. Add parameter definitions in **Properties**.
3. Use them anywhere in your workflow: `${trimmed}`, `${players[0]["name"]}`, etc.

### Tips

- Keep parameter names descriptive and consistent across the service.
- Use request scope for temporary values; session/installation/user scopes for longer‑lived state.


