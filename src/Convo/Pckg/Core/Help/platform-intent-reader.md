### Platform Intent

Match incoming requests against **platform‑specific intents** that are not defined as Convo intents.

### When to use

Use **Platform Intent** when:

- You need to handle vendor‑specific built‑in intents (e.g. certain Amazon intents).
- The intent exists only on one or a few vendors and is not modeled as a Convo intent.

### Properties

#### Intent

Name of the platform intent to match.

- **Case‑sensitive**.
- Should match the platform’s intent name exactly.

#### Predefined values

Static name–value pairs added to the `result` object.

#### Rename values

Rename incoming slot values.

- Allows mapping vendor slot names to your own internal names.

### Result variables

Once matched, slot values are available on `result`:

- `${result.city}` – value of the `city` slot.
- `${result._city}` – full platform slot object.

### Tips

- Use **Platform Intent** together with **Convo Intent** readers inside an **Intent Filter** for flexible matching.
- Double‑check intent names and slot key names, as they are case‑sensitive on many platforms.


