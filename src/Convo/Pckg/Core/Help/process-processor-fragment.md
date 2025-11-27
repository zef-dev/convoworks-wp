### Include process fragment

Include a predefined **process fragment** so you can reuse processor setups across the service.

### When to use

Use **Include process fragment** when:

- You find yourself repeating the same processor configuration in multiple places.
- You want to centralize processor logic for easier maintenance.

### Properties

#### Fragment ID

ID of the process fragment to include.

- Selected from a drop‑down automatically populated with available process fragments.

### How it works

1. You define a **processor fragment** elsewhere in the service.
2. Wherever you place **Include process fragment**, you select that fragment via **Fragment ID**.
3. At runtime, the included fragment’s processors are executed as if they were defined in place.

### Tips

- Use descriptive fragment IDs (e.g. `global_help_processors`, `order_fallback_processors`).
- When you change the fragment, all **Include process fragment** usages pick up the new behavior automatically.


