### Element randomizer

Picks one child element at a time and executes it. You can run it in **wild** mode for purely random output or in **smart** mode to avoid repeating elements too often.

### When to use

Use **Element randomizer** whenever you need randomized behavior:

- Randomized greetings or farewells.
- Rotating between alternative responses.
- Simple games that pick a random item from a set.

### Properties

#### Elements (flow)

Child elements from which one will be randomly selected and executed.

#### Element storage mode

Controls how randomness is handled:

- **wild** – every call picks a random element; repeats are allowed.
- **smart** – remembers which elements have already been used and avoids repeating them until necessary.

#### Namespace

Key under which previously used elements are stored when using **smart** mode.

- Any non‑empty string.
- You can share the same namespace between multiple randomizers to maintain a common history.

#### Scope type

How long smart‑mode memory is kept:

- **installation** – memory lasts for the entire lifetime of the skill on a device.
- **session** – memory is kept only for the current session.

Used only when **Element storage mode** is `smart`.

### Example

Randomized greetings:

1. Define several **Text response** elements as children.
2. Set **Element storage mode** to `smart`.
3. Set **Namespace** to `greetings_pool`.
4. Set **Scope type** to `session`.

During a session, each greeting will be used once before repeating.

### Tips

- Use different namespaces for different logical groups of random messages.
- Prefer `session` scope when you want variety per session but don’t need long‑term memory across installations.


