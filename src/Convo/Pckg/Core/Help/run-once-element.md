### Run once

Run its child elements **only once** per installation or per session, with an optional **else** flow for subsequent runs.

### When to use

Use **Run once** when you want to:

- Show a welcome or help message only the first time the user runs the service.
- Execute initialization logic a single time per installation or session.
- Provide alternate behavior on subsequent invocations.

### Properties

#### Run once per

Controls how often the “once” part runs:

- **Installation** – run once per skill installation (never again on that device).
- **Session** – run once per session (once each time the user starts a new session).

#### Then (flow)

Child elements that run the **first time** (for the configured scope).

#### Else (flow)

Child elements that run on **subsequent executions**, after the “once” part has already run for the current scope.

### Example

Show help only the first time in a session:

- **Run once per**: `Session`
- In **Then**, place a Text Response:  
  > “Here’s how to use this skill…”
- In **Else**, place a Text Response:  
  > “Welcome back! What would you like to do?”

### Tips

- Use **Installation** scope for truly one‑time actions (e.g. EULA, long intro).
- Use **Session** scope for onboarding or context that should repeat each session but not on every turn.


