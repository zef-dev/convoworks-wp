### Intent Filter

Check and catch incoming intent requests using **Convo intents** and/or **platform intents**.

### When to use

Use **Intent Filter** when you need to:

- React to specific intents coming from users.
- Combine multiple intent readers (Convo + platform) in one place.

### Properties

#### Request filters (flow)

Container for **Convo Intent** and **Platform Intent** reader elements.

- You can add multiple readers in the same **Intent Filter**.
- The filter matches when at least one of its child readers matches the incoming request.

### How it works

1. Incoming request arrives.
2. Each child reader (Convo / Platform Intent) checks if it matches.
3. If a reader matches and its internal conditions are satisfied (intent name, required slots, etc.), the **Intent Filter** is considered matched.

Typically, an **Intent Filter** is placed inside a **Simple processor**’s **Request filters** container; when it matches, the processor’s OK flow is executed.

### Tips

- Use a **Convo Intent** reader when you want to rely on intents defined in the Convoworks editor.
- Use a **Platform Intent** reader for vendor‑specific built‑in intents not modeled as Convo intents.


